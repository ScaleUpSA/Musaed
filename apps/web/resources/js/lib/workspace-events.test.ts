import { describe, expect, it } from 'vitest';

import { initialRunViewState, reduceAgentEvent, shouldStickToBottom } from './workspace-events';

describe('reduceAgentEvent', () => {
    it('turns agent events into assistant and tool view state', () => {
        const started = reduceAgentEvent(initialRunViewState, { type: 'run.started', runId: 'run-1', at: 'now' });
        const withText = reduceAgentEvent(started, { type: 'assistant.delta', runId: 'run-1', text: 'Hello ', at: 'now' });
        const withTool = reduceAgentEvent(withText, {
            type: 'tool.called',
            runId: 'run-1',
            toolName: 'search_documents',
            toolCallId: 'tool-1',
            at: 'now',
        });
        const completedTool = reduceAgentEvent(withTool, {
            type: 'tool.completed',
            runId: 'run-1',
            toolName: 'search_documents',
            toolCallId: 'tool-1',
            isError: false,
            at: 'now',
        });
        const completed = reduceAgentEvent(completedTool, { type: 'run.completed', runId: 'run-1', at: 'now' });

        expect(completed).toMatchObject({
            runId: 'run-1',
            status: 'completed',
            assistantText: 'Hello ',
            tools: [{ id: 'tool-1', name: 'search_documents', status: 'completed' }],
        });
    });

    it('ignores events from another run', () => {
        const state = reduceAgentEvent(initialRunViewState, { type: 'run.started', runId: 'run-1', at: 'now' });

        expect(reduceAgentEvent(state, { type: 'assistant.delta', runId: 'run-2', text: 'wrong', at: 'now' })).toEqual(state);
    });
});

describe('shouldStickToBottom', () => {
    it('stays pinned when the user is at the bottom', () => {
        expect(shouldStickToBottom({ scrollTop: 400, clientHeight: 400, scrollHeight: 800 })).toBe(true);
    });

    it('does not yank the viewport when the user has scrolled up', () => {
        expect(shouldStickToBottom({ scrollTop: 100, clientHeight: 400, scrollHeight: 800 })).toBe(false);
    });
});
