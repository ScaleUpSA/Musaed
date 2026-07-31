import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/hooks/use-locale';
import { useTranslations } from '@/hooks/use-translations';
import { type Locale } from '@/types';

const locales: Locale[] = ['ar', 'en'];

export function LocaleSwitcher() {
    const { locale, changeLocale } = useLocale();
    const t = useTranslations();

    return (
        <>
            {locales.map((nextLocale) => (
                <DropdownMenuItem key={nextLocale} onClick={() => changeLocale(nextLocale)}>
                    {nextLocale === 'ar' ? t('locale.arabic') : t('locale.english')}
                    {nextLocale === locale && <span className="ms-auto font-semibold">✓</span>}
                </DropdownMenuItem>
            ))}
        </>
    );
}

export function AuthLocaleSwitcher() {
    const { locale, changeLocale } = useLocale();
    const t = useTranslations();

    return (
        <div className="flex items-center justify-center gap-1" aria-label={t('locale.switch')}>
            {locales.map((nextLocale) => (
                <Button
                    key={nextLocale}
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={nextLocale === locale ? 'h-8 px-2 text-xs font-semibold text-foreground' : 'h-8 px-2 text-xs text-muted-foreground'}
                    onClick={() => changeLocale(nextLocale)}
                    aria-current={nextLocale === locale ? 'true' : undefined}
                    aria-pressed={nextLocale === locale}
                >
                    {nextLocale === 'ar' ? t('locale.arabic') : t('locale.english')}
                </Button>
            ))}
        </div>
    );
}
