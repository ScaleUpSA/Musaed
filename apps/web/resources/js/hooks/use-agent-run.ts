import { useEffect, useRef, useState } from 'react';

import { initialRunViewState, reduceAgentEvent, type RunViewState } from '@/lib/workspace-events';
import type { AgentEvent } from '@musaed/contracts';

type PersistedMessage = {
    role: 'user' | 'assistant';
    content: string;
};

type ConversationProps = {
    id: string;
    messages: PersistedMessage[];
    run_id: string | null;
    events: AgentEvent[];
};

const csrfToken = (): string => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';

const isAgentEvent = (value: unknown): value is AgentEvent =>
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    'runId' in value &&
    'at' in value;

export function useAgentRun(conversation: ConversationProps | null) {
    const [state, setState] = useState<RunViewState>(() => {
        if (!conversation) {
            return initialRunViewState;
        }

        return conversation.events.filter(isAgentEvent).reduce(reduceAgentEvent, initialRunViewState);
    });
    const [messages, setMessages] = useState<PersistedMessage[]>(conversation?.messages ?? []);
    const [runId, setRunId] = useState<string | null>(conversation?.run_id ?? null);
    const cursorRef = useRef(conversation?.events.length ?? 0);
    const statusRef = useRef(state.status);
    statusRef.current = state.status;

    useEffect(() => {
        setMessages(conversation?.messages ?? []);
        setRunId(conversation?.run_id ?? null);
        cursorRef.current = conversation?.events.length ?? 0;
        setState(
            conversation
                ? conversation.events.filter(isAgentEvent).reduce(reduceAgentEvent, initialRunViewState)
                : initialRunViewState,
        );
    }, [conversation]);

    useEffect(() => {
        if (!runId || statusRef.current === 'completed' || statusRef.current === 'failed') {
            return;
        }

        const poll = async () => {
            const response = await fetch(`/runs/${runId}/events?after=${cursorRef.current}`, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });
            if (!response.ok) {
                return;
            }

            const data: unknown = await response.json();
            if (typeof data !== 'object' || data === null || !('events' in data) || !('last_event_id' in data)) {
                return;
            }

            const events = data.events;
            if (!Array.isArray(events)) {
                return;
            }

            const agentEvents = events.filter(isAgentEvent);
            agentEvents.forEach((event) => setState((current) => reduceAgentEvent(current, event)));
            if (typeof data.last_event_id === 'number') {
                cursorRef.current = data.last_event_id;
            }
            if (agentEvents.some((event) => event.type === 'run.completed' || event.type === 'run.failed')) {
                window.clearInterval(interval);
            }
        };

        const interval = window.setInterval(() => void poll(), 500);
        void poll();

        return () => window.clearInterval(interval);
    }, [runId]);

    const startRun = async (message: string) => {
        const response = await fetch('/runs', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken(),
            },
            credentials: 'same-origin',
            body: JSON.stringify({ conversation_id: conversation?.id, message }),
        });
        if (!response.ok) {
            return;
        }

        const data: unknown = await response.json();
        if (typeof data !== 'object' || data === null || !('run_id' in data)) {
            return;
        }

        setMessages((current) => [...current, { role: 'user', content: message }]);
        setState(initialRunViewState);
        cursorRef.current = 0;
        if (typeof data.run_id === 'string') {
            setRunId(data.run_id);
        }
    };

    return { state, messages, startRun };
}
