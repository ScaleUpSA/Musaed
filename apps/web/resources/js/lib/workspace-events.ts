import type { AgentEvent } from '@musaed/contracts';

import type { Locale } from '@/types';

export type AgentEventSource = {
    subscribe: (onEvent: (event: AgentEvent) => void) => () => void;
};

export type ToolView = {
    id: string;
    name: string;
    status: 'running' | 'completed' | 'failed';
};

export type RunViewState = {
    runId: string | null;
    status: 'idle' | 'running' | 'completed' | 'failed';
    assistantText: string;
    tools: ToolView[];
    error: string | null;
};

export const initialRunViewState: RunViewState = {
    runId: null,
    status: 'idle',
    assistantText: '',
    tools: [],
    error: null,
};

export function reduceAgentEvent(state: RunViewState, event: AgentEvent): RunViewState {
    if (state.runId !== null && event.runId !== state.runId) {
        return state;
    }

    switch (event.type) {
        case 'run.started':
            return { ...state, runId: event.runId, status: 'running', error: null };
        case 'assistant.delta':
            return { ...state, runId: event.runId, assistantText: state.assistantText + event.text };
        case 'tool.called':
            return {
                ...state,
                runId: event.runId,
                status: 'running',
                tools: [...state.tools, { id: event.toolCallId, name: event.toolName, status: 'running' }],
            };
        case 'tool.completed':
            return {
                ...state,
                runId: event.runId,
                tools: state.tools.map((tool) => (tool.id === event.toolCallId ? { ...tool, status: event.isError ? 'failed' : 'completed' } : tool)),
            };
        case 'run.completed':
            return { ...state, runId: event.runId, status: 'completed' };
        case 'run.failed':
            return { ...state, runId: event.runId, status: 'failed', error: event.error };
    }
}

export function shouldStickToBottom(
    { scrollTop, clientHeight, scrollHeight }: { scrollTop: number; clientHeight: number; scrollHeight: number },
    threshold = 24,
): boolean {
    return scrollHeight - (scrollTop + clientHeight) <= threshold;
}

export function createMockAgentEventSource(runId: string, locale: Locale): AgentEventSource {
    const assistantText =
        locale === 'ar'
            ? [
                  'سأراجع ملاحظات المشروع الأخيرة وألخّص القرارات الرئيسية. ',
                  'الفريق متفق على خطة الإطلاق، مع توثيق الموافقات والمسؤوليات بوضوح.',
              ]
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
