import Link from "next/link";
import { ChevronRight, ExternalLink, Landmark, Pencil, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { CatalogRecord } from "@/features/catalog/api/contracts";
import { getRecords } from "@/features/catalog/api/catalog.server";
import { toFormValues } from "@/features/catalog/resource";
import { getResource } from "@/features/catalog/resources";
import { DeleteEntry } from "@/features/heritage/components/delete-entry";
import { IntroEditor } from "@/features/heritage/components/intro-editor";

/** Where the website answers, for the link to a region's page. */
const WEBSITE_URL = (process.env.WEBSITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/**
 * Historical coverage as the website shows it: each tourism region's line and
 * its capitals, numbered top to bottom, with a link to the page they appear
 * on, and the way to add a capital at any number, edit, move or delete one, or
 * change the line. What is here is what the website shows — nothing else makes it.
 */
export async function CoverageLists({
  canCreate,
  canEdit,
  canDelete,
  canEditIntro,
}: {
  readonly canCreate: boolean;
  readonly canEdit: boolean;
  readonly canDelete: boolean;
  readonly canEditIntro: boolean;
}) {
  const [entries, regions] = await Promise.all([getRecords("region-coverage"), getRecords("regions")]);
  const tourism = regions.filter((region) => region.kind === "TOURISM");
  /* Every region that has a list, and Ancient Capitals always: it is the one whose page is built around its capitals. In their numbered order. */
  const shown = tourism.filter((region) => region.code === "ANCIENT-CAPITALS" || entries.some((entry) => entry.regionId === region.id));

  return (
    <div className="flex flex-col gap-5">
      <ol className="grid gap-2 sm:grid-cols-3">
        {[
          ["Add an entry at any number", "Add after the one it follows, or at the end step by step: its name in English and Khmer, its years, era, story and the place it opens."],
          ["It is on the website at once", "On its region's page, under Historical coverage, numbered in the order shown here."],
          ["Edit, move or remove one", "The others renumber themselves, so the list always reads 1, 2, 3 without gaps."],
        ].map(([title, body], index) => (
          <li className="panel flex gap-3 px-3 py-3" key={title}>
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-sand text-xs font-semibold text-ink-soft">{index + 1}</span>
            <span>
              <span className="block text-sm font-medium text-ink">{title}</span>
              <span className="block text-xs text-muted">{body}</span>
            </span>
          </li>
        ))}
      </ol>

      {shown.map((region) => (
        <RegionCoverage
          canCreate={canCreate}
          canDelete={canDelete}
          canEdit={canEdit}
          canEditIntro={canEditIntro}
          entries={entries.filter((entry) => entry.regionId === region.id).toSorted((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0))}
          key={region.id}
          region={region}
        />
      ))}
    </div>
  );
}

function RegionCoverage({
  region,
  entries,
  canCreate,
  canEdit,
  canDelete,
  canEditIntro,
}: {
  readonly region: CatalogRecord;
  readonly entries: readonly CatalogRecord[];
  readonly canCreate: boolean;
  readonly canEdit: boolean;
  readonly canDelete: boolean;
  readonly canEditIntro: boolean;
}) {
  const page = `${WEBSITE_URL}/regions/${text(region.code).toLowerCase()}`;
  /* A new capital at a number: after the one it follows; 0 puts it first. */
  const addAt = (place: number) => `/region-coverage/new?regionId=${region.id}&place=${place}`;
  return (
    <section aria-labelledby={`coverage-${region.id}`} className="panel divide-y divide-line">
      <header className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink" id={`coverage-${region.id}`}>
            <Landmark aria-hidden className="size-4 text-muted" />
            {text(region.name)}
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            {entries.length} {region.code === "ANCIENT-CAPITALS" ? (entries.length === 1 ? "royal capital" : "royal capitals") : entries.length === 1 ? "entry" : "entries"} on its website page, under Historical coverage.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a className={buttonVariants({ variant: "secondary", size: "sm" })} href={page} rel="noreferrer" target="_blank">
            <ExternalLink aria-hidden className="size-3.5" />
            Open on the website
          </a>
          {canCreate ? (
            <Link className={buttonVariants({ size: "sm" })} href={`/heritage/create?region=${text(region.code).toLowerCase()}`}>
              <Plus aria-hidden className="size-3.5" />
              Add at the end, No. {entries.length + 1}
            </Link>
          ) : null}
        </div>
      </header>

      <IntroEditor canEdit={canEditIntro} regionId={region.id} values={toFormValues(getResource("regions"), region)} />

      {entries.length ? (
        <ol className="divide-y divide-line">
          {entries.map((entry, index) => (
            <li className="flex gap-3 px-4 py-3" key={entry.id}>
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-sand text-xs font-semibold text-ink-soft">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-soft">
                  {text(entry.dateRange) || <span className="font-normal text-muted">No dates</span>}
                  {text(entry.historicalPeriodName) ? (
                    <span className="rounded-full bg-teal-soft px-2 py-0.5 text-2xs font-medium text-teal-deep">{text(entry.historicalPeriodName)}</span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-sm font-semibold text-ink">
                  {text(entry.title)}
                  {text(entry.titleKm) ? <span className="ml-2 text-sm font-normal text-muted">{text(entry.titleKm)}</span> : null}
                </p>
                {text(entry.description) ? <p className="mt-0.5 text-sm text-ink-soft">{text(entry.description)}</p> : null}
                <p className="mt-1 flex items-center gap-0.5 text-xs text-muted">
                  {text(entry.destinationName) ? (
                    <>
                      <span className="font-medium text-teal-deep">View details</span>
                      <ChevronRight aria-hidden className="size-3" /> opens {text(entry.destinationName)}
                    </>
                  ) : (
                    "No View details link"
                  )}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1 lg:flex-row lg:items-start">
                {canEdit ? (
                  <Link className={buttonVariants({ variant: "ghost", size: "sm" })} href={`/region-coverage/${entry.id}`}>
                    <Pencil aria-hidden className="size-3.5" />
                    Edit
                  </Link>
                ) : null}
                {canCreate ? (
                  <Link
                    aria-label={`Add an entry after ${text(entry.title)}, as No. ${index + 2}`}
                    className={buttonVariants({ variant: "ghost", size: "sm" })}
                    href={addAt(index + 1)}
                  >
                    <Plus aria-hidden className="size-3.5" />
                    Add after
                  </Link>
                ) : null}
                {canDelete ? <DeleteEntry id={entry.id} number={index + 1} title={text(entry.title)} /> : null}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="px-4 py-6 text-center text-sm text-muted">Nothing yet. Add No. 1, and it appears on the region&apos;s page.</p>
      )}
    </section>
  );
}
