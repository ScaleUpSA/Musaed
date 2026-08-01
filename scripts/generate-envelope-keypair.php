#!/usr/bin/env php
<?php

declare(strict_types=1);

$write = in_array('--write', $argv, true);
$keyPair = sodium_crypto_sign_keypair();
$privateKey = rtrim(strtr(base64_encode(sodium_crypto_sign_secretkey($keyPair)), '+/', '-_'), '=');
$publicKey = rtrim(strtr(base64_encode(sodium_crypto_sign_publickey($keyPair)), '+/', '-_'), '=');

if (! $write) {
    fwrite(STDOUT, "AGENT_ENVELOPE_PRIVATE_KEY={$privateKey}".PHP_EOL);
    fwrite(STDOUT, "AGENT_ENVELOPE_PUBLIC_KEY={$publicKey}".PHP_EOL);
    exit(0);
}

$root = getcwd();
$envPath = $root.DIRECTORY_SEPARATOR.'.env';
$examplePath = $root.DIRECTORY_SEPARATOR.'.env.example';

if (! is_file($envPath)) {
    if (! is_file($examplePath)) {
        fwrite(STDERR, "Run this command from the repository root containing .env.example.".PHP_EOL);
        exit(1);
    }

    if (! copy($examplePath, $envPath)) {
        fwrite(STDERR, "Unable to create .env from .env.example.".PHP_EOL);
        exit(1);
    }
}

$env = file_get_contents($envPath);
if ($env === false) {
    fwrite(STDERR, "Unable to read .env.".PHP_EOL);
    exit(1);
}

foreach ([
    'AGENT_ENVELOPE_PRIVATE_KEY' => $privateKey,
    'AGENT_ENVELOPE_PUBLIC_KEY' => $publicKey,
] as $name => $value) {
    $pattern = "/^{$name}=.*$/m";
    $replacement = "{$name}={$value}";
    $updated = preg_replace($pattern, $replacement, $env);

    if ($updated === null) {
        fwrite(STDERR, "Unable to update {$name}.".PHP_EOL);
        exit(1);
    }

    $env = $updated;
    if (! preg_match($pattern, $env)) {
        $env = rtrim($env).PHP_EOL.$replacement.PHP_EOL;
    }
}

if (file_put_contents($envPath, rtrim($env).PHP_EOL) === false) {
    fwrite(STDERR, "Unable to write .env.".PHP_EOL);
    exit(1);
}

fwrite(STDOUT, "Wrote AGENT_ENVELOPE_PRIVATE_KEY and AGENT_ENVELOPE_PUBLIC_KEY to .env.".PHP_EOL);
