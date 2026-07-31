import AppLogoIcon from './app-logo-icon';
import { useTranslations } from '@/hooks/use-translations';

export default function AppLogo() {
    const t = useTranslations();

    return (
        <>
            <AppLogoIcon className="size-8 shrink-0" />
            <div className="ms-1 grid flex-1 text-start text-sm">
                <span className="mb-0.5 truncate leading-none font-semibold">{t('app.name')}</span>
            </div>
        </>
    );
}
