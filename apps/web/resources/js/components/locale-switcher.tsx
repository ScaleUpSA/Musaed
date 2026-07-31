import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { type Locale, type SharedData } from '@/types';
import { router, usePage } from '@inertiajs/react';

const locales: Locale[] = ['ar', 'en'];

export function LocaleSwitcher() {
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

    return (
        <>
            {locales.map((nextLocale) => (
                <DropdownMenuItem key={nextLocale} onClick={() => changeLocale(nextLocale)}>
                    {nextLocale === 'ar' ? 'العربية' : 'English'}
                    {nextLocale === locale && <span className="ms-auto">✓</span>}
                </DropdownMenuItem>
            ))}
        </>
    );
}
