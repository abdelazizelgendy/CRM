export const locales = ["ar", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ar";
export const localeCookie = "madar_locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && locales.includes(value as Locale);
}

export function localeDirection(locale: Locale) {
  return locale === "ar" ? "rtl" : "ltr";
}

export function localeTag(locale: Locale) {
  return locale === "ar" ? "ar-SA" : "en-US";
}

export function localizedName(locale: Locale, value: { name_ar?: string | null; name_en?: string | null; name?: string | null }) {
  return locale === "en"
    ? value.name_en || value.name_ar || value.name || "—"
    : value.name_ar || value.name || value.name_en || "—";
}
