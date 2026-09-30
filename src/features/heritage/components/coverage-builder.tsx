"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ExternalLink, Landmark, Loader2, Plus, Trash2, TriangleAlert } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useDeleteRecordMutation, useGetCatalogQuery, useSaveRecordMutation } from "@/features/catalog/api/catalog-api";
import type { FormValues, ReferenceOption } from "@/features/catalog/resource";
import {
  draftFrom,
  draftProblem,
  EntryFields,
  isBlank,
  periodsOf,
  sameDraft,
  text,
  valuesOf,
  type EntryDraft,
} from "@/features/heritage/components/coverage-fields";
import { CoverageList } from "@/features/heritage/components/coverage-list";
import { IntroEditor } from "@/features/heritage/components/intro-editor";
import { apiErrorMessage } from "@/store/api/api-error";
import { cn } from "@/lib/utils";

interface CoverageBuilderProps {
  readonly region: { readonly id: string; readonly name: string; readonly code: string };
  /** The places an entry's View details link can open: the region's own destinations. */
  readonly sites: readonly ReferenceOption[];
  /** The region as its form holds it, for the line under the heading. */
  readonly regionValues: FormValues;
  readonly canEdit: boolean;
  readonly canEditIntro: boolean;
  readonly canDelete: boolean;
  /** The region's page on the website. */
  readonly websiteHref: string;
}

/** Where Finish goes: All Historical Coverage. */
const DONE = "/heritage";
/** A, B, C … for the steps, then numbers once the alphabet runs out. */
const letter = (index: number) => (index < 26 ? String.fromCharCode(65 + index) : String(index + 1));

/**
 * A region's Historical coverage built step by step: A is No. 1, B is No. 2,
 * and so on for as many as the region needs. Each step is saved when you move
 * on — "Save & add next", another step, Back or Finish — so a list made halfway
 * is kept. The right-hand column is the section as the website shows it.
 */
