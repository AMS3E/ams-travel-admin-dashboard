"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Save, ScrollText, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useGetCatalogQuery } from "@/features/catalog/api/catalog-api";
import type {
  DestinationHistoryResponse,
  DestinationMonarchResponse,
  MonarchResponse,
} from "@/features/catalog/api/contracts";
import { QueryState } from "@/features/cms/components/query-state";
import { formatDay } from "@/features/dashboard/format";
import { apiErrorMessage } from "@/store/api/api-error";
import {
  useGetMonarchTiesQuery,
  useGetTimelineQuery,
  useSaveMonarchTiesMutation,
} from "../api/heritage-api";

/** A year as the history pages write it: below zero is BCE. */
function yearText(year: number | null | undefined): string | null {
  if (year == null) return null;
  return year < 0 ? `${-year} BCE` : String(year);
}

function spanText(from: number | null, to: number | null): string | null {
  const start = yearText(from);
  const end = yearText(to);
  if (start && end) return `${start}–${end}`;
  return start ? `from ${start}` : end ? `until ${end}` : null;
}

/** When a timeline moment happened: its year, else its dates. */
function whenText(entry: DestinationHistoryResponse): string {
  const year = yearText(entry.eventYear);
  if (year) return year;
  if (entry.startDate && entry.endDate) return `${formatDay(entry.startDate)} – ${formatDay(entry.endDate)}`;
  if (entry.startDate) return formatDay(entry.startDate);
  return "Undated";
}

/**
 * The eras a place's timeline touches, each once, earliest first: `eras` is
 * the historical periods in start-year order, and a period not found there
 * keeps its place in the timeline.
 */
function periodsOf(
  timeline: readonly DestinationHistoryResponse[],
  eras: readonly { readonly id: string }[],
): { readonly id: string; readonly name: string }[] {
  const named = new Map<string, string>();
  for (const entry of timeline) {
    if (entry.historicalPeriodId && !named.has(entry.historicalPeriodId)) {
      named.set(entry.historicalPeriodId, entry.historicalPeriodName ?? "An unnamed period");
    }
  }
  const rank = new Map(eras.map((era, index) => [era.id, index]));
  return [...named]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => (rank.get(a.id) ?? eras.length) - (rank.get(b.id) ?? eras.length));
}

/**
 * History & heritage, on the destination's own page.
 *
 * The timeline is read here and written row by row under Destination
 * Timelines — each moment is a record of its own. The monarchs, with what
 * this place says about each, are one set, saved together: the API replaces
 * the whole of it, so this edits a copy and sends all of it back. The
 * architecture styles and religions are fields of the destination, set in its
 * form. Rendered only for an account that may edit the destination, which is
 * who the API lets write it.
 */
/**
 * @param ancient an Ancient Capitals & Khmer Civilization site, whose heritage
 *                is its own. Another theme's place shows the panel only when it
 *                already has a timeline or a king, so nothing it holds is hidden.
 */
export function HeritagePanel({ destinationId, ancient = true }: { readonly destinationId: string; readonly ancient?: boolean }) {
  const timeline = useGetTimelineQuery(destinationId);
  const ties = useGetMonarchTiesQuery(destinationId);

  if (!ancient && timeline.data?.length === 0 && ties.data?.length === 0) return null;

  return (
    <section className="flex flex-col gap-4" aria-labelledby="heritage-title">
      <header>
        <p className="text-xs font-medium text-muted">History & heritage</p>
        <h2 className="heading text-lg font-semibold text-ink" id="heritage-title">
          Heritage
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Where this place sits in Cambodia&apos;s history. Its century, kings,
          architecture style, religion and period are chosen in the form above;
          here, what each king did for it, and its timeline.
        </p>
      </header>

      <QueryState
        error={timeline.error ?? ties.error}
        loading={timeline.isLoading || ties.isLoading}
        retry={() => {
          void timeline.refetch();
          void ties.refetch();
        }}
      />

      {timeline.data && ties.data ? (
        <>
          <Timeline destinationId={destinationId} timeline={timeline.data} />
          {/*
            Seeded from the read: a refetch on focus must not wipe unsaved edits,
            but kings the form above has just changed start it again.
          */}
          <MonarchTies
            destinationId={destinationId}
            initial={ties.data}
            key={`${destinationId}:${ties.data.map((tie) => tie.monarchId).join(",")}`}
          />
        </>
      ) : null}
    </section>
  );
}

