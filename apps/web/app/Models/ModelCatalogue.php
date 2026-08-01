<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ModelCatalogue extends Model
{
    protected $table = 'model_catalogue';

    public $timestamps = false;

    protected $fillable = [
        'alias',
        'litellm_model',
        'implementation',
        'enabled',
        'label_en',
        'label_ar',
    ];

    protected $casts = [
        'enabled' => 'boolean',
    ];

    /**
     * @return list<array{alias: string, litellm_model: string, implementation: string, enabled: bool, label_en: string, label_ar: string}>
     */
    public static function configured(): array
    {
        return config('services.models.catalogue', []);
    }

    public static function syncConfigured(): void
    {
        foreach (self::configured() as $entry) {
            self::query()->updateOrCreate(
                ['alias' => $entry['alias']],
                $entry,
            );
        }
    }
}
