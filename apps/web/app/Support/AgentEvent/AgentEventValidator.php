<?php

namespace App\Support\AgentEvent;

use Illuminate\Support\Facades\Validator;

final class AgentEventValidator
{
    /**
     * @param  array<string, mixed>  $payload
     */
    public function accepts(array $payload): bool
    {
        if (! is_string($payload['type'] ?? null)) {
            return false;
        }

        $rules = [
            'type' => ['required', 'in:run.started,assistant.delta,tool.called,tool.completed,run.completed,run.failed'],
            'runId' => ['required', 'string'],
            'at' => ['required', 'date'],
        ];

        return Validator::make($payload, $rules + match ($payload['type']) {
            'assistant.delta' => [
                'text' => ['present', 'string'],
            ],
            'tool.called' => [
                'toolName' => ['required', 'string'],
                'toolCallId' => ['required', 'string'],
            ],
            'tool.completed' => [
                'toolName' => ['required', 'string'],
                'toolCallId' => ['required', 'string'],
                'isError' => ['required', 'boolean'],
            ],
            'run.failed' => [
                'error' => ['required', 'string'],
            ],
            default => [],
        }, ['bail'])->passes();
    }
}
