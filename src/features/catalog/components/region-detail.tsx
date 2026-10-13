"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { mediaPath } from "@/features/catalog/resource";
import Link from "next/link";
import { ArrowUpRight, ImageIcon, LoaderCircle, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Surface, SurfaceHeader } from "@/components/ui/surface";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { useGetCatalogQuery, useGetCatalogRecordQuery } from "@/features/catalog/api/catalog-api";
import type { CatalogRecord } from "@/features/catalog/api/contracts";
import { byName } from "@/features/catalog/resources";
import { QueryState } from "@/features/cms/components/query-state";
import type { MapPlace } from "./region-places-map";

const RegionPlacesMap = dynamic(() => import("./region-places-map"), {
  ssr: false,
  loading: () => (
    <p className="flex h-80 items-center justify-center gap-2 text-sm text-muted">
      <LoaderCircle aria-hidden className="size-4 animate-spin" />
      Loading the map…
    </p>
  ),
});

const STATUS: Readonly<Record<string, { label: string; tone: "active" | "neutral" | "inactive" }>> = {
  PUBLISHED: { label: "Published", tone: "active" },
  DRAFT: { label: "Draft", tone: "neutral" },
  ARCHIVED: { label: "Archived", tone: "inactive" },
};

/* The overview as the editor wrote it, with the same marks the phone preview draws. */
const STORY_CLASSES =
  "text-sm leading-relaxed text-ink-soft [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-line [&_blockquote]:pl-3 [&_em]:italic [&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_p+p]:mt-2 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5";

const ids = (value: unknown): string[] => (Array.isArray(value) ? value.map(String) : []);
const text = (value: unknown): string => (typeof value === "string" ? value : "");
const count = (value: number) => value.toLocaleString();

/**
 * Content Management → Tourism Regions → one region: what its page in the
 * app shows. Its overview, its own categories and search filters, a map of
 * the destinations shelved in it, and the list of them. Read-only: the
 * region's words are edited on its form, its lists in Taxonomy.
 */
