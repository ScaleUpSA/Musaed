import AppLogoIcon from '@/components/app-logo-icon';
import { AuthLocaleSwitcher } from '@/components/locale-switcher';
import { useTranslations } from '@/hooks/use-translations';
import { Link } from '@inertiajs/react';

export default function AuthLayout({ children, title, description }: { children: React.ReactNode; title: string; description: string }) {
    const t = useTranslations();

    return (
        <div className="bg-background text-foreground min-h-svh px-4 py-5 sm:px-8 sm:py-8">
            <div className="border-border/80 bg-card mx-auto flex min-h-[calc(100svh-2.5rem)] max-w-6xl overflow-hidden rounded-[1.5rem] border shadow-[0_24px_80px_-32px_rgba(17,81,180,0.35)] sm:min-h-[calc(100svh-4rem)]">
                <aside className="relative hidden w-[42%] overflow-hidden bg-[#0e2f68] p-10 text-white lg:flex lg:flex-col lg:justify-between">
                    <div className="absolute -end-32 -top-32 size-96 rounded-full bg-[#2268c9]/30 blur-3xl" />
                    <div className="relative">
                        <Link href={route('home')} className="inline-flex items-center gap-3">
                            <span className="flex items-center gap-3 text-lg font-semibold">
                                <AppLogoIcon className="size-9" />
                                {t('app.name')}
                            </span>
                        </Link>
                        <div className="mt-24 max-w-sm">
                            <p className="mb-4 text-sm font-medium text-blue-200">{t('auth.eyebrow')}</p>
                            <p className="text-3xl leading-[1.35] font-semibold">{t('auth.brand_message')}</p>
                        </div>
                    </div>
                    <p className="relative text-sm text-blue-100/70">{t('auth.controlled_workspace')}</p>
                </aside>

                <div className="flex w-full flex-col lg:w-[58%]">
                    <div className="flex items-center justify-between px-6 pt-6 sm:px-10 sm:pt-8">
                        <Link href={route('home')} className="lg:hidden">
                            <span className="flex items-center gap-3 text-lg font-semibold">
                                <AppLogoIcon className="size-8" />
                                {t('app.name')}
                            </span>
                        </Link>
                        <div className="ms-auto">
                            <AuthLocaleSwitcher />
                        </div>
                    </div>
                    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-10 sm:px-10">
                        <div className="mb-8">
                            <p className="text-primary mb-3 text-sm font-medium">{t('app.name')}</p>
                            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
                            <p className="text-muted-foreground mt-2 text-sm leading-7">{description}</p>
                        </div>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
