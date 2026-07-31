import {
    CheckCircle2,
    ChevronRight,
    CircleDot,
    CircleStop,
    FileText,
    LoaderCircle,
    PanelRightClose,
    PanelRightOpen,
    Plus,
    Send,
    Wrench,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import AppLogo from '@/components/app-logo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import { UserMenuContent } from '@/components/user-menu-content';
import { useTranslations } from '@/hooks/use-translations';
import { cn } from '@/lib/utils';
import { shouldStickToBottom, type RunViewState } from '@/lib/workspace-events';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';

type Conversation = {
    id: string;
    title: string;
    preview: string;
};

const conversation: Conversation = {
    id: 'launch-planning',
    title: 'workspace.conversation_title',
    preview: 'workspace.conversation_preview',
};

export function ConversationRail({ selectedId, onSelect, onNew }: { selectedId: string | null; onSelect: (id: string) => void; onNew: () => void }) {
    const t = useTranslations();
    const { auth } = usePage<SharedData>().props;

    return (
        <aside className="bg-surface-subtle border-border/80 flex min-h-0 flex-col border-e">
            <div className="border-border/80 flex items-center justify-between gap-3 border-b px-5 py-5">
                <Link href="/workspace" className="flex min-w-0 items-center">
                    <AppLogo />
                </Link>
                <Button variant="ghost" size="icon" className="size-9 shrink-0" onClick={onNew} aria-label={t('workspace.new_conversation')}>
                    <Plus className="size-4" />
                </Button>
            </div>
            <div className="px-4 pt-5 pb-2">
                <p className="text-muted-foreground px-2 text-[0.7rem] font-semibold tracking-[0.16em] uppercase">{t('workspace.conversations')}</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3">
                <button
                    type="button"
                    className={cn(
                        'group flex w-full items-start gap-3 rounded-xl p-3 text-start transition-colors',
                        selectedId === conversation.id ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/70',
                    )}
                    onClick={() => onSelect(conversation.id)}
                >
                    <div className="bg-primary text-primary-foreground mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg">
                        <CircleDot className="size-4" />
                    </div>
                    <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{t(conversation.title)}</span>
                        <span className="text-muted-foreground mt-0.5 block truncate text-xs">{t(conversation.preview)}</span>
                    </span>
                </button>
            </div>
            <div className="border-border/80 border-t p-3">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-auto w-full justify-start gap-3 rounded-xl px-3 py-3 text-start">
                            <UserInfo user={auth.user} />
                            <span className="text-muted-foreground ms-auto">•••</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64 rounded-xl" align="end" side="top">
                        <UserMenuContent user={auth.user} />
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </aside>
    );
}

function EmptyConversation({ onSelect }: { onSelect: () => void }) {
    const t = useTranslations();

    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
            <div className="bg-muted flex size-12 items-center justify-center rounded-full">
                <CircleDot className="text-muted-foreground size-5" />
            </div>
            <h2 className="font-medium">{t('workspace.no_selection_title')}</h2>
            <p className="text-muted-foreground max-w-xs text-sm">{t('workspace.no_selection_description')}</p>
            <Button variant="outline" size="sm" onClick={onSelect}>
                {t('workspace.conversations')}
                <ChevronRight className="rtl:rotate-180" />
            </Button>
        </div>
    );
}

function RunStatus({ state }: { state: RunViewState }) {
    const t = useTranslations();
    const labels = {
        idle: 'workspace.run_idle',
        running: 'workspace.run_running',
        completed: 'workspace.run_completed',
        failed: 'workspace.run_failed',
    } as const;

    return (
        <Badge variant={state.status === 'failed' ? 'destructive' : state.status === 'running' ? 'default' : 'secondary'}>
            {state.status === 'running' && <LoaderCircle className="animate-spin" />}
            {t(labels[state.status])}
        </Badge>
    );
}