function Timeline({
  destinationId,
  timeline,
}: {
  readonly destinationId: string;
  readonly timeline: readonly DestinationHistoryResponse[];
}) {
  /* Listed by start year, which orders the periods; until it loads they keep the timeline's order. */
  const eras = useGetCatalogQuery("historical-periods");
  const periods = periodsOf(timeline, eras.data ?? []);

  return (
    <div className="panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-md font-semibold text-ink">Timeline</h3>
          {periods.length ? (
            <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted">
              Periods:
              {periods.map((period) => (
                <Badge key={period.id} tone="active">
                  {period.name}
                </Badge>
              ))}
            </p>
          ) : null}
        </div>
        <Link
          className={buttonVariants({ size: "sm", variant: "secondary" })}
          href={`/destination-histories/new?destinationId=${encodeURIComponent(destinationId)}`}
        >
          <Plus aria-hidden className="size-4" />
          Add a moment
        </Link>
      </div>

      {timeline.length ? (
        <ol className="mt-4 flex flex-col border-l-2 border-line">
          {timeline.map((entry) => (
            <li className="relative py-2.5 pl-5" key={entry.id}>
              <span aria-hidden className="absolute top-4 -left-1.25 size-2 rounded-full bg-teal" />
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="w-24 shrink-0 text-xs font-semibold text-ink-soft tabular-nums">
                  {whenText(entry)}
                </span>
                <Link
                  className="text-sm font-semibold text-ink hover:text-teal hover:underline"
                  href={`/destination-histories/${entry.id}`}
                >
                  {entry.title}
                </Link>
                {entry.historicalPeriodName ? <Badge>{entry.historicalPeriodName}</Badge> : null}
              </div>
              {entry.description ? (
                <p className="mt-1 line-clamp-2 text-sm text-muted sm:pl-27">{entry.description}</p>
              ) : null}
              {entry.sourceReference ? (
                <p className="mt-0.5 truncate text-2xs text-muted sm:pl-27">
                  Source: {entry.sourceReference}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted">
          <ScrollText aria-hidden className="size-4" />
          Nothing is on this destination&apos;s timeline yet.
        </p>
      )}
    </div>
  );
}

interface MonarchTie {
  readonly monarchId: string;
  readonly description: string;
}

function MonarchTies({
  destinationId,
  initial,
}: {
  readonly destinationId: string;
  readonly initial: readonly DestinationMonarchResponse[];
}) {
  const monarchList = useGetCatalogQuery("monarchs");
  const [saveMonarchTies, saving] = useSaveMonarchTiesMutation();

  const [monarchs, setMonarchs] = useState<readonly MonarchTie[]>(() => tiesOf(initial));
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allMonarchs = useMemo(
    () => (monarchList.data ?? []) as unknown as readonly MonarchResponse[],
    [monarchList.data],
  );

  /* Names come from the vocabulary, falling back to what the tie itself said. */
  const monarchById = useMemo(() => {
    const byId = new Map<string, { name: string; title: string | null; reign: string | null }>();
    for (const monarch of initial) {
      byId.set(monarch.monarchId, {
        name: monarch.name,
        title: monarch.title,
        reign: spanText(monarch.reignStartYear, monarch.reignEndYear),
      });
    }
    for (const monarch of allMonarchs) {
      byId.set(monarch.id, {
        name: monarch.name,
        title: monarch.title,
        reign: spanText(monarch.reignStartYear, monarch.reignEndYear),
      });
    }
    return byId;
  }, [initial, allMonarchs]);

  const chosen = new Set(monarchs.map((tie) => tie.monarchId));
  const addable = allMonarchs.filter((monarch) => !chosen.has(monarch.id));

  function updateMonarchs(value: readonly MonarchTie[]) {
    setMonarchs(value);
    setDirty(true);
    setMessage(null);
  }

  async function save() {
    setError(null);
    setMessage(null);
    try {
      const saved = await saveMonarchTies({
        destinationId,
        monarchs: monarchs.map((tie) => ({ monarchId: tie.monarchId, description: tie.description })),
      }).unwrap();
      setMonarchs(tiesOf(saved));
      setDirty(false);
      setMessage("Monarchs saved.");
    } catch (failure) {
      setError(apiErrorMessage(failure));
    }
  }

  return (
    <div className="panel flex flex-col gap-5 p-4">
      <QueryState error={monarchList.error} retry={() => void monarchList.refetch()} />

      <div className="flex flex-col gap-3">
        <h3 className="text-md font-semibold text-ink">Monarchs</h3>
        {monarchs.length ? (
          <ul className="flex flex-col gap-2">
            {monarchs.map((tie, index) => {
              const monarch = monarchById.get(tie.monarchId);
              const inputId = `heritage-monarch-${tie.monarchId}`;
              return (
                <li className="flex flex-col gap-2 rounded-lg border border-line p-3 sm:flex-row sm:items-start" key={tie.monarchId}>
                  <div className="min-w-0 sm:w-56 sm:shrink-0">
                    <p className="truncate text-sm font-semibold text-ink">
                      {monarch?.name ?? "An unknown monarch"}
                    </p>
                    <p className="truncate text-2xs text-muted">
                      {[monarch?.title, monarch?.reign].filter(Boolean).join(" · ") || " "}
                    </p>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Label className="sr-only" htmlFor={inputId}>
                      What this place says about {monarch?.name ?? "this monarch"}
                    </Label>
                    <Input
                      id={inputId}
                      onChange={(event) =>
                        updateMonarchs(
                          monarchs.map((each, at) =>
                            at === index ? { ...each, description: event.target.value } : each,
                          ),
                        )
                      }
                      placeholder="Optional — e.g. commissioned the temple"
                      value={tie.description}
                    />
                  </div>
                  <Button
                    aria-label={`Untie ${monarch?.name ?? "this monarch"}`}
                    className="self-end sm:self-start"
                    onClick={() => updateMonarchs(monarchs.filter((_, at) => at !== index))}
                    size="icon"
                    title="Untie"
                    type="button"
                    variant="ghost"
                  >
                    <X aria-hidden className="size-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted">No monarch is tied to this destination.</p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label="Add a monarch"
            className="sm:max-w-sm"
            disabled={!addable.length}
            onChange={(event) => {
              const id = event.target.value;
              if (id) updateMonarchs([...monarchs, { monarchId: id, description: "" }]);
            }}
            value=""
          >
            <option value="">
              {monarchList.isLoading
                ? "Loading monarchs…"
                : addable.length
                  ? "Add a monarch…"
                  : "Every monarch is already tied"}
            </option>
            {addable.map((monarch) => (
              <option key={monarch.id} value={monarch.id}>
                {monarch.name}
                {spanText(monarch.reignStartYear, monarch.reignEndYear)
                  ? ` (${spanText(monarch.reignStartYear, monarch.reignEndYear)})`
                  : ""}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {error ? (
        <p className="text-sm font-semibold text-heritage" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-md border border-teal/15 bg-teal-soft px-3 py-2 text-sm text-teal-deep" role="status">
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-3">
        {dirty ? <span className="text-xs text-muted">Unsaved changes</span> : null}
        <Button disabled={saving.isLoading || !dirty} onClick={() => void save()} type="button">
          {saving.isLoading ? (
            <Loader2 aria-hidden className="size-4 animate-spin" />
          ) : (
            <Save aria-hidden className="size-4" />
          )}
          {saving.isLoading ? "Saving…" : "Save monarchs"}
        </Button>
      </div>
    </div>
  );
}

function tiesOf(ties: readonly DestinationMonarchResponse[]): MonarchTie[] {
  return ties.map((tie) => ({
    monarchId: tie.monarchId,
    description: tie.description ?? "",
  }));
}
