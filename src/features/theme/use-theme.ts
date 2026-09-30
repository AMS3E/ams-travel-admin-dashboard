"use client";

import { useSyncExternalStore } from "react";
import {
  chooseTheme,
  currentChoice,
  currentTheme,
  subscribeToTheme,
  type ResolvedTheme,
  type ThemeChoice,
} from "@/features/theme/theme";

const serverChoice = (): ThemeChoice => "system";
const serverTheme = (): ResolvedTheme => "light";

/**
 * The theme chosen and the theme drawn, kept in step with <html>. The server
 * renders System; the browser corrects it after hydration without a mismatch.
 */
export function useTheme(): { readonly choice: ThemeChoice; readonly theme: ResolvedTheme; readonly setChoice: (choice: ThemeChoice) => void } {
  const choice = useSyncExternalStore(subscribeToTheme, currentChoice, serverChoice);
  const theme = useSyncExternalStore(subscribeToTheme, currentTheme, serverTheme);
  return { choice, theme, setChoice: chooseTheme };
}
