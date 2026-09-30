"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Landmark, Loader2, Save, Trash2, TriangleAlert } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useDeleteRecordMutation, useGetCatalogQuery, useSaveRecordMutation } from "@/features/catalog/api/catalog-api";
import type { CatalogRecord } from "@/features/catalog/api/contracts";
import type { ReferenceOptions } from "@/features/catalog/resource";
import { CoverageList } from "@/features/heritage/components/coverage-list";
import {
  draftFrom,
  draftProblem,
  EntryFields,
  Field,
  isBlank,
  Part,
  periodsOf,
  sameDraft,
  text,
  valuesOf,
  type EntryDraft,
} from "@/features/heritage/components/coverage-fields";
import { apiErrorMessage } from "@/store/api/api-error";

interface CoverageFormProps {
  /** Null when adding an entry. */
  readonly record: CatalogRecord | null;
  readonly referenceOptions: ReferenceOptions;
  /** The region it is added to, from "Add after". */
  readonly regionId?: string;
  /** Its number to start at, 0 for the first, from "Add after". */
  readonly place?: number;
  readonly canEdit?: boolean;
  readonly canDelete?: boolean;
}

/** An entry's own page, and the list it goes back to. */
const LIST = "/region-coverage";
const BACK = "/heritage";

/**
 * One entry of a region's Historical coverage, on a single page — to edit one,
 * or to add one at a given number with "Add after" — beside the region's list,
 * numbered as travellers read it, where it can be moved up or down.
 */
