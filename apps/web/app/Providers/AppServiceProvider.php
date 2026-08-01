<?php

namespace App\Providers;

use App\Support\RunEnvelope\RunEnvelopeSigner;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(RunEnvelopeSigner::class, fn (): RunEnvelopeSigner => new RunEnvelopeSigner(
            (string) config('services.agent.envelope_private_key'),
            (int) config('services.agent.envelope_lifetime_seconds', 300),
        ));
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $realModelEnabled = collect(config('services.models.catalogue', []))
            ->contains(static fn (array $model): bool => ($model['implementation'] ?? null) === 'litellm'
                && ($model['enabled'] ?? false));

        if ($realModelEnabled && blank(config('services.litellm.master_key'))) {
            throw new \RuntimeException('LITELLM_MASTER_KEY is required when a real model is enabled.');
        }
    }
}
