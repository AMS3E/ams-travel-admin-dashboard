import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE, NAMESPACES, TIME_ZONE, isLocale, type Locale, type Namespace } from "@/i18n/config";

type Tree = { [key: string]: string | Tree };
type Loader = () => Promise<{ default: unknown }>;

/*
 * Every file named outright: a path built from two variables resolves on one
 * bundler and not another (it broke the Linux image build). The type keeps
 * the list complete for every language and namespace.
 */
const FILES: Readonly<Record<Locale, Readonly<Record<Namespace, Loader>>>> = {
  en: {
    common: () => import("@locales/en/common.json"),
    shell: () => import("@locales/en/shell.json"),
    auth: () => import("@locales/en/auth.json"),
    errors: () => import("@locales/en/errors.json"),
    audit: () => import("@locales/en/audit.json"),
    dashboard: () => import("@locales/en/dashboard.json"),
    publishing: () => import("@locales/en/publishing.json"),
    resources: () => import("@locales/en/resources.json"),
    forms: () => import("@locales/en/forms.json"),
    catalog: () => import("@locales/en/catalog.json"),
    corridors: () => import("@locales/en/corridors.json"),
    people: () => import("@locales/en/people.json"),
    profile: () => import("@locales/en/profile.json"),
    verification: () => import("@locales/en/verification.json"),
    stats: () => import("@locales/en/stats.json"),
    cms: () => import("@locales/en/cms.json"),
  },
  km: {
    common: () => import("@locales/km/common.json"),
    shell: () => import("@locales/km/shell.json"),
    auth: () => import("@locales/km/auth.json"),
    errors: () => import("@locales/km/errors.json"),
    audit: () => import("@locales/km/audit.json"),
    dashboard: () => import("@locales/km/dashboard.json"),
    publishing: () => import("@locales/km/publishing.json"),
    resources: () => import("@locales/km/resources.json"),
    forms: () => import("@locales/km/forms.json"),
    catalog: () => import("@locales/km/catalog.json"),
    corridors: () => import("@locales/km/corridors.json"),
    people: () => import("@locales/km/people.json"),
    profile: () => import("@locales/km/profile.json"),
    verification: () => import("@locales/km/verification.json"),
    stats: () => import("@locales/km/stats.json"),
    cms: () => import("@locales/km/cms.json"),
  },
};

async function load(locale: Locale): Promise<Tree> {
  const files = await Promise.all(NAMESPACES.map(async (namespace) => [namespace, (await FILES[locale][namespace]()).default as Tree] as const));
  return Object.fromEntries(files);
}

/** The chosen language over English, so a text Khmer has not got yet shows in English rather than as its key. */
function over(base: Tree, chosen: Tree): Tree {
  const merged: Tree = { ...base };
  for (const [key, value] of Object.entries(chosen)) {
    const under = merged[key];
    merged[key] = typeof value === "object" && typeof under === "object" ? over(under, value) : value;
  }
  return merged;
}

/** The language comes from the cookie the switch sets; URLs stay the same in both. */
export default getRequestConfig(async () => {
  const chosen = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale: Locale = isLocale(chosen) ? chosen : DEFAULT_LOCALE;
  const english = await load(DEFAULT_LOCALE);
  return {
    locale,
    messages: locale === DEFAULT_LOCALE ? english : over(english, await load(locale)),
    timeZone: TIME_ZONE,
  };
});
