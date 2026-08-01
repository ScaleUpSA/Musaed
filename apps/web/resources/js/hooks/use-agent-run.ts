import { useEffect, useRef, useState } from 'react';

import { appendCompletedAssistantMessage, initialRunViewState, reduceAgentEvent, type ConversationMessage, type RunViewState } from '@/lib/workspace-events';
import type { AgentEvent } from '@musaed/contracts';

type ConversationProps = {
    id: string;
    messages: ConversationMessage[];
    run_id: string | null;
    events: AgentEvent[];
    model: { alias: string; label: string; implementation: 'fake' | 'litellm' } | null;
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
    const stateRef = useRef(state);
    const [messages, setMessages] = useState<ConversationMessage[]>(conversation?.messages ?? []);
    const [conversationId, setConversationId] = useState<string | null>(conversation?.id ?? null);
    const runModelAliasRef = useRef<string | null>(conversation?.model?.alias ?? null);
    const [runId, setRunId] = useState<string | null>(conversation?.run_id ?? null);
    const cursorRef = useRef(conversation?.events.length ?? 0);
    const statusRef = useRef(state.status);
    statusRef.current = state.status;

    useEffect(() => {
        setMessages(conversation?.messages ?? []);
        setConversationId(conversation?.id ?? null);
        runModelAliasRef.current = conversation?.model?.alias ?? null;
        setRunId(conversation?.run_id ?? null);
        cursorRef.current = conversation?.events.length ?? 0;
        setState(
            conversation
                ? conversation.events.filter(isAgentEvent).reduce(reduceAgentEvent, initialRunViewState)
                : initialRunViewState,
        );
        stateRef.current = conversation
            ? conversation.events.filter(isAgentEvent).reduce(reduceAgentEvent, initialRunViewState)
            : initialRunViewState;
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
            const nextState = agentEvents.reduce(reduceAgentEvent, stateRef.current);
            stateRef.current = nextState;
            setState(nextState);
            if (agentEvents.some((event) => event.type === 'run.completed')) {
                setMessages((current) => appendCompletedAssistantMessage(current, nextState, runModelAliasRef.current));
            }
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
            body: JSON.stringify({ conversation_id: conversationId, message }),
        });
        if (!response.ok) {
            return;
        }

        const data: unknown = await response.json();
        if (typeof data !== 'object' || data === null || !('run_id' in data)) {
            return;
        }

        setMessages((current) => [...appendCompletedAssistantMessage(current, stateRef.current, runModelAliasRef.current), { role: 'user', content: message }]);
        stateRef.current = initialRunViewState;
        setState(initialRunViewState);
        cursorRef.current = 0;
        if (typeof data.run_id === 'string') {
            setRunId(data.run_id);
        }
        if ('model_alias' in data && typeof data.model_alias === 'string') {
            runModelAliasRef.current = data.model_alias;
        }
        if ('conversation_id' in data && typeof data.conversation_id === 'string') {
            setConversationId(data.conversation_id);
        }
    };

    return { state, messages, conversationId, startRun };
}
