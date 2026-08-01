<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;

Artisan::command('musaed:generate-envelope-keypair {--write}', function () {
    $keyPair = sodium_crypto_sign_keypair();
    $privateKey = rtrim(strtr(base64_encode(sodium_crypto_sign_secretkey($keyPair)), '+/', '-_'), '=');
    $publicKey = rtrim(strtr(base64_encode(sodium_crypto_sign_publickey($keyPair)), '+/', '-_'), '=');

    if ($this->option('write')) {
        $envPath = getcwd().DIRECTORY_SEPARATOR.'.env';
        $examplePath = getcwd().DIRECTORY_SEPARATOR.'.env.example';
        if (! File::exists($envPath)) {
            File::copy($examplePath, $envPath);
        }

        $env = File::get($envPath);
        foreach ([
            'AGENT_ENVELOPE_PRIVATE_KEY' => $privateKey,
            'AGENT_ENVELOPE_PUBLIC_KEY' => $publicKey,
        ] as $name => $value) {
            $pattern = "/^{$name}=.*$/m";
            $replacement = "{$name}={$value}";
            $env = preg_match($pattern, $env) === 1
                ? (string) preg_replace($pattern, $replacement, $env)
                : rtrim($env).PHP_EOL.$replacement.PHP_EOL;
        }

        File::put($envPath, rtrim($env).PHP_EOL);
        $this->components->info('Wrote AGENT_ENVELOPE_PRIVATE_KEY and AGENT_ENVELOPE_PUBLIC_KEY to .env.');

        return;
    }

    $this->line("AGENT_ENVELOPE_PRIVATE_KEY={$privateKey}");
    $this->line("AGENT_ENVELOPE_PUBLIC_KEY={$publicKey}");
})->purpose('Generate a signed run envelope keypair for Laravel');

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');
