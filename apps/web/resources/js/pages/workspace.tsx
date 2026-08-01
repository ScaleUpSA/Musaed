import WorkspaceShell from '@/components/workspace-shell';
import { useAgentRun } from '@/hooks/use-agent-run';
import { useTranslations } from '@/hooks/use-translations';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import type { AgentEvent } from '@musaed/contracts';
import type { CatalogueModel } from '@/lib/workspace-events';

type WorkspaceProps = {
    conversations: { id: string; title: string | null; preview: string | null; message_count: number }[];
    catalogue_models: CatalogueModel[];
    conversation: {
        id: string;
        title: string | null;
        messages: { role: 'user' | 'assistant'; content: string; model_alias?: string | null }[];
        run_id: string | null;
        events: AgentEvent[];
        model: { alias: string; label: string; implementation: 'fake' | 'litellm' } | null;
    } | null;
};

export default function Workspace({ conversations, catalogue_models, conversation }: WorkspaceProps) {
    const t = useTranslations();
    const run = useAgentRun(conversation);

    return (
        <AppLayout>
            <Head title={t('workspace.title')} />
            <WorkspaceShell
                state={run.state}
                messages={run.messages}
                conversationTitle={conversation?.title ?? null}
                onSubmit={run.startRun}
                conversationId={run.conversationId}
                conversations={conversations}
                model={conversation?.model ?? null}
                catalogueModels={catalogue_models}
            />
        </AppLayout>
    );
}
