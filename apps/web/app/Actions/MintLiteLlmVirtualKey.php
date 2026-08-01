<?php

namespace App\Actions;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

final class MintLiteLlmVirtualKey
{
    public function mint(string $model, int $lifetimeSeconds): string
    {
        try {
            $response = Http::withToken((string) config('services.litellm.master_key'))
                ->timeout(10)
                ->post(rtrim((string) config('services.litellm.url'), '/').'/key/generate', [
                    'models' => [$model],
                    'duration' => "{$lifetimeSeconds}s",
                ]);
        } catch (ConnectionException) {
            throw new RuntimeException('Model provider is unavailable.');
        }

        if ($response->status() === 401 || $response->status() === 403) {
            throw new RuntimeException('Model provider request failed (401).');
        }

        if ($response->failed() || ! is_string($response->json('key'))) {
            throw new RuntimeException('Model provider is unavailable.');
        }

        return $response->json('key');
    }
}
