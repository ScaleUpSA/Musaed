import { Head } from '@inertiajs/react';

import AppearanceTabs from '@/components/appearance-tabs';
import HeadingSmall from '@/components/heading-small';

import SettingsFrame from '@/components/settings-frame';
import { useTranslations } from '@/hooks/use-translations';
import AppLayout from '@/layouts/app-layout';

export default function Appearance() {
    const t = useTranslations();
    return (
        <AppLayout>
            <Head title={t('settings.appearance_settings')} />

            <SettingsFrame>
                <div className="space-y-6">
                    <HeadingSmall title={t('settings.appearance_settings')} description={t('settings.appearance_description')} />
                    <AppearanceTabs />
                </div>
            </SettingsFrame>
        </AppLayout>
    );
}
