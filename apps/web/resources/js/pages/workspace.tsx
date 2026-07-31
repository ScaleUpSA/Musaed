import WorkspaceShell from '@/components/workspace-shell';
import { useMockAgentRun } from '@/hooks/use-mock-agent-run';
import { useTranslations } from '@/hooks/use-translations';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';

export default function Dashboard() {
    const t = useTranslations();
    const run = useMockAgentRun();

    return (
        <AppLayout>
            <Head title={t('workspace.title')} />
            <WorkspaceShell state={run.state} messages={run.messages} onSubmit={run.startRun} />
        </AppLayout>
    );
}