export function CoverageForm({ record, referenceOptions, regionId: presetRegion, place: presetPlace, canEdit = true, canDelete = false }: CoverageFormProps) {
  const router = useRouter();
  const [saveRecord] = useSaveRecordMutation();
  const [deleteRecord] = useDeleteRecordMutation();
  const { data: entries = [] } = useGetCatalogQuery("region-coverage");
  const { data: periodRows = [] } = useGetCatalogQuery("historical-periods");
  const editing = record != null;
  const top = useRef<HTMLDivElement>(null);

  const regions = referenceOptions["tourism-regions"] ?? [];
  const sites = referenceOptions["ancient-sites"] ?? [];
  const ancient = regions.find((region) => region.slug === "ANCIENT-CAPITALS")?.value ?? "";

  const [regionId, setRegionId] = useState(() => text(record?.regionId) || presetRegion || ancient);
  const [draft, setDraft] = useState<EntryDraft>(() => draftFrom(record));
  /* Its place among the region's other entries, 0 for the first; null until moved (at the end, or where it is). */
  const [place, setPlace] = useState<number | null>(() => (record ? Number(record.sortOrder ?? 0) : (presetPlace ?? null)));
  /* Moved up or down by hand, so opening another entry would lose it. */
  const [moved, setMoved] = useState(false);

  const [tried, setTried] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, startDelete] = useTransition();

  const others = useMemo(
    () =>
      entries
        .filter((entry) => entry.regionId === regionId && entry.id !== record?.id)
        .toSorted((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0)),
    [entries, regionId, record?.id],
  );
  const at = Math.min(place ?? others.length, others.length);
  const periods = useMemo(() => periodsOf(periodRows), [periodRows]);
  const regionOption = regions.find((option) => option.value === regionId);
  const regionName = regionOption?.label ?? "this region";
  const capital = (regionOption?.slug ?? "ANCIENT-CAPITALS") === "ANCIENT-CAPITALS";
  const noun = capital ? "capital" : "entry";
  const dirty = editing ? !sameDraft(draft, draftFrom(record)) || regionId !== text(record.regionId) || moved : !isBlank(draft);
  const duplicate = draft.title.trim()
    ? others.find((entry) => text(entry.title).trim().toLowerCase() === draft.title.trim().toLowerCase())
    : undefined;

  /* The side list keeps this entry in view as it moves. */
  const sideList = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = sideList.current;
    const here = box?.querySelector<HTMLElement>("[data-this]");
    if (box && here) box.scrollTop = Math.max(0, here.offsetTop - box.clientHeight / 2 + here.clientHeight / 2);
  }, [at, regionId, others.length]);

  async function save() {
    if (!canEdit) return;
    setTried(true);
    const wrong = !regionId ? "Choose the region whose page lists it." : draftProblem(draft, noun);
    if (wrong) {
      setBanner(wrong);
      top.current?.scrollIntoView({ block: "start", behavior: "smooth" });
      return;
    }
    setBanner(null);
    setSaving(true);
    try {
      const result = await saveRecord({
        resource: "region-coverage",
        ...(editing ? { id: record.id } : {}),
        values: { regionId, sortOrder: place == null ? "" : String(Math.min(place, others.length)), ...valuesOf(draft) },
      }).unwrap();
      if (result.ok) {
        router.push(BACK);
        router.refresh();
        return;
      }
      setBanner(result.message);
    } catch (error) {
      setBanner(apiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  function destroy() {
    setConfirmingDelete(false);
    startDelete(async () => {
      try {
        await deleteRecord({ resource: "region-coverage", id: record!.id }).unwrap();
        router.push(BACK);
        router.refresh();
      } catch (error) {
        setBanner(apiErrorMessage(error));
      }
    });
  }

  /** Deletes another entry from the list; this one, below it, moves up with it. */
  async function removeOther(id: string, index: number) {
    try {
      await deleteRecord({ resource: "region-coverage", id }).unwrap();
      if (place !== null && index < at) setPlace(place - 1);
    } catch (error) {
      setBanner(apiErrorMessage(error));
    }
  }

  const list = (
    <CoverageList
      at={at}
      canEdit={canEdit}
      draft={draft}
      label={noun}
      onDelete={canDelete ? removeOther : undefined}
      onOpen={(id) => router.push(`${LIST}/${id}`)}
      onPlace={(next) => {
        setPlace(next);
        setMoved(true);
      }}
      openLosesChanges={dirty}
      others={others}
      periods={periods}
      regionName={regionName}
      sites={sites}
    />
  );

  return (
    <form
      className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_26rem]"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <div className="flex min-w-0 scroll-mt-20 flex-col gap-3" ref={top}>
        {banner ? (
          <p className="flex items-start gap-2.5 rounded-lg border border-heritage/20 bg-heritage-soft px-3 py-2.5 text-sm text-heritage" role="alert">
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
            {banner}
          </p>
        ) : null}

        <section className="panel min-w-0">
          {/* min-w-0: a fieldset otherwise grows to its longest line, and a long story would push the rows out of the card. */}
          <fieldset className="min-w-0 divide-y divide-line" disabled={!canEdit}>
            <Part hint="The region whose page shows it under Historical coverage." title="Where it is listed">
              <Field label="Region" required>
                {(id) => (
                  <Select
                    id={id}
                    onChange={(event) => {
                      setRegionId(event.target.value);
                      setPlace(null);
                    }}
                    value={regionId}
                  >
                    {regions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <p className="text-xs text-muted">
                {regionName} has {others.length} {others.length === 1 ? "entry" : "entries"} on its page{editing ? " besides this one" : ""}.
              </p>
            </Part>

            <EntryFields
              autoFocus={!editing}
              capital={capital}
              draft={draft}
              duplicate={duplicate ? { title: text(duplicate.title), href: `${LIST}/${duplicate.id}` } : null}
              onChange={setDraft}
              periods={periods}
              regionName={regionName}
              sites={sites}
              tried={tried}
            />

            {/* On narrower screens the list sits here; from lg up it is beside the form. */}
            <div className="lg:hidden">
              <p className="px-5 pt-4 text-sm font-semibold text-ink">Its number on the page</p>
              <p className="px-5 pb-2 text-xs text-muted">Read top to bottom. Move it up or down; the others renumber themselves.</p>
              {list}
            </div>
          </fieldset>

          <footer className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-2 rounded-b-xl border-t border-line bg-paper px-5 py-3">
            <div className="flex items-center gap-2">
              <Link className={buttonVariants({ variant: "ghost", size: "sm" })} href={BACK}>
                Cancel
              </Link>
              {editing && canDelete ? (
                confirmingDelete ? (
                  <span className="flex items-center gap-1.5">
                    <span className="text-xs text-muted">Take it off the page?</span>
                    <Button disabled={deleting} onClick={destroy} size="sm" type="button" variant="destructive">
                      Yes, delete
                    </Button>
                    <Button onClick={() => setConfirmingDelete(false)} size="sm" type="button" variant="ghost">
                      Keep it
                    </Button>
                  </span>
                ) : (
                  <Button className="text-heritage hover:bg-heritage-soft hover:text-heritage" onClick={() => setConfirmingDelete(true)} size="sm" type="button" variant="ghost">
                    <Trash2 aria-hidden className="size-3.5" />
                    Delete
                  </Button>
                )
              ) : null}
            </div>
            {canEdit ? (
              <Button disabled={saving} size="sm" type="submit">
                {saving ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : editing ? <Save aria-hidden className="size-3.5" /> : <Check aria-hidden className="size-3.5" />}
                {saving ? "Saving…" : editing ? "Save changes" : `Add as No. ${at + 1}`}
              </Button>
            ) : null}
          </footer>
        </section>
      </div>

      <aside className="hidden lg:block">
        <div className="panel sticky top-20 overflow-hidden">
          <div className="border-b border-line px-4 py-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              <Landmark aria-hidden className="size-4 text-muted" />
              On the website
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {regionName}, under Historical coverage — No. {at + 1} of {others.length + 1}. Move it up or down; the others renumber themselves.
            </p>
          </div>
          <div className="relative max-h-[calc(100vh-12rem)] overflow-y-auto" ref={sideList}>
            {list}
          </div>
        </div>
      </aside>
    </form>
  );
}
