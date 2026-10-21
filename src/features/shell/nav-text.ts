"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { navWords } from "@/features/shell/nav-words";

/** The sidebar's words in the chosen language, for client components; the server uses `navWords` with `getTranslations`. */
export function useNavText() {
  const t = useTranslations("shell.nav");
  return useMemo(() => navWords(t), [t]);
}
