export function getCookie(name: string): string | null {
    if (typeof document === 'undefined') {
        return null;
    }

    const cookies = document.cookie.split('; ').filter(Boolean);
    for (const cookie of cookies) {
        const separatorIndex = cookie.indexOf('=');
        if (separatorIndex === -1) {
            continue;
        }

        const cookieName = cookie.slice(0, separatorIndex);
        if (cookieName !== name) {
            continue;
        }

        return cookie.slice(separatorIndex + 1);
    }

    return null;
}

export function csrfHeaders(): Record<string, string> {
    const token = getCookie('XSRF-TOKEN');
    if (!token) {
        return {};
    }

    return {
        'X-XSRF-TOKEN': decodeURIComponent(token),
    };
}
