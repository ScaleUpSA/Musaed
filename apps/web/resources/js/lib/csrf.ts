export function getCookie(name: string): string | null {
    if (typeof document === 'undefined') {
        return null;
    }

    const prefix = `${name}=`;
    const cookie = document.cookie.split('; ').find((value) => value.startsWith(prefix));

    return cookie?.slice(prefix.length) ?? null;
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
