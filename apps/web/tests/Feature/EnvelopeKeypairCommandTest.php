<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

class EnvelopeKeypairCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_generate_envelope_keypair_command_writes_a_valid_keypair_to_env(): void
    {
        $envPath = getcwd().DIRECTORY_SEPARATOR.'.env';
        $backupPath = getcwd().DIRECTORY_SEPARATOR.'.env.test-backup';

        if (File::exists($envPath)) {
            File::copy($envPath, $backupPath);
        }

        try {
            File::put($envPath, "APP_NAME=Musaed\n");

            $this->artisan('musaed:generate-envelope-keypair --write')
                ->expectsOutputToContain('Wrote AGENT_ENVELOPE_PRIVATE_KEY and AGENT_ENVELOPE_PUBLIC_KEY to .env.')
                ->assertExitCode(0);

            $env = File::get($envPath);
            $this->assertMatchesRegularExpression('/^AGENT_ENVELOPE_PRIVATE_KEY=[A-Za-z0-9\-_]+$/m', $env);
            $this->assertMatchesRegularExpression('/^AGENT_ENVELOPE_PUBLIC_KEY=[A-Za-z0-9\-_]+$/m', $env);
        } finally {
            if (File::exists($backupPath)) {
                File::move($backupPath, $envPath);
            } else {
                File::delete($envPath);
            }
        }
    }
}
