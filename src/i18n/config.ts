/** The dashboard's languages: English first, which also fills any text Khmer has not got yet. */
export const LOCALES = ["en", "km"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/** The cookie the chosen language is remembered in; next-intl's own name for it. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** One JSON file per namespace in `public/locales/{locale}/`: shared words, then one per feature. */
export const NAMESPACES = [
  "common", "shell", "auth", "errors", "audit", "dashboard", "publishing",
  "resources", "forms", "catalog", "corridors", "people", "profile", "verification", "stats", "cms",
] as const;
export type Namespace = (typeof NAMESPACES)[number];

/** How each language names itself in the switch. */
export const LOCALE_NAMES: Readonly<Record<Locale, string>> = { en: "English", km: "ខ្មែរ" };

/** The back office works in Cambodian time, whichever language it reads in. */
export const TIME_ZONE = "Asia/Phnom_Penh";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
