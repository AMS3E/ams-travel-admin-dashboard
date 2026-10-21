"use client";

import { useEffect, type RefObject } from "react";
import { useTranslations } from "next-intl";

/** Leaflet's own zoom buttons, titled in the reader's language; call it after the effect that makes the map. */
export function useZoomTitles(container: RefObject<HTMLElement | null>) {
  const t = useTranslations("common.map");
  const zoomIn = t("zoomIn");
  const zoomOut = t("zoomOut");
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    for (const [selector, title] of [[".leaflet-control-zoom-in", zoomIn], [".leaflet-control-zoom-out", zoomOut]] as const) {
      const button = element.querySelector(selector);
      button?.setAttribute("title", title);
      button?.setAttribute("aria-label", title);
    }
  }, [container, zoomIn, zoomOut]);
}
