"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, TriangleAlert } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CatalogRecord } from "@/features/catalog/api/contracts";
import type { ReferenceOption } from "@/features/catalog/resource";
import {
  composeDates,
  datesProblem,
  firstYear,
  NO_DATES,
  parseDates,
  periodFor,
  type DateParts,
  type Era,
} from "@/features/heritage/coverage-dates";
import { cn } from "@/lib/utils";

/*
 * One entry of a region's Historical coverage — a royal capital on Ancient
 * Capitals' page, a port or a kingdom on another's — as its form holds it,
 * and the fields that fill it. The one-page capital form and the step-by-step
 * region builder both use these.
 */

export const text = (value: unknown) => (typeof value === "string" ? value : "");
/** A line a card can hold before it wraps to a third line on the page. */
const DESCRIPTION_AIM = 180;

export interface Period {
  readonly id: string;
  readonly name: string;
  readonly startYear: number | null;
  readonly endYear: number | null;
}

/** The historical periods, oldest first, from their rows. */
export function periodsOf(rows: readonly CatalogRecord[]): Period[] {
  return rows
    .map((row) => ({
      id: row.id,
      name: text(row.name),
      startYear: typeof row.startYear === "number" ? row.startYear : null,
      endYear: typeof row.endYear === "number" ? row.endYear : null,
    }))
    .toSorted((a, b) => (a.startYear ?? -99999) - (b.startYear ?? -99999));
}

export interface EntryDraft {
  readonly title: string;
  readonly titleKm: string;
  readonly dates: DateParts;
  /** Dates written some other way, kept as they are until years replace them. */
  readonly handWritten: string;
  readonly periodId: string;
  /** Picked by hand, so it no longer follows the first year. */
  readonly periodChosen: boolean;
  readonly description: string;
  readonly siteId: string;
}

export function draftFrom(record: CatalogRecord | null | undefined): EntryDraft {
  const written = text(record?.dateRange);
  const parsed = parseDates(written);
  return {
    title: text(record?.title),
    titleKm: text(record?.titleKm),
    dates: parsed ?? NO_DATES,
    handWritten: parsed ? "" : written,
    periodId: text(record?.historicalPeriodId),
    periodChosen: Boolean(record?.historicalPeriodId),
    description: text(record?.description),
    siteId: text(record?.destinationId),
  };
}

/** The dates as the page prints them. */
export const datesOf = (draft: EntryDraft) => composeDates(draft.dates) || draft.handWritten;

/** The fields the API keeps, from the draft. */
export function valuesOf(draft: EntryDraft) {
  return {
    title: draft.title,
    titleKm: draft.titleKm,
    dateRange: datesOf(draft),
    historicalPeriodId: draft.periodId,
    description: draft.description,
    destinationId: draft.siteId,
  };
}

/** Why the draft cannot be saved yet, or null. */
export function draftProblem(draft: EntryDraft, noun: string): string | null {
  if (!draft.title.trim()) return `Give the ${noun} its name.`;
  return datesProblem(draft.dates);
}

/** Nothing typed yet: a new step left blank is simply not saved. */
export function isBlank(draft: EntryDraft): boolean {
  return !draft.title.trim() && !draft.titleKm.trim() && !datesOf(draft) && !draft.description.trim() && !draft.siteId;
}

/** Same content, so there is nothing to save. */
export function sameDraft(a: EntryDraft, b: EntryDraft): boolean {
  return JSON.stringify(valuesOf(a)) === JSON.stringify(valuesOf(b));
}

interface EntryFieldsProps {
  readonly draft: EntryDraft;
  readonly onChange: (draft: EntryDraft) => void;
  readonly periods: readonly Period[];
  readonly sites: readonly ReferenceOption[];
  /** Save was tried, so a missing name shows its message. */
  readonly tried: boolean;
  /** Another entry of the region with the same name, to open instead. */
  readonly duplicate?: { readonly title: string; readonly href: string } | null;
  readonly regionName: string;
  /** Ancient Capitals' entries are royal capitals; other regions' are steps of their story. */
  readonly capital: boolean;
  readonly autoFocus?: boolean;
}

