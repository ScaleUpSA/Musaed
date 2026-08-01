<?php

use App\Http\Controllers\LocaleController;
use App\Http\Controllers\RunController;
use App\Http\Controllers\WorkspaceController;
use Illuminate\Foundation\Http\Middleware\TrimStrings;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::post('locale', [LocaleController::class, 'update'])->name('locale.update');

Route::middleware(['auth'])->group(function () {
    Route::get('workspace', WorkspaceController::class)->name('workspace');

    Route::post('runs', [RunController::class, 'store'])->name('runs.store');
    Route::get('runs/{run}/events', [RunController::class, 'events'])->name('runs.events');

    Route::get('dashboard', function () {
        return to_route('workspace');
    })->name('dashboard');
});

Route::post('internal/runs/events', [RunController::class, 'callback'])
    ->withoutMiddleware([ValidateCsrfToken::class, TrimStrings::class])
    ->name('runs.callback');

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
