<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('model_catalogue', function (Blueprint $table) {
            $table->id();
            $table->string('alias')->unique();
            $table->string('litellm_model');
            $table->string('implementation', 32);
            $table->boolean('enabled')->default(true);
            $table->string('label_en');
            $table->string('label_ar');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('model_catalogue');
    }
};
