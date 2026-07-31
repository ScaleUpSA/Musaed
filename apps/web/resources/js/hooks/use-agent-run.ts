import { useEffect, useState } from 'react';

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
    const [lastEventId, setLastEventId] = useState(conversation?.events.length ?? 0);

    useEffect(() => {
        setMessages(conversation?.messages ?? []);
        setRunId(conversation?.run_id ?? null);
        setLastEventId(conversation?.events.length ?? 0);
        setState(
            conversation
                ? conversation.events.filter(isAgentEvent).reduce(reduceAgentEvent, initialRunViewState)
                : initialRunViewState,
        );
    }, [conversation]);

    useEffect(() => {
        if (!runId) {
            return;
        }

        const poll = async () => {
            const response = await fetch(`/runs/${runId}/events?after=${lastEventId}`, {
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

            events.filter(isAgentEvent).forEach((event) => setState((current) => reduceAgentEvent(current, event)));
            if (typeof data.last_event_id === 'number') {
                setLastEventId(data.last_event_id);
            }
        };

        void poll();
        const interval = window.setInterval(() => void poll(), 500);

        return () => window.clearInterval(interval);
    }, [runId, lastEventId]);

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
        setLastEventId(0);
        if (typeof data.run_id === 'string') {
            setRunId(data.run_id);
        }
    };

    return { state, messages, startRun };
}
