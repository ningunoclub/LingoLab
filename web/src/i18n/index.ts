// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import de from '@/locales/de.json';
import en from '@/locales/en.json';

/**
 * Translation keys are reused verbatim from the legacy SvelteKit app
 * (frontend/src/lib/i18n/locales) so ported routes keep working copy.
 * Upstream ships 34 languages; we carry en + de for now.
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

export const resources = {
  en: { translation: en },
  de: { translation: de },
} as const;

void i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    // Treat "de-CH" and "de-DE" as "de".
    load: 'languageOnly',
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'lingolab-language',
      caches: ['localStorage'],
    },
  });

export default i18next;

/** Dot-notation paths of a nested locale object, e.g. "words.play". */
type DotPaths<T> = T extends string
  ? never
  : {
      [K in keyof T & string]: T[K] extends string ? K : `${K}.${DotPaths<T[K]>}`;
    }[keyof T & string];

/** Every valid translation key of the English locale, for typing key-holding constants. */
export type TranslationKey = DotPaths<typeof en>;
