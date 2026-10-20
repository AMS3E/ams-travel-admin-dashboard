"use client";

import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PagerProps {
  /** The page shown, counted from 0. */
  readonly page: number;
  readonly pageCount: number;
  readonly onPage: (page: number) => void;
  /** A page is loading: both steps wait for it. */
  readonly busy?: boolean;
}

/** Previous and Next under a table, with where the reader is in between. */
export function Pager({ page, pageCount, onPage, busy = false }: PagerProps) {
  const t = useTranslations("common.pagination");

  return (
    <nav aria-label={t("label")} className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5">
      <p className="text-xs text-muted tabular-nums">{t("pageOf", { page: page + 1, count: Math.max(pageCount, 1) })}</p>
      <div className="flex gap-2">
        <Button disabled={busy || page <= 0} onClick={() => onPage(page - 1)} size="sm" variant="secondary">
          <ChevronLeft aria-hidden className="size-4" />
          {t("previous")}
        </Button>
        <Button disabled={busy || page >= pageCount - 1} onClick={() => onPage(page + 1)} size="sm" variant="secondary">
          {t("next")}
          <ChevronRight aria-hidden className="size-4" />
        </Button>
      </div>
    </nav>
  );
}
