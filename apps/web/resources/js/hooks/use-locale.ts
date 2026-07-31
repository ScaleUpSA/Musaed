import { router, usePage } from '@inertiajs/react';

import { type Locale, type SharedData } from '@/types';

export function useLocale() {
    const { locale } = usePage<SharedData>().props;

    const changeLocale = (nextLocale: Locale) => {
        if (nextLocale === locale) {
            return;
        }

        router.post(
            route('locale.update'),
            { locale: nextLocale },
            {
                preserveScroll: true,
                onSuccess: () => {
                    document.documentElement.lang = nextLocale;
                    document.documentElement.dir = nextLocale === 'ar' ? 'rtl' : 'ltr';
                },
            },
        );
    };

    return { locale, changeLocale };
}
