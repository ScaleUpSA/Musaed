<?php

namespace App\Actions;

use Illuminate\Support\Facades\Http;
use RuntimeException;

final class MintLiteLlmVirtualKey
{
    public function mint(string $model, int $lifetimeSeconds): string
    {
        $response = Http::withToken((string) config('services.litellm.master_key'))
            ->timeout(10)
            ->post(rtrim((string) config('services.litellm.url'), '/').'/key/generate', [
                'models' => [$model],
                'duration' => "{$lifetimeSeconds}s",
            ]);

        if ($response->failed() || ! is_string($response->json('key'))) {
            throw new RuntimeException('LiteLLM virtual key minting failed.');
        }

        return $response->json('key');
    }
}
