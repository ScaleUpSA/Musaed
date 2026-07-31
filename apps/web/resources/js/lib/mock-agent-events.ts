import type { AgentEvent } from '@musaed/contracts';

import type { Locale } from '@/types';

import type { AgentEventSource } from './workspace-events';

export function createMockAgentEventSource(runId: string, locale: Locale): AgentEventSource {
    const assistantText =
        locale === 'ar'
            ? ['سأراجع ملاحظات المشروع الأخيرة وألخّص القرارات الرئيسية. ', 'الفريق متفق على خطة الإطلاق، مع توثيق الموافقات والمسؤوليات بوضوح.']
            : [
                  'I’ll review the latest project notes and summarize the key decisions. ',
                  'The team is aligned on the rollout plan, with approvals and ownership clearly recorded.',
              ];
    const events: Array<{ delay: number; event: AgentEvent }> = [
        { delay: 250, event: { type: 'run.started', runId, at: new Date().toISOString() } },
        {
            delay: 700,
            event: {
                type: 'assistant.delta',
                runId,
                text: assistantText[0],
                at: new Date().toISOString(),
            },
        },
        {
            delay: 1250,
            event: { type: 'tool.called', runId, toolName: 'search_documents', toolCallId: `${runId}-tool-1`, at: new Date().toISOString() },
        },
        {
            delay: 2100,
            event: {
                type: 'tool.completed',
                runId,
                toolName: 'search_documents',
                toolCallId: `${runId}-tool-1`,
                isError: false,
                at: new Date().toISOString(),
            },
        },
        {
            delay: 2450,
            event: {
                type: 'assistant.delta',
                runId,
                text: assistantText[1],
                at: new Date().toISOString(),
            },
        },
        { delay: 3600, event: { type: 'run.completed', runId, at: new Date().toISOString() } },
    ];

    return {
        subscribe(onEvent) {
            const timers = events.map(({ delay, event }) => window.setTimeout(() => onEvent(event), delay));

            return () => timers.forEach((timer) => window.clearTimeout(timer));
        },
    };
}
