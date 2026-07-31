<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\Run;
use App\Models\User;
use App\Support\RunEnvelope\CanonicalJson;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class RunLifecycleTest extends TestCase
{
    use RefreshDatabase;

    private string $privateKey;

    private string $publicKey;

    protected function setUp(): void
    {
        parent::setUp();

        $keyPair = sodium_crypto_sign_keypair();
        $this->privateKey = base64_encode(sodium_crypto_sign_secretkey($keyPair));
        $this->publicKey = sodium_crypto_sign_publickey($keyPair);
        config([
            'services.agent.url' => 'http://agent.test',
            'services.agent.events_url' => 'http://web.test/internal/runs/events',
            'services.agent.envelope_private_key' => $this->privateKey,
        ]);
    }

    public function test_posted_message_is_dispatched_and_assistant_output_is_persisted(): void
    {
        $user = User::factory()->create();
        $envelope = null;
        Http::fake(function ($request) use (&$envelope) {
            $envelope = $request->data();

            return Http::response(['status' => 'accepted'], 202);
        });

        $response = $this->actingAs($user)->postJson('/runs', [
            'message' => 'Summarize the rollout plan.',
        ]);

        $response->assertAccepted();
        $run = Run::firstOrFail();
        $conversation = Conversation::firstOrFail();
        $this->assertSame($conversation->id, $run->conversation_id);
        $this->assertNotNull($envelope);
        $padding = str_repeat('=', (4 - strlen($envelope['signature']) % 4) % 4);
        $signature = base64_decode(strtr($envelope['signature'].$padding, '-_', '+/'), true);
        $claims = $envelope;
        unset($claims['signature']);
        $this->assertTrue(sodium_crypto_sign_verify_detached(
            $signature,
            CanonicalJson::encode($claims),
            $this->publicKey,
        ));
        $this->assertArrayNotHasKey('providerKey', $envelope);
        $this->assertArrayNotHasKey('apiKey', $envelope);

        foreach ([
            ['type' => 'run.started', 'runId' => $run->id, 'at' => now()->toISOString()],
            ['type' => 'assistant.delta', 'runId' => $run->id, 'text' => 'A persisted answer.', 'at' => now()->toISOString()],
            ['type' => 'run.completed', 'runId' => $run->id, 'at' => now()->toISOString()],
        ] as $event) {
            $this->postJson('/internal/runs/events', $event)->assertAccepted();
        }

        $this->assertDatabaseHas('messages', [
            'conversation_id' => $conversation->id,
            'role' => 'assistant',
            'content' => 'A persisted answer.',
        ]);
        $this->assertSame('completed', $run->fresh()->status);
    }

    public function test_user_cannot_read_another_users_conversation_events(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $conversation = $owner->conversations()->create([
            'id' => (string) Str::uuid(),
            'title' => 'Private',
        ]);
        $run = $conversation->runs()->create([
            'id' => (string) Str::uuid(),
            'user_id' => $owner->id,
            'policy_version' => 'default-v1',
        ]);

        $this->actingAs($other)->getJson("/runs/{$run->id}/events")->assertNotFound();
    }
}
