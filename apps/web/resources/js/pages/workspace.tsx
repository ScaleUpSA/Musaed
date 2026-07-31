import WorkspaceShell from '@/components/workspace-shell';
import { useAgentRun } from '@/hooks/use-agent-run';
import { useTranslations } from '@/hooks/use-translations';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import type { AgentEvent } from '@musaed/contracts';

type WorkspaceProps = {
    conversations: { id: string; title: string | null; message_count: number }[];
    conversation: {
        id: string;
        messages: { role: 'user' | 'assistant'; content: string }[];
        run_id: string | null;
        events: AgentEvent[];
    } | null;
};

export default function Workspace({ conversations, conversation }: WorkspaceProps) {
    const t = useTranslations();
    const run = useAgentRun(conversation);

    return (
        <AppLayout>
            <Head title={t('workspace.title')} />
            <WorkspaceShell
                state={run.state}
                messages={run.messages}
                onSubmit={run.startRun}
                conversationId={conversation?.id ?? null}
                conversations={conversations}
            />
        </AppLayout>
    );
}
