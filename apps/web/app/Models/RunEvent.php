<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RunEvent extends Model
{
    protected $fillable = ['sequence', 'type', 'payload', 'occurred_at'];

    protected $casts = [
        'payload' => 'array',
        'occurred_at' => 'datetime',
    ];

    public function run(): BelongsTo
    {
        return $this->belongsTo(Run::class);
    }
}
