import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
    // This typically corresponds to the `[locale]` segment
    let locale = await requestLocale;

    // Ensure that a valid locale is used
    if (!locale || !routing.locales.includes(locale as any)) {
        locale = routing.defaultLocale;
    }

    const messages = locale === 'th' 
        ? (await import('../messages/th.json')).default
        : (await import('../messages/en.json')).default;

    return {
        locale: locale as string,
        messages
    };
});
