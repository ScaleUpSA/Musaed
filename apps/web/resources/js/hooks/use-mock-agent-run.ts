import { useEffect, useState } from 'react';

import { useTranslations } from '@/hooks/use-translations';
import { createMockAgentEventSource, initialRunViewState, reduceAgentEvent, type RunViewState } from '@/lib/workspace-events';
import { usePage } from '@inertiajs/react';
import type { SharedData } from '@/types';

export function useMockAgentRun() {
    const t = useTranslations();
    const { locale } = usePage<SharedData>().props;
    const [messages, setMessages] = useState([t('workspace.mock_prompt')]);
    const [runKey, setRunKey] = useState(1);
    const [state, setState] = useState<RunViewState>(initialRunViewState);

    useEffect(() => {
        const source = createMockAgentEventSource(`mock-run-${runKey}`, locale);

        return source.subscribe((event) => {
            setState((current) => reduceAgentEvent(current, event));
        });
    }, [locale, runKey]);

    const startRun = (message: string) => {
        setMessages((current) => [...current, message]);
        setState(initialRunViewState);
        setRunKey((current) => current + 1);
    };

    return { state, messages, startRun };
}
