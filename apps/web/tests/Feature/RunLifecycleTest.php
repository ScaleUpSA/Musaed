<?php

namespace Tests\Feature;

use App\Models\Conversation;
use App\Models\Run;
use App\Models\User;
use App\Support\RunEnvelope\CanonicalJson;
use Database\Seeders\ModelCatalogueSeeder;
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
        (new ModelCatalogueSeeder)->run();

        $keyPair = sodium_crypto_sign_keypair();
        $this->privateKey = base64_encode(sodium_crypto_sign_secretkey($keyPair));
        $this->publicKey = sodium_crypto_sign_publickey($keyPair);
        config([
            'services.agent.url' => 'http://agent.test',
            'services.agent.events_url' => 'http://web.test/internal/runs/events',
            'services.agent.envelope_private_key' => $this->privateKey,
            'services.litellm.url' => 'http://litellm.test',
            'services.litellm.master_key' => 'sk-master-test',
        ]);
    }

    public function test_posted_message_is_dispatched_and_assistant_output_is_persisted(): void
    {
        $user = User::factory()->create();
        Http::fake(['http://agent.test/*' => Http::response(['status' => 'accepted'], 202)]);

        $response = $this->actingAs($user)->postJson('/runs', [
            'message' => 'Summarize the rollout plan.',
        ]);

        $response->assertAccepted();
        $run = Run::firstOrFail();
        $conversation = Conversation::firstOrFail();
        $this->assertSame($conversation->id, $run->conversation_id);
        $envelope = collect(Http::recorded())
            ->first(fn (array $recording): bool => str_contains($recording[0]->url(), 'agent.test'))[0]->data();
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
        $this->assertSame('assistant', $envelope['modelAlias']);
        $this->assertSame('fake-model', $envelope['modelName']);
        $this->assertSame('fake', $envelope['modelImplementation']);
        $this->assertDatabaseHas('runs', ['id' => $run->id, 'model_alias' => 'assistant']);
        $callbackHeaders = ['X-Run-Callback-Token' => $envelope['callbacks']['callbackToken']];

        foreach ([
            ['type' => 'run.started', 'runId' => $run->id, 'at' => now()->toISOString()],
            ['type' => 'assistant.delta', 'runId' => $run->id, 'text' => 'A persisted answer.', 'at' => now()->toISOString()],
            ['type' => 'run.completed', 'runId' => $run->id, 'at' => now()->toISOString()],
        ] as $event) {
            $this->withHeaders($callbackHeaders)->postJson('/internal/runs/events', $event)->assertAccepted();
        }

        $this->assertDatabaseHas('messages', [
            'conversation_id' => $conversation->id,
            'role' => 'assistant',
            'content' => 'A persisted answer.',
        ]);
        $this->assertSame('completed', $run->fresh()->status->value);
    }

    public function test_model_outside_the_resolved_catalogue_is_refused(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/runs', [
            'model' => 'not-configured',
            'message' => 'This should not run.',
        ])->assertUnprocessable()->assertJsonValidationErrors('model');

        $this->assertDatabaseCount('runs', 0);
    }

    public function test_configured_real_model_is_preferred_over_the_placeholder(): void
    {
        config([
            'services.models.catalogue' => [
                [
                    'alias' => 'assistant',
                    'litellm_model' => 'fake-model',
                    'implementation' => 'fake',
                    'enabled' => true,
                    'label_en' => 'Musaed Placeholder',
                    'label_ar' => 'مساعد تجريبي مؤقت',
                ],
                [
                    'alias' => 'deepseek',
                    'litellm_model' => 'deepseek',
                    'implementation' => 'litellm',
                    'enabled' => true,
                    'label_en' => 'DeepSeek Chat',
                    'label_ar' => 'ديب سيك للمحادثة',
                ],
            ],
        ]);
        (new ModelCatalogueSeeder)->run();

        $user = User::factory()->create();
        Http::fake([
            'http://litellm.test/*' => Http::response([
                'key' => 'sk-virtual-deepseek-test',
            ], 200),
            'http://agent.test/*' => Http::response(['status' => 'accepted'], 202),
        ]);

        $this->actingAs($user)->postJson('/runs', [
            'message' => 'Use the configured model.',
        ])->assertAccepted();

        $envelope = collect(Http::recorded())
            ->first(fn (array $recording): bool => str_contains($recording[0]->url(), 'agent.test'))[0]->data();
        $this->assertSame('deepseek', $envelope['modelAlias']);
        $this->assertSame('deepseek', $envelope['modelName']);
        $this->assertSame('litellm', $envelope['modelImplementation']);
        $this->assertSame('sk-virtual-deepseek-test', $envelope['litellmVirtualKey']);
        Http::assertSent(fn ($request): bool => str_contains($request->url(), '/key/generate')
            && $request['models'] === ['deepseek']
            && $request['duration'] === '300s');
    }

    public function test_virtual_key_minting_failure_marks_run_failed_and_returns_a_readable_reason(): void
    {
        config([
            'services.models.catalogue' => [
                [
                    'alias' => 'assistant',
                    'litellm_model' => 'fake-model',
                    'implementation' => 'fake',
                    'enabled' => true,
                    'label_en' => 'Musaed Placeholder',
                    'label_ar' => 'مساعد تجريبي مؤقت',
                ],
                [
                    'alias' => 'deepseek',
                    'litellm_model' => 'deepseek',
                    'implementation' => 'litellm',
                    'enabled' => true,
                    'label_en' => 'DeepSeek Chat',
                    'label_ar' => 'ديب سيك للمحادثة',
                ],
            ],
        ]);
        (new ModelCatalogueSeeder)->run();

        $user = User::factory()->create();
        Http::fake([
            'http://litellm.test/key/generate' => Http::response(['message' => 'unauthorized'], 401),
        ]);

        $response = $this->actingAs($user)->postJson('/runs', [
            'message' => 'Minting failure',
        ]);

        $response->assertStatus(502)->assertJson(['message' => 'Model provider request failed (401).']);

        $run = Run::firstOrFail();
        $this->assertSame('failed', $run->fresh()->status->value);
        $this->assertDatabaseMissing('run_events', ['run_id' => $run->id]);
    }

    public function test_provider_failure_marks_run_failed_and_persists_the_readable_error(): void
    {
        $user = User::factory()->create();
        Http::fake(['http://agent.test/*' => Http::response(['status' => 'accepted'], 202)]);

        $this->actingAs($user)->postJson('/runs', ['message' => 'Provider failure'])->assertAccepted();
        $run = Run::firstOrFail();
        $token = collect(Http::recorded())
            ->first(fn (array $recording): bool => str_contains($recording[0]->url(), 'agent.test'))[0]->data()['callbacks']['callbackToken'];

        $this->withHeader('X-Run-Callback-Token', $token)
            ->postJson('/internal/runs/events', [
                'type' => 'run.failed',
                'runId' => $run->id,
                'error' => 'Model provider rate limit reached.',
                'at' => now()->toISOString(),
            ])->assertAccepted();

        $this->assertSame('failed', $run->fresh()->status->value);
        $this->assertDatabaseHas('run_events', [
            'run_id' => $run->id,
            'type' => 'run.failed',
        ]);
    }

    public function test_callback_endpoint_accepts_the_contract_event_shapes(): void
    {
        $user = User::factory()->create();
        $fixtures = json_decode(
            file_get_contents(base_path('tests/Fixtures/agent-events.json')),
            true,
            flags: JSON_THROW_ON_ERROR,
        );
        $this->assertIsArray($fixtures);

        foreach ($fixtures as $event) {
            Http::fake(['http://agent.test/*' => Http::response(['status' => 'accepted'], 202)]);

            $this->actingAs($user)->postJson('/runs', ['message' => 'Contract fixtures'])->assertAccepted();
            $envelope = collect(Http::recorded())
                ->last(fn (array $recording): bool => str_contains($recording[0]->url(), 'agent.test'))[0]->data();
            $run = Run::findOrFail($envelope['runId']);
            $token = $envelope['callbacks']['callbackToken'];

            $response = $this->withHeader('X-Run-Callback-Token', $token)
                ->postJson('/internal/runs/events', [
                    ...$event,
                    'runId' => $run->id,
                ]);

            $this->assertSame(202, $response->status(), json_encode($event, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        }

        $this->withHeader('X-Run-Callback-Token', $token)
            ->postJson('/internal/runs/events', [
                'type' => 'assistant.delta',
                'runId' => $run->id,
                'at' => now()->toISOString(),
            ])
            ->assertUnauthorized()
            ->assertJson(['code' => 'RUN_CALLBACK_REJECTED']);
    }

    public function test_callback_credentials_are_run_scoped_and_expire_on_completion(): void
    {
        $user = User::factory()->create();
        Http::fake(['http://agent.test/*' => Http::response(['status' => 'accepted'], 202)]);

        $this->actingAs($user)->postJson('/runs', ['message' => 'First run'])->assertAccepted();
        $firstRun = Run::firstOrFail();
        $firstToken = collect(Http::recorded())
            ->first(fn (array $recording): bool => str_contains($recording[0]->url(), 'agent.test'))[0]->data()['callbacks']['callbackToken'];

        $this->actingAs($user)->postJson('/runs', ['message' => 'Second run'])->assertAccepted();
        $secondRun = Run::latest('created_at')->firstOrFail();
        $secondToken = collect(Http::recorded())
            ->filter(fn (array $recording): bool => str_contains($recording[0]->url(), 'agent.test'))
            ->values()[1][0]->data()['callbacks']['callbackToken'];

        $event = ['type' => 'run.started', 'runId' => $firstRun->id, 'at' => now()->toISOString()];
        $this->withHeader('X-Run-Callback-Token', $secondToken)
            ->postJson('/internal/runs/events', $event)
            ->assertUnauthorized()
            ->assertJson(['code' => 'RUN_CALLBACK_REJECTED']);
        $this->withHeader('X-Run-Callback-Token', $firstToken)
            ->postJson('/internal/runs/events', $event)
            ->assertAccepted();

        $this->withHeader('X-Run-Callback-Token', $firstToken)
            ->postJson('/internal/runs/events', [
                'type' => 'assistant.delta',
                'runId' => $firstRun->id,
                'text' => null,
                'at' => now()->toISOString(),
            ])
            ->assertUnauthorized()
            ->assertJson(['code' => 'RUN_CALLBACK_REJECTED']);

        $this->withHeader('X-Run-Callback-Token', 'forged')
            ->postJson('/internal/runs/events', [
                ...$event,
                'runId' => $secondRun->id,
            ])
            ->assertUnauthorized()
            ->assertJson(['code' => 'RUN_CALLBACK_REJECTED']);

        $this->withHeader('X-Run-Callback-Token', $firstToken)
            ->postJson('/internal/runs/events', [
                'type' => 'run.completed',
                'runId' => $firstRun->id,
                'at' => now()->toISOString(),
            ])
            ->assertAccepted();
        $this->withHeader('X-Run-Callback-Token', $firstToken)
            ->postJson('/internal/runs/events', $event)
            ->assertUnauthorized()
            ->assertJson(['code' => 'RUN_CALLBACK_REJECTED']);
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
