interface AppLayoutProps {
    children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
    return (
        <div className="bg-background text-foreground min-h-svh px-3 py-3 sm:px-5 sm:py-5">
            <main className="mx-auto flex min-h-[calc(100svh-1.5rem)] w-full max-w-[1600px] flex-col sm:min-h-[calc(100svh-2.5rem)]">{children}</main>
        </div>
    );
}
