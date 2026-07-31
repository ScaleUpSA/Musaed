<?php

use App\Http\Controllers\LocaleController;
use App\Http\Controllers\RunController;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::post('locale', [LocaleController::class, 'update'])->name('locale.update');

Route::middleware(['auth'])->group(function () {
    Route::get('workspace', function (Request $request) {
        $user = $request->user();
        $conversations = $user->conversations()->withCount('messages')->latest('updated_at')->get();
        $conversation = $request->filled('conversation_id')
            ? $user->conversations()->findOrFail($request->string('conversation_id')->toString())
            : $conversations->first();
        $run = $conversation?->runs()->latest()->first();

        return Inertia::render('workspace', [
            'conversations' => $conversations->map(fn ($item) => [
                'id' => $item->id,
                'title' => $item->title,
                'message_count' => $item->messages_count,
            ])->values(),
            'conversation' => $conversation ? [
                'id' => $conversation->id,
                'messages' => $conversation->messages()->oldest()->get(['role', 'content']),
                'run_id' => $run?->id,
                'events' => $run?->events()->oldest()->get()->map(
                    static fn ($event) => $event->payload,
                )->values() ?? [],
            ] : null,
        ]);
    })->name('workspace');

    Route::post('runs', [RunController::class, 'store'])->name('runs.store');
    Route::get('runs/{run}/events', [RunController::class, 'events'])->name('runs.events');

    Route::get('dashboard', function () {
        return to_route('workspace');
    })->name('dashboard');
});

Route::post('internal/runs/events', [RunController::class, 'callback'])
    ->withoutMiddleware([ValidateCsrfToken::class])
    ->name('runs.callback');

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
