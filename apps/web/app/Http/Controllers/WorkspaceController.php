<?php

namespace App\Http\Controllers;

use App\Models\ModelCatalogue;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WorkspaceController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        $catalogueModels = ModelCatalogue::query()
            ->orderBy('alias')
            ->get(['alias', 'label_en', 'label_ar', 'implementation'])
            ->map(static fn (ModelCatalogue $model): array => [
                'alias' => $model->alias,
                'label_en' => $model->label_en,
                'label_ar' => $model->label_ar,
                'implementation' => $model->implementation,
            ])
            ->values();
        $conversations = $user->conversations()
            ->withCount('messages')
            ->with(['messages' => fn ($query) => $query->where('role', 'user')->oldest()->limit(1)])
            ->latest('updated_at')
            ->get();
        $conversation = $request->boolean('new')
            ? null
            : ($request->filled('conversation_id')
                ? $user->conversations()->findOrFail($request->string('conversation_id')->toString())
                : $conversations->first());
        $run = $conversation?->runs()->latest()->first();
        $catalogueModel = $run?->model_alias
            ? ModelCatalogue::query()->where('alias', $run->model_alias)->first()
            : null;

        return Inertia::render('workspace', [
            'conversations' => $conversations->map(fn ($item) => [
                'id' => $item->id,
                'title' => $item->title,
                'preview' => $item->messages->first()?->content,
                'message_count' => $item->messages_count,
            ])->values(),
            'catalogue_models' => $catalogueModels,
            'conversation' => $conversation ? [
                'id' => $conversation->id,
                'title' => $conversation->title,
                'messages' => $conversation->messages()->oldest()->get(['role', 'content', 'model_alias']),
                'run_id' => $run?->id,
                'events' => $run?->events()->oldest()->get()->map(
                    static fn ($event) => $event->payload,
                )->values() ?? [],
                'model' => $catalogueModel ? [
                    'alias' => $catalogueModel->alias,
                    'label' => app()->getLocale() === 'ar' ? $catalogueModel->label_ar : $catalogueModel->label_en,
                    'implementation' => $catalogueModel->implementation,
                ] : null,
            ] : null,
        ]);
    }
}
