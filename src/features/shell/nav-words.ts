import type { NavGroup, NavText } from "@/features/shell/nav";

/** A translator for `shell.nav`, from `useTranslations` or `getTranslations`. */
type Translate = (key: string, values?: Record<string, string>) => string;

/* A Latin word inside Khmer stands apart: "ការគ្រប់គ្រង BDO", not "ការគ្រប់គ្រងBDO". */
const KHMER_THEN_LATIN = /([ក-៿])([A-Za-z])/g;
const LATIN_THEN_KHMER = /([A-Za-z])([ក-៿])/g;
const spaced = (text: string) => text.replace(KHMER_THEN_LATIN, "$1 $2").replace(LATIN_THEN_KHMER, "$1 $2");

/** The sidebar's words in the chosen language: an entry's name and line, a group's title. */
export function navWords(translate: unknown) {
  const t = translate as Translate;

  /* A desk's entries say which desk: "Partner Requests", "សំណើពីដៃគូ". */
  function values(desk: NavText["desk"]): Record<string, string> {
    if (!desk) return {};
    const name = t(`desks.${desk}.name`);
    return { desk: name, deskLower: name.toLowerCase(), reviewer: t(`desks.${desk}.reviewer`) };
  }

  return {
    label: (text: NavText) => spaced(t(`items.${text.key}.label`, values(text.desk))),
    description: (text: NavText) => spaced(t(`items.${text.key}.description`, values(text.desk))),
    group: (group: Pick<NavGroup, "key" | "desk">) => spaced(t(`groups.${group.key}`, values(group.desk))),
  };
}