/** The entry's four parts, in the order the website prints them: name, when, story, the site it opens. */
export function EntryFields({ draft, onChange, periods, sites, tried, duplicate, regionName, capital, autoFocus = false }: EntryFieldsProps) {
  const set = (patch: Partial<EntryDraft>) => onChange({ ...draft, ...patch });
  const noun = capital ? "capital" : "entry";
  const shownDates = datesOf(draft);
  const problem = datesProblem(draft.dates);
  const site = sites.find((option) => option.value === draft.siteId);

  /* The era follows the first year until one is chosen by hand. */
  function changeDates(dates: DateParts) {
    const found = draft.periodChosen ? null : periodFor(firstYear(dates), periods);
    set({ dates, ...(found ? { periodId: found } : {}) });
  }

  return (
    <>
      <Part
        hint={capital ? "The city, not one of its temples: “Yasodharapura”, not “Angkor Wat”." : "What this part of the region's story is called — a town, a kingdom, a port, an era."}
        title="Its name"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field error={tried && !draft.title.trim() ? `Give the ${noun} its name.` : undefined} hint={capital ? "For example: Yasodharapura." : "For example: Kampot port town."} label="Name" required>
            {(id) => <Input autoFocus={autoFocus} id={id} maxLength={150} onChange={(event) => set({ title: event.target.value })} value={draft.title} />}
          </Field>
          <Field hint={capital ? "For example: យសោធរបុរី." : "The same name in Khmer, if it has one."} label="Name in Khmer">
            {(id) => <Input id={id} lang="km" maxLength={150} onChange={(event) => set({ titleKm: event.target.value })} value={draft.titleKm} />}
          </Field>
        </div>
        {duplicate ? (
          <p className="flex items-center gap-1.5 text-xs font-medium text-heritage">
            <TriangleAlert aria-hidden className="size-3.5" />
            {regionName} already has “{duplicate.title}”.{" "}
            <Link className="underline" href={duplicate.href}>
              Open it instead
            </Link>
          </p>
        ) : null}
      </Part>

      <Part hint="Tick about when a year is only known roughly — the page prints c. before it." title={capital ? "When it was the capital" : "When"}>
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          <YearInput
            about={draft.dates.fromAbout}
            label="From"
            onAbout={(fromAbout) => changeDates({ ...draft.dates, fromAbout })}
            onChange={(from) => changeDates({ ...draft.dates, from })}
            value={draft.dates.from}
          />
          <span aria-hidden className="pb-2 text-muted">–</span>
          {draft.dates.present ? (
            <p className="pb-2 text-sm font-medium text-ink-soft">today</p>
          ) : (
            <YearInput
              about={draft.dates.toAbout}
              label="Until"
              onAbout={(toAbout) => changeDates({ ...draft.dates, toAbout })}
              onChange={(to) => changeDates({ ...draft.dates, to })}
              value={draft.dates.to}
            />
          )}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-ink-soft">Era</span>
            <div aria-label="Era" className="flex rounded-md border border-line-strong p-0.5" role="radiogroup">
              {(["CE", "BCE"] as const).map((era: Era) => (
                <button
                  aria-checked={draft.dates.era === era}
                  className={cn("rounded px-3 py-1 text-xs font-medium", draft.dates.era === era ? "bg-teal-soft text-teal-deep" : "text-muted hover:text-ink")}
                  key={era}
                  onClick={() => changeDates({ ...draft.dates, era })}
                  role="radio"
                  type="button"
                >
                  {era}
                </button>
              ))}
            </div>
          </div>
        </div>
        <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-ink-soft">
          <Checkbox checked={draft.dates.present} onChange={(event) => changeDates({ ...draft.dates, present: event.target.checked })} />
          {capital ? "Still the capital today" : "Still so today"}
        </label>
        <p className="text-xs text-muted">
          The page prints: <span className="font-semibold text-ink">{shownDates || "no dates yet"}</span>
          {draft.handWritten && !composeDates(draft.dates) ? " (written by hand — fill in the years to replace it)" : ""}
        </p>
        {problem ? <p className="text-xs font-medium text-heritage">{problem}</p> : null}

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-ink-soft">Historical period</span>
          {periods.length ? (
            <div aria-label="Historical period" className="flex flex-wrap gap-2" role="radiogroup">
              {periods.map((period) => (
                <button
                  aria-checked={draft.periodId === period.id}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    draft.periodId === period.id ? "border-teal bg-teal-soft text-teal-deep" : "border-line-strong text-ink-soft hover:bg-sand",
                  )}
                  key={period.id}
                  onClick={() => set({ periodId: draft.periodId === period.id ? "" : period.id, periodChosen: true })}
                  role="radio"
                  type="button"
                >
                  {period.name}
                </button>
              ))}
            </div>
          ) : null}
          <span className="text-xs text-muted">
            {periods.length
              ? draft.periodChosen
                ? "The label beside its dates."
                : "Chosen from its first year; pick another if it belongs elsewhere, or none."
              : "No historical periods yet."}{" "}
            <Link className="font-medium text-teal-deep underline-offset-2 hover:underline" href="/historical-periods/new" target="_blank">
              Add a historical period
            </Link>
          </span>
        </div>
      </Part>

      <Part hint="One or two sentences under its name: what happened there, and what it is remembered for." title="What travellers read">
        <Field hint={`${draft.description.trim().length}/${DESCRIPTION_AIM} — shorter reads best on the page.`} label="Story">
          {(id) => <Textarea id={id} onChange={(event) => set({ description: event.target.value })} rows={3} value={draft.description} />}
        </Field>
      </Part>

      <Part hint="Where its View details link takes travellers. An entry with no page of its own has no link." title="The place it opens">
        <Field label="View details opens">
          {(id) => (
            <Select id={id} onChange={(event) => set({ siteId: event.target.value })} value={draft.siteId}>
              <option value="">No page — no View details link</option>
              {sites.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                  {option.detail ? ` (${option.detail.toLowerCase()})` : ""}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {site?.detail ? (
          <p className="flex items-center gap-1.5 text-xs font-medium text-heritage">
            <TriangleAlert aria-hidden className="size-3.5" />
            {site.label} is a draft: travellers cannot open it until it is published.
          </p>
        ) : null}
      </Part>
    </>
  );
}

/** One part of the form: what it asks, a line on how to answer, then its fields. */
export function Part({ title, hint, children }: { readonly title: string; readonly hint: string; readonly children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-3 px-5 py-4">
      <div>
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="text-xs text-muted">{hint}</p>
      </div>
      {children}
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  readonly label: string;
  readonly hint?: string;
  readonly error?: string;
  readonly required?: boolean;
  readonly children: (id: string) => ReactNode;
}) {
  const id = `coverage-${label.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label className="text-xs font-medium text-ink-soft" htmlFor={id}>
        {label}
        {required ? <span aria-hidden className="ml-0.5 text-heritage">*</span> : null}
      </label>
      {children(id)}
      {error ? (
        <p className="text-xs font-medium text-heritage" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

function YearInput({
  label,
  value,
  about,
  onChange,
  onAbout,
}: {
  readonly label: string;
  readonly value: string;
  readonly about: boolean;
  readonly onChange: (value: string) => void;
  readonly onAbout: (about: boolean) => void;
}) {
  const id = `coverage-year-${label.toLowerCase()}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-ink-soft" htmlFor={id}>
        {label}
      </label>
      <div className="flex items-center gap-2">
        <Input
          className="w-24"
          id={id}
          inputMode="numeric"
          onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="Year"
          value={value}
        />
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-ink-soft">
          <Checkbox checked={about} onChange={(event) => onAbout(event.target.checked)} />
          about
        </label>
      </div>
    </div>
  );
}

