<?php

namespace Database\Seeders;

use App\Models\ModelCatalogue;
use Illuminate\Database\Seeder;

class ModelCatalogueSeeder extends Seeder
{
    public function run(): void
    {
        ModelCatalogue::syncConfigured();
    }
}
