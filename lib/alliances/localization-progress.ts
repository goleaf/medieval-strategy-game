export type LocaleCode = "en" | "de" | "fr" | "es" | "ar" | "tr" | "zh-Hans";

export const localizationProgress: Record<LocaleCode, boolean> = {
  en: true,
  de: true,
  fr: true,
  es: false,
  ar: false,
  tr: false,
  "zh-Hans": false
};