function ToolActivity({ state }: { state: RunViewState }) {
    const t = useTranslations();

    if (state.tools.length === 0) {
        return null;
    }

    return (
        <div className="border-border/70 bg-muted/30 flex flex-col gap-2 rounded-lg border p-3">
            <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
                <Wrench className="size-3.5" />
                {t('workspace.tool_activity')}
            </div>
            {state.tools.map((tool) => (
                <div key={tool.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                        {tool.status === 'running' ? (
                            <LoaderCircle className="text-muted-foreground size-3.5 animate-spin" />
                        ) : (
                            <CheckCircle2 className="text-muted-foreground size-3.5" />
                        )}
                        <span className="truncate font-mono text-xs">{tool.name}</span>
                    </span>
                    <span className="text-muted-foreground text-xs">
                        {t(
                            tool.status === 'running'
                                ? 'workspace.tool_running'
                                : tool.status === 'failed'
                                  ? 'workspace.tool_failed'
                                  : 'workspace.tool_completed',
                        )}
                    </span>
                </div>
            ))}
        </div>
    );
}

function ConversationView({ state, messages, onSubmit }: { state: RunViewState; messages: string[]; onSubmit: (message: string) => void }) {
    const t = useTranslations();
    const [draft, setDraft] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const pinnedRef = useRef(true);
    const running = state.status === 'running';

    useEffect(() => {
        const element = scrollRef.current;
        if (element && pinnedRef.current) {
            element.scrollTop = element.scrollHeight;
        }
    }, [state.assistantText, state.tools.length, messages.length]);

    const handleScroll = () => {
        const element = scrollRef.current;
        if (element) {
            pinnedRef.current = shouldStickToBottom(element);
        }
    };

    const submit = () => {
        const message = draft.trim();
        if (message.length === 0 || running) {
            return;
        }

        onSubmit(message);
        setDraft('');
    };

    return (
        <section className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between gap-3 border-b px-5 py-3">
                <div className="flex items-center gap-3">
                    <h1 className="font-semibold">{t('workspace.conversation_title')}</h1>
                    <RunStatus state={state} />
                </div>
                <span title={t('workspace.cancel_unavailable')}>
                    <Button variant="outline" size="sm" disabled aria-label={t('workspace.cancel_run')}>
                        <CircleStop />
                        <span className="hidden sm:inline">{t('workspace.cancel_run')}</span>
                    </Button>
                </span>
            </div>

            <div ref={scrollRef} onScroll={handleScroll} className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
                <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
                    {messages.map((message, index) => (
                        <div key={`${message}-${index}`} className="flex max-w-full flex-col items-end">
                            <div className="bg-muted/60 border-border/70 text-foreground max-w-[min(100%,36rem)] rounded-2xl rounded-ee-sm border px-4 py-3 text-sm leading-7">
                                {message}
                            </div>
                        </div>
                    ))}

                    {state.assistantText.length > 0 && (
                        <div className="flex max-w-full flex-col items-start">
                            <div className="text-primary mb-2 flex items-center gap-2 text-xs font-semibold">
                                <span className="bg-primary size-1.5 rounded-full" />
                                {t('workspace.assistant')}
                            </div>
                            <div className="text-foreground max-w-[min(100%,48rem)] text-[0.95rem] leading-8 whitespace-pre-wrap">
                                {state.assistantText}
                            </div>
                        </div>
                    )}

                    <div className="max-w-[min(100%,48rem)]">
                        <ToolActivity state={state} />
                    </div>

                    {messages.length === 0 && state.assistantText.length === 0 && state.tools.length === 0 && state.status === 'idle' && (
                        <p className="text-muted-foreground py-20 text-center text-sm">{t('workspace.empty_conversation')}</p>
                    )}

                    {state.error && <p className="text-destructive text-sm">{state.error}</p>}
                </div>
            </div>

            <form
                className="border-t p-4"
                onSubmit={(event) => {
                    event.preventDefault();
                    submit();
                }}
            >
                <div className="bg-background mx-auto flex max-w-3xl items-end gap-2 rounded-xl border p-2 shadow-sm">
                    <textarea
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' && !event.shiftKey) {
                                event.preventDefault();
                                submit();
                            }
                        }}
                        disabled={running}
                        rows={1}
                        aria-label={t('workspace.composer_placeholder')}
                        placeholder={t('workspace.composer_placeholder')}
                        className="max-h-32 min-h-10 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm outline-hidden focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <Button type="submit" size="icon" disabled={running || draft.trim().length === 0} aria-label={t('workspace.send_message')}>
                        <Send className="rtl:rotate-180" />
                    </Button>
                </div>
            </form>
        </section>
    );
}

function ArtifactPanel({ open, onToggle }: { open: boolean; onToggle: () => void }) {
    const t = useTranslations();

    if (!open) {
        return (
            <aside className="bg-muted/20 flex items-start justify-center border-s p-3">
                <Button variant="outline" size="icon" onClick={onToggle} aria-label={t('workspace.panel_open')}>
                    <PanelRightOpen className="rtl:rotate-180" />
                </Button>
            </aside>
        );
    }

    return (
        <aside className="bg-muted/20 flex min-h-0 flex-col border-s">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                <h2 className="text-sm font-semibold">{t('workspace.artifacts')}</h2>
                <Button variant="ghost" size="icon" className="size-8" onClick={onToggle} aria-label={t('workspace.panel_close')}>
                    <PanelRightClose className="rtl:rotate-180" />
                </Button>
            </div>
            <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
                <div className="flex flex-col items-center gap-2 py-5 text-center">
                    <FileText className="text-muted-foreground size-5" />
                    <p className="text-muted-foreground text-sm">{t('workspace.artifacts_empty')}</p>
                </div>
                <div className="border-border/70 rounded-lg border border-dashed p-4">
                    <h3 className="mb-1 text-sm font-medium">{t('workspace.computer_view')}</h3>
                    <p className="text-muted-foreground text-xs">{t('workspace.computer_empty')}</p>
                </div>
            </div>
        </aside>
    );
}

export default function WorkspaceShell({
    state,
    messages,
    onSubmit,
}: {
    state: RunViewState;
    messages: string[];
    onSubmit: (message: string) => void;
}) {
    const [selectedId, setSelectedId] = useState<string | null>(conversation.id);
    const [panelOpen, setPanelOpen] = useState(true);

    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div
                className={cn(
                    'bg-card border-border/80 grid min-h-0 flex-1 overflow-hidden rounded-2xl border shadow-[0_16px_50px_-36px_rgba(17,81,180,0.55)]',
                    panelOpen
                        ? 'grid-cols-[minmax(13rem,16rem)_minmax(0,1fr)_minmax(15rem,20rem)]'
                        : 'grid-cols-[minmax(13rem,16rem)_minmax(0,1fr)_auto]',
                )}
            >
                <ConversationRail selectedId={selectedId} onSelect={setSelectedId} onNew={() => setSelectedId(null)} />
                {selectedId ? (
                    <ConversationView state={state} messages={messages} onSubmit={onSubmit} />
                ) : (
                    <EmptyConversation onSelect={() => setSelectedId(conversation.id)} />
                )}
                <ArtifactPanel open={panelOpen} onToggle={() => setPanelOpen((open) => !open)} />
            </div>
        </div>
    );
}
