<?php

namespace App\Actions;

use App\Models\ModelCatalogue;
use App\Models\User;
use Illuminate\Validation\ValidationException;

final class ResolveRunPolicy
{
    /**
     * @return array{
     *     groupId: string,
     *     workspaceId: string,
     *     policyVersion: string,
     *     allowedModels: list<string>,
     *     modelAlias: string,
     *     modelName: string,
     *     modelImplementation: string,
     *     allowedTools: list<string>,
     *     approvalRequiredTools: list<string>,
     *     sandbox: array{enabled: bool, cpuLimitMillicores: int, memoryLimitMb: int, pidsLimit: int}
     * }
     */
    public function resolve(User $user, ?string $requestedAlias = null): array
    {
        $models = ModelCatalogue::query()->where('enabled', true)->orderBy('id')->get();
        // A configured real model is the default; the fake entry is only the keyless fallback.
        $selected = $requestedAlias === null
            ? $models->first(static fn (ModelCatalogue $model): bool => $model->implementation !== 'fake') ?? $models->first()
            : $models->firstWhere('alias', $requestedAlias);

        if ($selected === null) {
            throw ValidationException::withMessages([
                'model' => 'The selected model is not available.',
            ]);
        }

        return [
            'groupId' => 'default',
            'workspaceId' => (string) $user->id,
            'policyVersion' => 'default-v1',
            'allowedModels' => $models->pluck('alias')->values()->all(),
            'modelAlias' => $selected->alias,
            'modelName' => $selected->litellm_model,
            'modelImplementation' => $selected->implementation,
            'allowedTools' => [],
            'approvalRequiredTools' => [],
            'sandbox' => [
                'enabled' => false,
                'cpuLimitMillicores' => 1000,
                'memoryLimitMb' => 1024,
                'pidsLimit' => 128,
            ],
        ];
    }
}
