<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('run_events', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('run_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('sequence');
            $table->string('type', 64);
            $table->json('payload');
            $table->timestamp('occurred_at');
            $table->timestamps();
            $table->unique(['run_id', 'sequence']);
            $table->index(['run_id', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('run_events');
    }
};
