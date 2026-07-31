import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/hooks/use-translations';
import { type Locale, type SharedData } from '@/types';
import { router, usePage } from '@inertiajs/react';

const locales: Locale[] = ['ar', 'en'];

export function LocaleSwitcher() {
    const { locale } = usePage<SharedData>().props;
    const t = useTranslations();

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
                    {nextLocale === 'ar' ? t('locale.arabic') : t('locale.english')}
                    {nextLocale === locale && <span className="ms-auto">✓</span>}
                </DropdownMenuItem>
            ))}
        </>
    );
}

export function AuthLocaleSwitcher() {
    const { locale } = usePage<SharedData>().props;
    const t = useTranslations();

    const changeLocale = (nextLocale: Locale) => {
        if (nextLocale === locale) {
            return;
        }

        router.post(route('locale.update'), { locale: nextLocale }, {
            preserveScroll: true,
            onSuccess: () => {
                document.documentElement.lang = nextLocale;
                document.documentElement.dir = nextLocale === 'ar' ? 'rtl' : 'ltr';
            },
        });
    };

    return (
        <div className="flex items-center justify-center gap-1" aria-label={t('locale.switch')}>
            {locales.map((nextLocale) => (
                <Button
                    key={nextLocale}
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => changeLocale(nextLocale)}
                    aria-current={nextLocale === locale ? 'true' : undefined}
                >
                    {nextLocale === 'ar' ? t('locale.arabic') : t('locale.english')}
                </Button>
            ))}
        </div>
    );
}
