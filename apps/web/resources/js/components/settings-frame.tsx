import { Button } from '@/components/ui/button';
import { ConversationRail } from '@/components/workspace-shell';
import { useTranslations } from '@/hooks/use-translations';
import { cn } from '@/lib/utils';
import { Link, router, usePage } from '@inertiajs/react';

const settingsItems = [
    { key: 'settings.profile', url: '/settings/profile' },
    { key: 'settings.password', url: '/settings/password' },
    { key: 'settings.appearance', url: '/settings/appearance' },
] as const;

export default function SettingsFrame({ children }: { children: React.ReactNode }) {
    const t = useTranslations();
    const { url } = usePage();

    return (
        <div className="bg-card border-border/80 flex min-h-0 flex-1 overflow-hidden rounded-2xl border shadow-[0_16px_50px_-36px_rgba(17,81,180,0.55)]">
            <ConversationRail conversations={[]} selectedId={null} onSelect={() => router.visit('/workspace')} onNew={() => router.visit('/workspace')} collapsed={false} onToggle={() => undefined} />
            <main className="min-w-0 flex-1 overflow-y-auto">
                <div className="mx-auto w-full max-w-4xl px-6 py-8 sm:px-10 sm:py-10">
                    <div className="border-border/80 mb-9 border-b pb-7">
                        <p className="text-primary mb-2 text-sm font-medium">{t('settings.eyebrow')}</p>
                        <h1 className="text-2xl font-semibold tracking-tight">{t('settings.settings')}</h1>
                        <p className="text-muted-foreground mt-2 text-sm leading-7">{t('settings.description')}</p>
                    </div>
                    <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
                        <nav className="flex shrink-0 gap-1 overflow-x-auto lg:w-44 lg:flex-col">
                            {settingsItems.map((item) => (
                                <Button
                                    key={item.url}
                                    size="sm"
                                    variant="ghost"
                                    asChild
                                    className={cn(
                                        'shrink-0 justify-start rounded-lg px-3 text-start',
                                        url === item.url && 'bg-accent text-accent-foreground',
                                    )}
                                >
                                    <Link href={item.url} prefetch>
                                        {t(item.key)}
                                    </Link>
                                </Button>
                            ))}
                        </nav>
                        <div className="max-w-2xl min-w-0 flex-1">{children}</div>
                    </div>
                </div>
            </main>
        </div>
    );
}
