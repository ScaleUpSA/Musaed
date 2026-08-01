import { afterEach, describe, expect, it, vi } from 'vitest';

import { csrfHeaders, getCookie } from './csrf';

describe('getCookie', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('reads the requested cookie value', () => {
        vi.stubGlobal('document', { cookie: 'XSRF-TOKEN=hello%20world; session=abc' });

        expect(getCookie('XSRF-TOKEN')).toBe('hello%20world');
        expect(getCookie('session')).toBe('abc');
        expect(getCookie('missing')).toBeNull();
    });
});

describe('csrfHeaders', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('builds the XSRF header from the cookie, not the meta tag', () => {
        vi.stubGlobal('document', {
            cookie: 'XSRF-TOKEN=token%2Bvalue',
            querySelector: vi.fn(),
        });

        expect(csrfHeaders()).toEqual({ 'X-XSRF-TOKEN': 'token+value' });
    });
});