export function CoverageBuilder({ region, sites, regionValues, canEdit, canEditIntro, canDelete, websiteHref }: CoverageBuilderProps) {
  const router = useRouter();
  const [saveRecord] = useSaveRecordMutation();
  const [deleteRecord] = useDeleteRecordMutation();
  const { data: entries = [], isLoading } = useGetCatalogQuery("region-coverage");
  const { data: periodRows = [] } = useGetCatalogQuery("historical-periods");
  const periods = useMemo(() => periodsOf(periodRows), [periodRows]);
  const capital = region.code === "ANCIENT-CAPITALS";
  const noun = capital ? "capital" : "entry";
  const top = useRef<HTMLDivElement>(null);

  /* The step being written: an entry's id, or null for a new one. A new step is where the builder opens. */
  const [current, setCurrent] = useState<string | null>(null);
  const [draft, setDraft] = useState<EntryDraft>(() => draftFrom(null));
  const [baseline, setBaseline] = useState<EntryDraft>(() => draftFrom(null));
  /* Moved up or down, as its index among the others; null where it is (a new one at the end). */
  const [place, setPlace] = useState<number | null>(null);
  const [tried, setTried] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, startDelete] = useTransition();

  const mine = useMemo(
    () => entries.filter((entry) => entry.regionId === region.id).toSorted((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0)),
    [entries, region.id],
  );
  const others = mine.filter((entry) => entry.id !== current);
  const savedIndex = current ? mine.findIndex((entry) => entry.id === current) : -1;
  const at = Math.min(place ?? (savedIndex >= 0 ? savedIndex : others.length), others.length);
  const isNew = current === null;
  const dirty = isNew ? !isBlank(draft) : !sameDraft(draft, baseline) || place !== null;
  const duplicate = draft.title.trim()
    ? others.find((entry) => text(entry.title).trim().toLowerCase() === draft.title.trim().toLowerCase())
    : undefined;

  /* The steps in page order, this one in its place. */
  const steps: readonly { readonly id: string | null; readonly title: string }[] = [
    ...others.slice(0, at).map((entry) => ({ id: entry.id, title: text(entry.title) })),
    { id: current, title: draft.title.trim() || (isNew ? `New ${noun}` : text(mine[savedIndex]?.title)) },
    ...others.slice(at).map((entry) => ({ id: entry.id, title: text(entry.title) })),
  ];

  /* The side list keeps this step in view as it moves. */
  const sideList = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = sideList.current;
    const here = box?.querySelector<HTMLElement>("[data-this]");
    if (box && here) box.scrollTop = Math.max(0, here.offsetTop - box.clientHeight / 2 + here.clientHeight / 2);
  }, [at, others.length, current]);

  /* Leaving the page with a step half written asks first. */
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  /** Saves the step being written, if there is anything to save. False when it cannot be saved yet. */
  async function saveCurrent(): Promise<boolean> {
    if (!canEdit || !dirty) return true;
    const wrong = draftProblem(draft, noun);
    if (wrong) {
      setTried(true);
      setBanner(wrong);
      top.current?.scrollIntoView({ block: "start", behavior: "smooth" });
      return false;
    }
    setSaving(true);
    setBanner(null);
    try {
      const result = await saveRecord({
        resource: "region-coverage",
        ...(isNew ? {} : { id: current }),
        values: { regionId: region.id, sortOrder: place === null ? "" : String(at), ...valuesOf(draft) },
      }).unwrap();
      if (!result.ok) {
        setBanner(result.message);
        return false;
      }
      setCurrent(result.id);
      setBaseline(draft);
      setPlace(null);
      setTried(false);
      setJustSaved(true);
      return true;
    } catch (error) {
      setBanner(apiErrorMessage(error));
      return false;
    } finally {
      setSaving(false);
    }
  }

  /** Opens a step — an entry by its id, or null for a new one at the end — saving this one first. */
  async function open(target: string | null) {
    if (target === current && target !== null) return;
    if (!(await saveCurrent())) return;
    const next = draftFrom(target ? mine.find((entry) => entry.id === target) : null);
    setCurrent(target);
    setDraft(next);
    setBaseline(next);
    setPlace(null);
    setTried(false);
    setBanner(null);
    setJustSaved(false);
    setConfirmingDelete(false);
    top.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  async function finish() {
    if (!(await saveCurrent())) return;
    router.push(DONE);
    router.refresh();
  }

  function destroy() {
    if (isNew) return;
    /* The step before it opens, or the one after when it was the first; a new one when none is left. */
    const here = steps.findIndex((step) => step.id === current);
    const before = steps[here - 1]?.id ?? steps[here + 1]?.id ?? null;
    setConfirmingDelete(false);
    startDelete(async () => {
      try {
        await deleteRecord({ resource: "region-coverage", id: current }).unwrap();
        const next = draftFrom(before ? mine.find((entry) => entry.id === before) : null);
        setCurrent(before);
        setDraft(next);
        setBaseline(next);
        setPlace(null);
        setJustSaved(false);
      } catch (error) {
        setBanner(apiErrorMessage(error));
      }
    });
  }

  /** Deletes another entry from the list; one moved below it moves up with it. */
  async function removeOther(id: string, index: number) {
    try {
      await deleteRecord({ resource: "region-coverage", id }).unwrap();
      if (place !== null && index < at) setPlace(place - 1);
    } catch (error) {
      setBanner(apiErrorMessage(error));
    }
  }

  const position = steps.findIndex((step) => step.id === current);
  const previous = position > 0 ? steps[position - 1] : null;
  const nextNumber = mine.length + (isNew ? 2 : 1);

  const rail = (
    <nav aria-label="Steps">
      <ol className="flex flex-col gap-0.5">
        {steps.map((step, index) => {
          const active = step.id === current;
          return (
            <li key={step.id ?? "new"}>
              <button
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex h-10 w-full items-center gap-2.5 rounded-md px-2 text-left text-sm transition-colors",
                  active ? "bg-teal-soft font-medium text-teal-deep" : "text-ink-soft hover:bg-sand-deep hover:text-ink",
                )}
                disabled={saving}
                onClick={() => void open(step.id)}
                type="button"
              >
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full text-2xs font-semibold",
                    active ? "bg-primary text-primary-foreground" : step.id ? "bg-success-strong text-white" : "border border-line-strong text-muted",
                  )}
                >
                  {active || !step.id ? letter(index) : <Check aria-hidden className="size-3" strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-2xs text-muted">Step {letter(index)} · No. {index + 1}</span>
                  <span className="block truncate">{step.title || "Untitled"}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {!isNew && canEdit ? (
        <button
          className="mt-2 flex h-9 w-full items-center gap-2 rounded-md border border-dashed border-line-strong px-2 text-sm text-ink-soft transition-colors hover:border-teal hover:text-teal-deep"
          disabled={saving}
          onClick={() => void open(null)}
          type="button"
        >
          <Plus aria-hidden className="size-4" />
          Add No. {mine.length + 1}
        </button>
      ) : null}
    </nav>
  );

  const list = (
    <CoverageList
      at={at}
      canEdit={canEdit}
      draft={draft}
      label={noun}
      onDelete={canDelete ? removeOther : undefined}
      onOpen={(id) => void open(id)}
      onPlace={setPlace}
      others={others}
      periods={periods}
      regionName={region.name}
      sites={sites}
    />
  );

  if (isLoading) {
    return <div className="panel px-5 py-10 text-center text-sm text-muted">Loading {region.name}&apos;s Historical coverage…</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="panel flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <IntroEditor canEdit={canEditIntro} regionId={region.id} values={regionValues} />
        </div>
        <a className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mr-3")} href={websiteHref} rel="noreferrer" target="_blank">
          <ExternalLink aria-hidden className="size-3.5" />
          Open on the website
        </a>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[14rem_minmax(0,1fr)] xl:grid-cols-[14rem_minmax(0,1fr)_22rem]">
        <aside className="hidden lg:block">
          <div className="sticky top-20">{rail}</div>
        </aside>

        <div className="flex min-w-0 scroll-mt-20 flex-col gap-3" ref={top}>
          {/* Phones and tablets: the steps as a row. */}
          <ol className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1 lg:hidden">
            {steps.map((step, index) => (
              <li className="shrink-0" key={step.id ?? "new"}>
                <button
                  aria-current={step.id === current ? "step" : undefined}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium whitespace-nowrap",
                    step.id === current ? "border-teal bg-teal-soft text-teal-deep" : "border-line bg-paper text-ink-soft hover:bg-sand",
                  )}
                  onClick={() => void open(step.id)}
                  type="button"
                >
                  {letter(index)} · {step.title || "Untitled"}
                </button>
              </li>
            ))}
            {!isNew && canEdit ? (
              <li className="shrink-0">
                <button className="inline-flex h-8 items-center gap-1 rounded-md border border-dashed border-line-strong px-2.5 text-xs font-medium text-ink-soft" onClick={() => void open(null)} type="button">
                  <Plus aria-hidden className="size-3.5" />
                  Add No. {mine.length + 1}
                </button>
              </li>
            ) : null}
          </ol>

          {banner ? (
            <p className="flex items-start gap-2.5 rounded-lg border border-heritage/20 bg-heritage-soft px-3 py-2.5 text-sm text-heritage" role="alert">
              <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
              {banner}
            </p>
          ) : null}

          <section aria-labelledby="builder-step-title" className="panel min-w-0">
            <header className="border-b border-line px-5 py-4">
              <p className="text-xs font-medium text-muted">
                Step {letter(position)} of {steps.length} · No. {at + 1} on the page
              </p>
              <h2 className="heading mt-1 text-xl font-semibold text-ink" id="builder-step-title">
                {isNew ? `${capital ? "Royal capital" : "Entry"} No. ${at + 1}` : draft.title.trim() || `No. ${at + 1}`}
              </h2>
              <p className="mt-0.5 text-sm text-muted">
                {isNew
                  ? mine.length
                    ? `After ${text(others[at - 1]?.title) || "the others"}. Fill it in, then save it and add the next.`
                    : `The first ${noun} on ${region.name}'s page. Fill it in, then save it and add the next.`
                  : "Saved. Change anything and it is saved again when you move on."}
              </p>
            </header>

            {/* min-w-0: a fieldset otherwise grows to its longest line. */}
            <fieldset className="min-w-0 divide-y divide-line" disabled={!canEdit} key={current ?? "new"}>
              <EntryFields
                autoFocus
                capital={capital}
                draft={draft}
                duplicate={duplicate ? { title: text(duplicate.title), href: `/region-coverage/${duplicate.id}` } : null}
                onChange={(next) => {
                  setDraft(next);
                  setJustSaved(false);
                }}
                periods={periods}
                regionName={region.name}
                sites={sites}
                tried={tried}
              />
              {/* Below xl the page's list sits here; from xl up it is the right-hand column. */}
              <div className="xl:hidden">
                <p className="px-5 pt-4 text-sm font-semibold text-ink">Its number on the page</p>
                <p className="px-5 pb-2 text-xs text-muted">Read top to bottom. Move it up or down; the others renumber themselves.</p>
                {list}
              </div>
            </fieldset>

            {/* One row on a phone too: Back and Delete become icons there, and the Save button shows its own spinner. */}
            <footer className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-2 rounded-b-xl border-t border-line bg-paper px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2">
                {previous ? (
                  <Button aria-label="Back" disabled={saving} onClick={() => void open(previous.id)} size="sm" type="button" variant="secondary">
                    <ArrowLeft aria-hidden className="size-3.5" />
                    <span className="hidden sm:inline">Back</span>
                  </Button>
                ) : null}
                {!isNew && canDelete ? (
                  confirmingDelete ? (
                    <span className="flex items-center gap-1.5">
                      <span className="text-xs text-muted">Delete it?</span>
                      <Button disabled={deleting} onClick={destroy} size="sm" type="button" variant="destructive">
                        Yes, delete
                      </Button>
                      <Button onClick={() => setConfirmingDelete(false)} size="sm" type="button" variant="ghost">
                        Keep it
                      </Button>
                    </span>
                  ) : (
                    <Button aria-label="Delete" className="text-heritage hover:bg-heritage-soft hover:text-heritage" onClick={() => setConfirmingDelete(true)} size="sm" type="button" variant="ghost">
                      <Trash2 aria-hidden className="size-3.5" />
                      <span className="hidden sm:inline">Delete</span>
                    </Button>
                  )
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span aria-live="polite" className="hidden text-xs text-muted sm:inline">
                  {saving ? "Saving…" : dirty ? "Not saved yet" : justSaved ? "Saved" : ""}
                </span>
                <Button disabled={saving} onClick={() => void finish()} size="sm" type="button" variant="secondary">
                  Finish
                </Button>
                {canEdit ? (
                  <Button disabled={saving || (isNew && isBlank(draft))} onClick={() => void open(null)} size="sm" type="button">
                    {saving ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : null}
                    Save &amp; add No. {nextNumber}
                    <ArrowRight aria-hidden className="size-3.5" />
                  </Button>
                ) : null}
              </div>
            </footer>
          </section>
        </div>

        <aside className="hidden xl:block">
          <div className="panel sticky top-20 overflow-hidden">
            <div className="border-b border-line px-4 py-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                <Landmark aria-hidden className="size-4 text-muted" />
                On the website
              </p>
              <p className="mt-0.5 text-xs text-muted">
                {region.name}, under Historical coverage — {steps.length} {steps.length === 1 ? noun : capital ? "capitals" : "entries"}, numbered top to bottom.
              </p>
            </div>
            <div className="relative max-h-[calc(100vh-12rem)] overflow-y-auto" ref={sideList}>
              {list}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

