"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, CornerDownRight, Loader2, Pencil, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import type { CatalogRecord } from "@/features/catalog/api/contracts";
import type { ReferenceOption } from "@/features/catalog/resource";
import { datesOf, Entry, text, type EntryDraft, type Period } from "@/features/heritage/components/coverage-fields";
import { cn } from "@/lib/utils";

/** The small buttons a row asks with. */
const ASK = "h-6 px-2 text-2xs";

interface CoverageListProps {
  /** The region's other entries, top to bottom. */
  readonly others: readonly CatalogRecord[];
  /** The one being written, and where it stands among them (0 for the first). */
  readonly draft: EntryDraft;
  readonly at: number;
  readonly onPlace: (place: number) => void;
  readonly periods: readonly Period[];
  readonly sites: readonly ReferenceOption[];
  readonly regionName: string;
  /** What one is called: "capital" or "entry". */
  readonly label: string;
  readonly canEdit: boolean;
  /** Opens another entry to work on instead. */
  readonly onOpen?: (id: string) => void;
  /** The one being written has changes that opening another would lose, so Edit asks first. */
  readonly openLosesChanges?: boolean;
  /** Deletes another entry, by its id and its number on the page (0 for the first); only for those who may delete. */
  readonly onDelete?: (id: string, index: number) => Promise<void>;
}

/**
 * A region's Historical coverage as the website numbers it, with the entry
 * being written in its place: moved up or down, or put in another's place.
 * Every other entry can be opened to edit, or deleted after a second click.
 */
export function CoverageList({ others, draft, at, onPlace, periods, sites, regionName, label, canEdit, onOpen, openLosesChanges = false, onDelete }: CoverageListProps) {
  /* The row asking before it deletes, or before Edit leaves unsaved changes. */
  const [asking, setAsking] = useState<{ readonly id: string; readonly what: "delete" | "leave" } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function remove(id: string, index: number) {
    if (!onDelete) return;
    setDeleting(id);
    try {
      await onDelete(id, index);
    } finally {
      setDeleting(null);
      setAsking(null);
    }
  }

  const periodName = periods.find((period) => period.id === draft.periodId)?.name;
  const site = sites.find((option) => option.value === draft.siteId);
  return (
    <ol aria-label={`${regionName}'s Historical coverage`} className="divide-y divide-line">
      {[...others.slice(0, at), null, ...others.slice(at)].map((entry, index) =>
        entry === null ? (
          <li className="bg-teal-soft/40 px-4 py-3 ring-1 ring-teal ring-inset" data-this key="this">
            <Entry
              dates={datesOf(draft)}
              description={draft.description}
              number={at + 1}
              period={periodName}
              site={site?.label}
              title={draft.title || "Its name"}
              titleKm={draft.titleKm}
            />
            <div className="mt-2 flex items-center gap-1 pl-9">
              <span className="mr-1 text-2xs font-semibold tracking-wide text-teal-deep uppercase">
                This {label} · No. {at + 1}
              </span>
              <Button aria-label="Move it up" disabled={at === 0 || !canEdit} onClick={() => onPlace(at - 1)} size="icon-sm" type="button" variant="ghost">
                <ArrowUp aria-hidden className="size-4" />
              </Button>
              <Button aria-label="Move it down" disabled={at >= others.length || !canEdit} onClick={() => onPlace(at + 1)} size="icon-sm" type="button" variant="ghost">
                <ArrowDown aria-hidden className="size-4" />
              </Button>
            </div>
          </li>
        ) : (
          <li className="px-4 py-2.5" key={entry.id}>
            <Entry
              dates={text(entry.dateRange)}
              description={text(entry.description)}
              faint
              number={index + 1}
              period={text(entry.historicalPeriodName)}
              site={text(entry.destinationName)}
              title={text(entry.title)}
              titleKm={text(entry.titleKm)}
            />
            {canEdit && asking?.id === entry.id ? (
              <div className="mt-1.5 ml-9 flex flex-wrap items-center gap-1.5" role="group">
                <span className="w-full text-2xs font-medium text-ink-soft">
                  {asking.what === "delete" ? `Delete No. ${index + 1}, ${text(entry.title)}?` : `Open No. ${index + 1} without saving this ${label}?`}
                </span>
                {asking.what === "delete" ? (
                  <button
                    className={cn(buttonVariants({ variant: "destructive", size: "sm" }), ASK)}
                    disabled={deleting === entry.id}
                    onClick={() => void remove(entry.id, index)}
                    type="button"
                  >
                    {deleting === entry.id ? <Loader2 aria-hidden className="size-3 animate-spin" /> : null}
                    Yes, delete
                  </button>
                ) : (
                  <button
                    className={cn(buttonVariants({ size: "sm" }), ASK)}
                    onClick={() => {
                      setAsking(null);
                      onOpen?.(entry.id);
                    }}
                    type="button"
                  >
                    Open it
                  </button>
                )}
                <button
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }), ASK)}
                  disabled={deleting === entry.id}
                  onClick={() => setAsking(null)}
                  type="button"
                >
                  {asking.what === "delete" ? "Keep it" : "Stay here"}
                </button>
              </div>
            ) : canEdit ? (
              <div className="mt-1 ml-9 flex flex-wrap items-center gap-x-3 gap-y-1">
                {/* Takes this entry's number; it moves one down or up to make room. */}
                <button
                  aria-label={`Make it number ${index + 1}, in place of ${text(entry.title)}`}
                  className="flex items-center gap-1 text-2xs font-medium text-teal-deep hover:underline"
                  onClick={() => onPlace(index)}
                  type="button"
                >
                  <CornerDownRight aria-hidden className="size-3" />
                  Put it here, No. {index + 1}
                </button>
                {onOpen ? (
                  <button
                    aria-label={`Edit No. ${index + 1}, ${text(entry.title)}`}
                    className="flex items-center gap-1 text-2xs font-medium text-ink-soft hover:text-ink hover:underline"
                    onClick={() => (openLosesChanges ? setAsking({ id: entry.id, what: "leave" }) : onOpen(entry.id))}
                    type="button"
                  >
                    <Pencil aria-hidden className="size-3" />
                    Edit
                  </button>
                ) : null}
                {onDelete ? (
                  <button
                    aria-label={`Delete No. ${index + 1}, ${text(entry.title)}`}
                    className="flex items-center gap-1 text-2xs font-medium text-heritage hover:underline"
                    onClick={() => setAsking({ id: entry.id, what: "delete" })}
                    type="button"
                  >
                    <Trash2 aria-hidden className="size-3" />
                    Delete
                  </button>
                ) : null}
              </div>
            ) : null}
          </li>
        ),
      )}
    </ol>
  );
}
