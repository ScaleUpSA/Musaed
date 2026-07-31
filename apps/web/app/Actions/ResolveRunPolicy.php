<?php

namespace App\Actions;

use App\Models\User;

final class ResolveRunPolicy
{
    /**
     * @return array{
     *     groupId: string,
     *     workspaceId: string,
     *     policyVersion: string,
     *     allowedModels: list<string>,
     *     allowedTools: list<string>,
     *     approvalRequiredTools: list<string>,
     *     sandbox: array{enabled: bool, cpuLimitMillicores: int, memoryLimitMb: int, pidsLimit: int}
     * }
     */
    public function resolve(User $user): array
    {
        return [
            'groupId' => 'default',
            'workspaceId' => (string) $user->id,
            'policyVersion' => 'default-v1',
            'allowedModels' => ['fake-model'],
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
