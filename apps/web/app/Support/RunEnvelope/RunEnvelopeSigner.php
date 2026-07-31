<?php

namespace App\Support\RunEnvelope;

use DateTimeImmutable;
use DateTimeZone;
use InvalidArgumentException;

final class RunEnvelopeSigner
{
    public function __construct(
        private readonly string $privateKey,
        private readonly int $lifetimeSeconds = 300,
    ) {}

    /**
     * @param  array<string, mixed>  $claims
     * @return array<string, mixed>
     */
    public function mint(array $claims, ?DateTimeImmutable $now = null): array
    {
        if (array_key_exists('signature', $claims) || array_key_exists('expiresAt', $claims)) {
            throw new InvalidArgumentException('Claims must not include signature or expiresAt.');
        }

        $now ??= new DateTimeImmutable('now', new DateTimeZone('UTC'));
        $claims['expiresAt'] = $now->modify("+{$this->lifetimeSeconds} seconds")->format('Y-m-d\TH:i:s.v\Z');

        return $this->sign($claims);
    }

    /**
     * @param  array<string, mixed>  $envelope
     * @return array<string, mixed>
     */
    public function sign(array $envelope): array
    {
        if (array_key_exists('signature', $envelope)) {
            throw new InvalidArgumentException('Envelope must not include signature.');
        }

        $signature = sodium_crypto_sign_detached(
            CanonicalJson::encode($envelope),
            $this->secretKey(),
        );

        return [...$envelope, 'signature' => rtrim(strtr(base64_encode($signature), '+/', '-_'), '=')];
    }

    private function secretKey(): string
    {
        $key = base64_decode($this->privateKey, true);
        if ($key === false || strlen($key) !== SODIUM_CRYPTO_SIGN_SECRETKEYBYTES) {
            throw new InvalidArgumentException('RUN_ENVELOPE_PRIVATE_KEY must be a base64 Ed25519 private key.');
        }

        return $key;
    }
}
