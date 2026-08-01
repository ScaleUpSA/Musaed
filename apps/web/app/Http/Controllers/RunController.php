<?php

namespace App\Http\Controllers;

use App\Actions\MintLiteLlmVirtualKey;
use App\Actions\ResolveRunPolicy;
use App\Enums\RunStatus;
use App\Http\Requests\StoreRunRequest;
use App\Models\Run;
use App\Models\RunEvent;
use App\Support\AgentEvent\AgentEventValidator;
use App\Support\RunEnvelope\RunEnvelopeSigner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class RunController extends Controller
{
    public function store(StoreRunRequest $request, ResolveRunPolicy $policy, RunEnvelopeSigner $signer, MintLiteLlmVirtualKey $mintKey): JsonResponse
    {
        $user = $request->user();
        $callbackToken = bin2hex(random_bytes(32));
        $resolved = $policy->resolve($user, $request->string('model')->toString() ?: null);
        $conversation = $request->filled('conversation_id')
            ? $user->conversations()->findOrFail($request->string('conversation_id')->toString())
            : $user->conversations()->create([
                'id' => (string) Str::uuid(),
                'title' => Str::limit($request->string('message')->toString(), 80, ''),
            ]);

        $run = DB::transaction(function () use ($conversation, $user, $request, $resolved, $callbackToken): Run {
            $conversation->messages()->create([
                'role' => 'user',
                'content' => $request->string('message')->toString(),
            ]);

            $run = $conversation->runs()->create([
                'id' => (string) Str::uuid(),
                'user_id' => $user->id,
                'status' => RunStatus::Queued,
                'policy_version' => $resolved['policyVersion'],
                'model_alias' => $resolved['modelAlias'],
                'callback_token_hash' => hash('sha256', $callbackToken),
            ]);

            return $run;
        });

        try {
            $litellmVirtualKey = $resolved['modelImplementation'] === 'litellm'
                ? $mintKey->mint($resolved['modelName'], (int) config('services.agent.envelope_lifetime_seconds'))
                : 'fake-litellm-key-'.bin2hex(random_bytes(24));
        } catch (\RuntimeException $exception) {
            $run->update(['status' => RunStatus::Failed]);

            return response()->json(['message' => $exception->getMessage()], 502);
        }

        $envelope = $signer->mint([
            'runId' => $run->id,
            'userId' => (string) $user->id,
            'groupId' => $resolved['groupId'],
            'workspaceId' => $resolved['workspaceId'],
            'conversationId' => $conversation->id,
            'prompt' => $request->string('message')->toString(),
            'allowedModels' => $resolved['allowedModels'],
            'modelAlias' => $resolved['modelAlias'],
            'modelName' => $resolved['modelName'],
            'modelImplementation' => $resolved['modelImplementation'],
            'workingDirectory' => config('services.agent.run_root')."/{$run->id}/workspace",
            'agentDirectory' => config('services.agent.run_root')."/{$run->id}/agent",
            'allowedTools' => $resolved['allowedTools'],
            'approvalRequiredTools' => $resolved['approvalRequiredTools'],
            'litellmVirtualKey' => $litellmVirtualKey,
            'sandbox' => $resolved['sandbox'],
            'callbacks' => [
                'eventsUrl' => config('services.agent.events_url'),
                'auditUrl' => config('services.agent.audit_url'),
                'approvalsUrl' => config('services.agent.approvals_url'),
                'callbackToken' => $callbackToken,
            ],
            'policyVersion' => $resolved['policyVersion'],
        ]);

        $response = Http::timeout(10)->post(config('services.agent.url').'/runs/execute', $envelope);
        if ($response->failed()) {
            $run->update(['status' => RunStatus::Failed]);

            return response()->json(['message' => 'Run dispatch failed.'], 502);
        }

        if ($run->fresh()->status === RunStatus::Queued) {
            $run->update(['status' => RunStatus::Running]);
        }

        return response()->json([
            'conversation_id' => $conversation->id,
            'run_id' => $run->id,
        ], 202);
    }

    public function events(Request $request, Run $run): JsonResponse
    {
        abort_unless($run->user_id === $request->user()->id, 404);

        $after = max(0, $request->integer('after', 0));

        return response()->json([
            'events' => $run->events()->where('sequence', '>', $after)->orderBy('sequence')->get()->map(
                static fn (RunEvent $event): array => $event->payload,
            )->values(),
            'last_event_id' => $run->events()->max('sequence') ?? $after,
        ]);
    }

    public function callback(Request $request, AgentEventValidator $validator): JsonResponse
    {
        $payload = $request->json()->all();
        if (! is_array($payload) || ! $validator->accepts($payload)) {
            return $this->callbackRejected();
        }

        $run = Run::find($payload['runId']);
        $callbackToken = $request->header('X-Run-Callback-Token');
        if (
            $run === null
            || ! is_string($callbackToken)
            || $run->callback_token_hash === null
            || ! hash_equals($run->callback_token_hash, hash('sha256', $callbackToken))
            || ! $run->status->isActive()
        ) {
            return $this->callbackRejected();
        }

        $event = $run->events()->create([
            'sequence' => ((int) ($run->events()->max('sequence') ?? 0)) + 1,
            'type' => $payload['type'],
            'payload' => $payload,
            'occurred_at' => $payload['at'],
        ]);

        if ($payload['type'] === 'run.started') {
            $run->update(['status' => RunStatus::Running]);
        } elseif ($payload['type'] === 'run.completed') {
            $run->update(['status' => RunStatus::Completed]);
            $this->persistAssistantMessage($run);
        } elseif ($payload['type'] === 'run.failed') {
            $run->update(['status' => RunStatus::Failed]);
        }

        return response()->json(['accepted' => true, 'event_id' => $event->id], 202);
    }

    private function callbackRejected(): JsonResponse
    {
        return response()->json(['code' => 'RUN_CALLBACK_REJECTED', 'message' => 'Run callback rejected.'], 401);
    }

    private function persistAssistantMessage(Run $run): void
    {
        $text = $run->events()
            ->where('type', 'assistant.delta')
            ->orderBy('sequence')
            ->get()
            ->map(static fn (RunEvent $event): string => (string) ($event->payload['text'] ?? ''))
            ->implode('');

        if ($text !== '') {
            $run->conversation->messages()->create(['role' => 'assistant', 'content' => $text]);
        }
    }
}