export function RegionDetail({ id }: { readonly id: string }) {
  const region = useGetCatalogRecordQuery({ resource: "regions", id });
  const categories = useGetCatalogQuery("categories");
  const tags = useGetCatalogQuery("tags");
  const destinations = useGetCatalogQuery("destinations");
  const provinces = useGetCatalogQuery("provinces");
  const row = region.data;

  const pick = (rows: readonly CatalogRecord[] | undefined, chosen: unknown): CatalogRecord[] =>
    ids(chosen).map((each) => rows?.find((candidate) => candidate.id === each)).filter((found): found is CatalogRecord => Boolean(found));
  const regionCategories = useMemo(() => pick(categories.data, row?.categoryIds), [categories.data, row?.categoryIds]);
  const regionTags = useMemo(() => pick(tags.data, row?.tagIds), [tags.data, row?.tagIds]);
  const places = useMemo(
    () => (destinations.data ?? []).filter((place) => ids(place.tourismRegionIds).includes(id)).toSorted((a, b) => byName(text(a.name), text(b.name))),
    [destinations.data, id],
  );
  const provinceName = useMemo(() => new Map((provinces.data ?? []).map((each) => [each.id, text(each.name)])), [provinces.data]);
  const pins = useMemo<MapPlace[]>(
    () => places.flatMap((place) => (typeof place.latitude === "number" && typeof place.longitude === "number"
      ? [{ id: place.id, name: text(place.name), lat: place.latitude, lng: place.longitude, href: `/destination-stats/${place.id}` }]
      : [])),
    [places],
  );
  const overview = text(row?.description);
  const coverKey = text(row?.coverKey);
  const cover = text(row?.coverUrl) || (coverKey ? mediaPath(coverKey) : "");

  return (
    <div className="flex flex-col gap-4">
      {region.isLoading || region.error ? (
        <div className="p-3">
          <QueryState error={region.error} loading={region.isLoading} retry={region.refetch} />
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Surface aria-label="Overview">
          <SurfaceHeader description="Its cover picture and the lines under its name on its Discover page." title="Overview" />
          <div className="p-4">
            {cover ? (
              <Image alt="" className="mb-4 aspect-[2/1] w-full rounded-md object-cover ring-1 ring-line" data-field="cover" height={320} src={cover} unoptimized width={640} />
            ) : (
              <p className="mb-4 text-xs text-muted" data-field="cover">No cover picture yet: choose one on its form.</p>
            )}
            {overview ? <div className={STORY_CLASSES} dangerouslySetInnerHTML={{ __html: overview }} /> : <p className="text-sm text-muted">Nothing written yet.</p>}
          </div>
        </Surface>

        <Surface aria-label="Its own lists">
          <SurfaceHeader
            actions={
              <Link className="inline-flex items-center gap-1 text-xs font-medium text-teal-deep hover:underline" href="/categories-and-tags">
                Manage in Taxonomy
                <ArrowUpRight aria-hidden className="size-3" />
              </Link>
            }
            description="What its places are sorted and filtered by, in its page's order."
            title="Its own lists"
          />
          <div className="flex flex-col gap-4 p-4">
            <TermChips field="categories" label="Categories" rows={regionCategories} />
            <TermChips field="tags" label="Search filters" rows={regionTags} />
          </div>
        </Surface>
      </div>

      <Surface aria-label="Map">
        <SurfaceHeader
          description={places.length ? `${count(pins.length)} of ${count(places.length)} ${places.length === 1 ? "destination has" : "destinations have"} a pin.` : "No destination is shelved here yet."}
          title="Map"
        />
        <div className="p-4">
          <div className="relative isolate overflow-hidden rounded-lg border border-line bg-sand">
            <RegionPlacesMap places={pins} />
          </div>
          <p className="mt-1 text-right text-2xs text-muted">
            Map data ©{" "}
            <a className="hover:text-ink hover:underline" href="https://www.openstreetmap.org/copyright" rel="noreferrer" target="_blank">
              OpenStreetMap contributors
            </a>
          </p>
        </div>
      </Surface>

      <Surface aria-label="Destinations">
        <SurfaceHeader
          actions={destinations.data ? <span className="text-xs text-muted tabular-nums">{count(places.length)}</span> : null}
          description="Every attraction shelved in this region, as its page lists them. A name opens the destination's detail; the pencil its form."
          title="Destinations"
        />
        {destinations.isLoading || destinations.error ? (
          <div className="p-3">
            <QueryState error={destinations.error} loading={destinations.isLoading} retry={destinations.refetch} />
          </div>
        ) : null}
        {destinations.data ? (
          places.length ? (
            <Table>
              <TableHead>
                <TableRow className="hover:bg-transparent">
                  <TableHeaderCell className="w-10 text-right">#</TableHeaderCell>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell>Province</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell className="text-right">
                    <span className="sr-only">Edit</span>
                  </TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {places.map((place, index) => {
                  const status = STATUS[String(place.status)];
                  const cover = text(place.coverUrl);
                  return (
                    <TableRow data-destination-id={place.id} key={place.id}>
                      <TableCell className="text-right text-muted tabular-nums">{index + 1}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-3">
                          {cover ? (
                            <Image alt="" className="size-9 shrink-0 rounded object-cover ring-1 ring-line" height={36} src={cover} unoptimized width={36} />
                          ) : (
                            <span className="grid size-9 shrink-0 place-items-center rounded bg-sand-deep text-muted">
                              <ImageIcon aria-hidden className="size-4" strokeWidth={1.75} />
                            </span>
                          )}
                          <Link className="font-medium text-ink hover:text-teal-deep hover:underline" href={`/destination-stats/${place.id}`}>
                            {text(place.name)}
                          </Link>
                        </span>
                      </TableCell>
                      <TableCell>{provinceName.get(text(place.provinceId)) || "—"}</TableCell>
                      <TableCell>
                        <Badge dot tone={status?.tone ?? "neutral"}>{status?.label ?? text(place.status)}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link aria-label={`Edit ${text(place.name)}`} className="inline-flex text-muted hover:text-ink" href={`/destinations/${place.id}`}>
                          <Pencil aria-hidden className="size-4" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="px-4 py-6 text-center text-sm text-muted">No destination is shelved in this region yet.</p>
          )
        ) : null}
      </Surface>
    </div>
  );
}

/** A region's categories or search filters as chips, retired ones marked. */
function TermChips({ field, label, rows }: { readonly field: string; readonly label: string; readonly rows: readonly CatalogRecord[] }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted">
        {label} · {count(rows.length)}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5" data-field={field}>
        {rows.length ? rows.map((row) => (
          <Badge key={row.id} tone={row.isActive === false ? "inactive" : "neutral"}>
            {text(row.name)}
          </Badge>
        )) : <span className="text-sm text-muted">None yet.</span>}
      </div>
    </div>
  );
}
