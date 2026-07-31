import { type SharedData, type TranslationCatalogue } from '@/types';
import { usePage } from '@inertiajs/react';

export function translate(catalogue: TranslationCatalogue, key: string): string {
    const value = key.split('.').reduce<string | TranslationCatalogue | undefined>((current, part) => {
        if (!current || typeof current === 'string') {
            return undefined;
        }

        return current[part];
    }, catalogue);

    return typeof value === 'string' ? value : key;
}

export function useTranslations() {
    const { translations } = usePage<SharedData>().props;

    return (key: string) => translate(translations, key);
}
