"use client";

import { ChevronDown, ChevronUp, Plus, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { KeyIcon } from "@/features/catalog/components/fields/choice-tiles";
import { PictureThumb } from "@/features/catalog/components/fields/picture-thumb";
import { cn } from "@/lib/utils";

/** What the form knows about the row being placed: its name and icon or picture so far, and a name it clashes with. */
export interface SpotContext {
  readonly title: string;
  readonly iconKey?: string;
  readonly icons?: readonly string[];
  /** Set when the rows have pictures rather than icons: its own, then the others top to bottom. */
  readonly image?: string;
  readonly images?: readonly string[];
  readonly clash?: string;
}

/** The spot a value names among `count` others, 0 for the first; empty is the end. */
export function spotIndex(value: unknown, count: number): number {
  const at = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : count;
  return Number.isFinite(at) ? Math.min(Math.max(Math.trunc(at), 0), count) : count;
}

interface SpotListProps extends SpotContext {
  /** The other rows of the list, top to bottom. */
  readonly places: readonly string[];
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly editing?: boolean;
  readonly labelledBy?: string;
  readonly describedBy?: string;
}

/** The list shown once, with the row being placed in it; click between two rows to move it there. */
export function SpotList({ places, value, onChange, title, iconKey, icons, image, images, clash, editing = false, labelledBy, describedBy }: SpotListProps) {
  const t = useTranslations("forms.spots");
  const at = spotIndex(value, places.length);
  const move = (to: number) => onChange(String(to));

  /* A thin target over the seam between two rows: shown on hover or keyboard focus. */
  const gap = (spot: number, edge: "top" | "bottom") => (
    <button
      aria-label={spot === 0 ? t("first", { name: places[0] }) : t("after", { name: places[spot - 1] })}
      className={cn(
        "absolute inset-x-0 z-10 flex h-3 items-center gap-2 px-2 text-2xs font-medium text-teal opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100",
        edge === "top" ? "-top-2" : "-bottom-2",
      )}
      onClick={() => move(spot)}
      type="button"
    >
      <span className="flex-1 border-t border-dashed border-teal" />
      <span className="flex items-center gap-1 rounded-full bg-paper px-1.5 ring-1 ring-teal">
        <Plus aria-hidden className="size-3" />
        {t("here")}
      </span>
      <span className="flex-1 border-t border-dashed border-teal" />
    </button>
  );

  const own = (
    <li className="flex items-center gap-2.5 rounded-md border border-teal bg-teal-soft/50 px-2.5 py-1.5 ring-1 ring-teal" key="own">
      <span className="w-5 text-right text-xs font-semibold text-teal tabular-nums">{at + 1}</span>
      {images ? <PictureThumb className="size-5" src={image} /> : <KeyIcon aria-hidden className="size-4 shrink-0 text-teal" iconKey={iconKey} strokeWidth={1.75} />}
      <span className={cn("min-w-0 flex-1 truncate text-sm font-medium", title ? "text-ink" : "text-muted italic")}>{title || t("itsName")}</span>
      <span className="rounded-full bg-teal px-1.5 py-px text-2xs font-semibold text-white">{editing ? t("thisOne") : t("new")}</span>
      <span className="flex items-center">
        <button aria-label={t("up")} className="grid size-6 place-items-center rounded text-ink-soft hover:bg-paper disabled:opacity-30" disabled={at === 0} onClick={() => move(at - 1)} type="button">
          <ChevronUp aria-hidden className="size-4" />
        </button>
        <button aria-label={t("down")} className="grid size-6 place-items-center rounded text-ink-soft hover:bg-paper disabled:opacity-30" disabled={at === places.length} onClick={() => move(at + 1)} type="button">
          <ChevronDown aria-hidden className="size-4" />
        </button>
      </span>
    </li>
  );

  const items = [];
  for (let spot = 0; spot < places.length; spot++) {
    if (spot === at) items.push(own);
    const name = places[spot];
    const last = spot === places.length - 1;
    items.push(
      <li
        className={cn("relative flex items-center gap-2.5 rounded-md border px-2.5 py-1.5", name === clash ? "border-heritage/40 bg-heritage-soft" : "border-transparent bg-sand/60")}
        key={`row-${spot}`}
      >
        {spot !== at ? gap(spot, "top") : null}
        <span className="w-5 text-right text-xs text-muted tabular-nums">{spot < at ? spot + 1 : spot + 2}</span>
        {images ? <PictureThumb className="size-5" src={images[spot]} /> : <KeyIcon aria-hidden className="size-4 shrink-0 text-muted" iconKey={icons?.[spot]} strokeWidth={1.75} />}
        <span className={cn("min-w-0 flex-1 truncate text-sm", name === clash ? "font-medium text-heritage" : "text-ink-soft")}>{name}</span>
        {last && at !== places.length ? gap(places.length, "bottom") : null}
      </li>,
    );
  }
  if (at === places.length) items.push(own);

  return (
    <div className="flex flex-col gap-1.5">
      <ol aria-describedby={describedBy} aria-labelledby={labelledBy} className="flex flex-col gap-1 py-1">
        {items}
      </ol>
      {clash ? (
        <p className="flex items-center gap-1 text-xs font-medium text-heritage" role="status">
          <TriangleAlert aria-hidden className="size-3.5 shrink-0" />
          {t("clash", { clash })}
        </p>
      ) : null}
    </div>
  );
}
