import type { AgentEvent } from '@musaed/contracts';

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

export type ConversationMessage = {
    role: 'user' | 'assistant';
    content: string;
};

export function appendCompletedAssistantMessage(messages: ConversationMessage[], state: RunViewState): ConversationMessage[] {
    if (state.status !== 'completed' || state.assistantText.length === 0) {
        return messages;
    }

    const lastMessage = messages.at(-1);
    if (lastMessage?.role === 'assistant' && lastMessage.content === state.assistantText) {
        return messages;
    }

    return [...messages, { role: 'assistant', content: state.assistantText }];
}

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
