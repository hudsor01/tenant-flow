export const defaultLocale = 'en' as const;
export const locales = ['en', 'es', 'fr', 'de'] as const;

export type Locale = typeof locales[number];

// Locale configurations
export const localeConfig = {
  en: {
    name: 'English',
    flag: '🇺🇸',
    dir: 'ltr',
    currency: 'USD',
    dateFormat: 'MM/dd/yyyy',
    numberFormat: 'en-US',
  },
  es: {
    name: 'Español',
    flag: '🇪🇸',
    dir: 'ltr',
    currency: 'EUR',
    dateFormat: 'dd/MM/yyyy',
    numberFormat: 'es-ES',
  },
  fr: {
    name: 'Français',
    flag: '🇫🇷',
    dir: 'ltr',
    currency: 'EUR',
    dateFormat: 'dd/MM/yyyy',
    numberFormat: 'fr-FR',
  },
  de: {
    name: 'Deutsch',
    flag: '🇩🇪',
    dir: 'ltr',
    currency: 'EUR',
    dateFormat: 'dd.MM.yyyy',
    numberFormat: 'de-DE',
  },
} as const;

export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}