/** One entry as the page shows it. */
export function Entry({
  number,
  dates,
  period,
  title,
  titleKm,
  description,
  site,
  faint = false,
}: {
  readonly number: number;
  readonly dates: string;
  readonly period?: string;
  readonly title: string;
  readonly titleKm: string;
  readonly description: string;
  readonly site?: string;
  readonly faint?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-2xs font-semibold", faint ? "bg-sand text-muted" : "bg-teal text-white")}>
        {number}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-1.5 text-2xs font-semibold text-ink-soft">
          {dates || <span className="font-normal text-muted">Its dates</span>}
          {period ? <span className="rounded-full bg-teal-soft px-1.5 py-0.5 text-2xs font-medium text-teal-deep">{period}</span> : null}
        </p>
        <p className={cn("text-sm font-semibold", faint ? "text-ink-soft" : "text-ink")}>
          {title}
          {titleKm ? <span className="ml-1.5 text-xs font-normal text-muted">{titleKm}</span> : null}
        </p>
        {!faint || description ? (
          <p className={cn("text-xs", faint ? "line-clamp-1 text-muted" : "text-ink-soft")}>{description || "Its line for travellers."}</p>
        ) : null}
        {site ? (
          <p className="mt-0.5 flex items-center text-2xs font-semibold text-teal-deep">
            View details <ChevronRight aria-hidden className="size-3" />
          </p>
        ) : null}
      </div>
    </div>
  );
}
