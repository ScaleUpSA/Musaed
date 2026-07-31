export default function HeadingSmall({ title, description }: { title: string; description?: string }) {
    return (
        <header>
            <h2 className="mb-1 text-lg font-semibold tracking-tight">{title}</h2>
            {description && <p className="text-muted-foreground text-sm leading-7">{description}</p>}
        </header>
    );
}
