import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { UserInfo } from './user-info';

describe('UserInfo', () => {
    it('renders user-facing name and email with auto direction', () => {
        const html = renderToStaticMarkup(
            <UserInfo
                user={{
                    id: 1,
                    name: 'DeepSeek Reverify',
                    email: 'deepseek@example.test',
                    email_verified_at: null,
                    created_at: '2026-08-01T00:00:00.000Z',
                    updated_at: '2026-08-01T00:00:00.000Z',
                }}
                showEmail={true}
            />,
        );

        expect(html).toContain('dir="auto"');
        expect(html).toContain('DeepSeek Reverify');
        expect(html).toContain('deepseek@example.test');
    });
});
