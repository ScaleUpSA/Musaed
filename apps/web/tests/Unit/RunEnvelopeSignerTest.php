<?php

namespace Tests\Unit;

use App\Support\RunEnvelope\CanonicalJson;
use App\Support\RunEnvelope\RunEnvelopeSigner;
use DateTimeImmutable;
use DateTimeZone;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

class RunEnvelopeSignerTest extends TestCase
{
    public function test_it_mints_a_short_lived_signed_envelope(): void
    {
        $keyPair = sodium_crypto_sign_keypair();
        $privateKey = sodium_crypto_sign_secretkey($keyPair);
        $now = new DateTimeImmutable('2029-01-01T00:00:00.000Z', new DateTimeZone('UTC'));
        $signer = new RunEnvelopeSigner(base64_encode($privateKey), 300);

        $envelope = $signer->mint(['runId' => 'run-1'], $now);

        $this->assertSame('2029-01-01T00:05:00.000Z', $envelope['expiresAt']);
        $this->assertArrayHasKey('signature', $envelope);
        $signature = strtr($envelope['signature'], '-_', '+/');
        $signature .= str_repeat('=', (4 - strlen($signature) % 4) % 4);
        $this->assertTrue(sodium_crypto_sign_verify_detached(
            base64_decode($signature, true),
            CanonicalJson::encode(['runId' => 'run-1', 'expiresAt' => $envelope['expiresAt']]),
            sodium_crypto_sign_publickey($keyPair),
        ));
    }

    public function test_it_rejects_claims_with_runtime_fields(): void
    {
        $keyPair = sodium_crypto_sign_keypair();
        $signer = new RunEnvelopeSigner(base64_encode(sodium_crypto_sign_secretkey($keyPair)));

        $this->expectException(InvalidArgumentException::class);
        $signer->mint(['expiresAt' => '2030-01-01T00:00:00.000Z']);
    }

    public function test_canonical_json_sorts_nested_object_keys_without_escaping_unicode(): void
    {
        $this->assertSame(
            '{"a":{"a":"مساعد","z":true},"b":[2,"x"]}',
            CanonicalJson::encode(['b' => [2, 'x'], 'a' => ['z' => true, 'a' => 'مساعد']]),
        );
    }

    public function test_canonical_json_uses_bytewise_key_order_and_integer_number_encoding(): void
    {
        $this->assertSame(
            '{"10":"ten","9":"nine","value":2}',
            CanonicalJson::encode(['10' => 'ten', '9' => 'nine', 'value' => 2.0]),
        );
    }
}
