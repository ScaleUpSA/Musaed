<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'agent' => [
        'url' => env('AGENT_URL', 'http://127.0.0.1:3001'),
        'events_url' => env('AGENT_EVENTS_URL', 'http://127.0.0.1:8000/internal/runs/events'),
        'audit_url' => env('AGENT_AUDIT_URL', 'http://127.0.0.1:8000/internal/runs/events'),
        'approvals_url' => env('AGENT_APPROVALS_URL', 'http://127.0.0.1:8000/internal/runs/events'),
        'envelope_private_key' => env('AGENT_ENVELOPE_PRIVATE_KEY'),
        'envelope_lifetime_seconds' => (int) env('RUN_ENVELOPE_LIFETIME_SECONDS', 300),
    ],

];
