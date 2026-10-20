import type audit from "@locales/en/audit.json";
import type auth from "@locales/en/auth.json";
import type common from "@locales/en/common.json";
import type dashboard from "@locales/en/dashboard.json";
import type errors from "@locales/en/errors.json";
import type publishing from "@locales/en/publishing.json";
import type shell from "@locales/en/shell.json";
import type resources from "@locales/en/resources.json";
import type forms from "@locales/en/forms.json";
import type catalog from "@locales/en/catalog.json";
import type corridors from "@locales/en/corridors.json";
import type people from "@locales/en/people.json";
import type profile from "@locales/en/profile.json";
import type verification from "@locales/en/verification.json";
import type stats from "@locales/en/stats.json";
import type cms from "@locales/en/cms.json";
import type { Locale } from "@/i18n/config";

/* English is the reference: every key used in code must exist there; tests/locales.test.mjs keeps Khmer in step. */
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: {
      audit: typeof audit;
      auth: typeof auth;
      common: typeof common;
      dashboard: typeof dashboard;
      errors: typeof errors;
      publishing: typeof publishing;
      shell: typeof shell;
      resources: typeof resources;
      forms: typeof forms;
      catalog: typeof catalog;
      corridors: typeof corridors;
      people: typeof people;
      profile: typeof profile;
      verification: typeof verification;
      stats: typeof stats;
      cms: typeof cms;
    };
  }
}
