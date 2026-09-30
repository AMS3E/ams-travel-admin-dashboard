"use client";

import { useSyncExternalStore } from "react";

/**
 * Whether a media query matches, kept in step with the window.
 *
 * The server has no window, so it answers `false`; the first client render
 * after hydration corrects it.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
