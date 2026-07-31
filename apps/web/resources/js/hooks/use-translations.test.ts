import { describe, expect, it } from 'vitest';

import { translate } from './use-translations';

describe('translate', () => {
    const catalogue = {
        auth: {
            login: 'تسجيل الدخول',
        },
    };

    it('returns a translated component string', () => {
        expect(translate(catalogue, 'auth.login')).toBe('تسجيل الدخول');
    });

    it('returns the key when a translation is missing', () => {
        expect(translate(catalogue, 'auth.register')).toBe('auth.register');
    });
});
