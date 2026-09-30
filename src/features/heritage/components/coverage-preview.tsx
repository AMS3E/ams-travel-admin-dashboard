"use client";

import { ChevronRight, Landmark } from "lucide-react";

interface CoveragePreviewProps {
  /** Its number on the page, from 1. */
  readonly position: number;
  readonly title: string;
  readonly titleKm: string;
  readonly dateRange: string;
  readonly periodName?: string;
  readonly description: string;
  /** The site its View details opens, if any. */
  readonly siteName?: string;
}

/**
 * One capital as the region's Historical coverage shows it on the website:
 * its number, dates and era, its name beside the Khmer, a line, and View
 * details when it has a site to open.
 */
export function CoveragePreview({ position, title, titleKm, dateRange, periodName, description, siteName }: CoveragePreviewProps) {
  return (
    <div className="rounded-lg border border-line bg-paper px-4 py-4">
      <p className="mb-3 flex items-center gap-2 text-xs font-medium text-muted">
        <Landmark aria-hidden className="size-3.5" />
        On the website, under Historical coverage
      </p>
      <div className="flex gap-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-sand text-xs font-semibold text-ink-soft">{position}</span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-soft">
            {dateRange || <span className="font-normal text-muted">Its dates</span>}
            {periodName ? <span className="rounded-full bg-teal-soft px-2 py-0.5 text-2xs font-medium text-teal-deep">{periodName}</span> : null}
          </p>
          <p className="mt-1 text-base font-semibold text-ink">
            {title || <span className="font-normal text-muted">Its name</span>}
            {titleKm ? <span className="ml-2 text-sm font-normal text-muted">{titleKm}</span> : null}
          </p>
          <p className="mt-1 text-sm text-ink-soft">{description || <span className="text-muted">A line on who ruled there and what it is remembered for.</span>}</p>
          {siteName ? (
            <p className="mt-2 flex items-center gap-0.5 text-xs font-semibold text-teal-deep">
              View details <ChevronRight aria-hidden className="size-3.5" />
              <span className="ml-1 font-normal text-muted">opens {siteName}</span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
