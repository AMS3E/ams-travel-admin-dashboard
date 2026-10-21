"use client";

import { useMemo } from "react";
import Image from "next/image";
import { useFormatter, useTranslations } from "next-intl";
import { mediaPath } from "@/features/catalog/resource";
import Link from "next/link";
import { ArrowUpRight, BadgeCheck, ImageIcon, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Surface, SurfaceHeader } from "@/components/ui/surface";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { useGetCatalogQuery, useGetCatalogRecordQuery } from "@/features/catalog/api/catalog-api";
import type { CatalogRecord } from "@/features/catalog/api/contracts";
import { byName } from "@/features/catalog/resources";
import { QueryState } from "@/features/cms/components/query-state";

/* Each status's colour; its words are catalog.region.status. */
const STATUS_TONES = { PUBLISHED: "active", DRAFT: "neutral", ARCHIVED: "neutral" } as const;
type KnownStatus = keyof typeof STATUS_TONES;
const isKnownStatus = (value: string): value is KnownStatus => Object.hasOwn(STATUS_TONES, value);

/* The overview as the editor wrote it, with the same marks the phone preview draws. */
const STORY_CLASSES =
  "text-sm leading-relaxed text-ink-soft [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-line [&_blockquote]:pl-3 [&_em]:italic [&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_p+p]:mt-2 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5";

const ids = (value: unknown): string[] => (Array.isArray(value) ? value.map(String) : []);
const text = (value: unknown): string => (typeof value === "string" ? value : "");

/**
 * Content Management → Tourism Regions → one region: what its page in the
 * app shows. Its overview, its own categories and search filters, and the
 * destinations shelved in it. Read-only: the
 * region's words are edited on its form, its lists in Taxonomy.
 */
export function RegionDetail({ id }: { readonly id: string }) {
  const t = useTranslations("catalog.region");
  const format = useFormatter();
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
  const overview = text(row?.description);
  const coverKey = text(row?.coverKey);
  const cover = text(row?.coverUrl) || (coverKey ? mediaPath(coverKey) : "");
  const mapKey = text(row?.mapKey);
  const mapPicture = text(row?.mapUrl) || (mapKey ? mediaPath(mapKey) : "");

  return (
    <div className="flex flex-col gap-4">
      {region.isLoading || region.error ? (
        <div className="p-3">
          <QueryState error={region.error} loading={region.isLoading} retry={region.refetch} />
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Surface aria-label={t("overview")}>
          <SurfaceHeader
            actions={row?.amsRecommended === true ? (
              <Badge tone="success">
                <BadgeCheck aria-hidden className="size-3" />
                {t("recommended")}
              </Badge>
            ) : null}
            description={t("overviewDescription")}
            title={t("overview")}
          />
          <div className="p-4">
            {cover ? (
              <Image alt="" className="mb-4 aspect-[2/1] w-full rounded-md object-cover ring-1 ring-line" data-field="cover" height={320} src={cover} unoptimized width={640} />
            ) : (
              <p className="mb-4 text-xs text-muted" data-field="cover">{t("noCover")}</p>
            )}
            {overview ? <div className={STORY_CLASSES} dangerouslySetInnerHTML={{ __html: overview }} /> : <p className="text-sm text-muted">{t("nothingWritten")}</p>}
            <div className="mt-4 border-t border-line pt-4" data-field="map">
              <p className="mb-2 text-xs font-medium text-muted">{t("mapPicture")}</p>
              {mapPicture ? (
                <Image alt="" className="w-full rounded-md object-contain ring-1 ring-line" height={400} src={mapPicture} unoptimized width={480} />
              ) : (
                <p className="text-xs text-muted">{t("noMapPicture")}</p>
              )}
            </div>
          </div>
        </Surface>

        <Surface aria-label={t("lists")}>
          <SurfaceHeader
            actions={
              <Link className="inline-flex items-center gap-1 text-xs font-medium text-teal-deep hover:underline" href="/categories-and-tags">
                {t("manageInTaxonomy")}
                <ArrowUpRight aria-hidden className="size-3" />
              </Link>
            }
            description={t("listsDescription")}
            title={t("lists")}
          />
          <div className="flex flex-col gap-4 p-4">
            <TermChips field="categories" label={t("categories")} rows={regionCategories} />
            <TermChips field="tags" label={t("searchFilters")} rows={regionTags} />
          </div>
        </Surface>
      </div>

      {/* Shown once an attraction picks this region; a failed read still shows, so it is never mistaken for empty. */}
      {destinations.error || places.length ? (
        <Surface aria-label={t("destinations")}>
          <SurfaceHeader
            actions={destinations.data ? <span className="text-xs text-muted tabular-nums">{format.number(places.length)}</span> : null}
            description={t("destinationsDescription")}
            title={t("destinations")}
          />
          {destinations.error ? (
            <div className="p-3">
              <QueryState error={destinations.error} retry={destinations.refetch} />
            </div>
          ) : null}
          {places.length ? (
            <Table>
              <TableHead>
                <TableRow className="hover:bg-transparent">
                  <TableHeaderCell className="w-10 text-right">{t("number")}</TableHeaderCell>
                  <TableHeaderCell>{t("name")}</TableHeaderCell>
                  <TableHeaderCell>{t("province")}</TableHeaderCell>
                  <TableHeaderCell>{t("statusColumn")}</TableHeaderCell>
                  <TableHeaderCell className="text-right">
                    <span className="sr-only">{t("editColumn")}</span>
                  </TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {places.map((place, index) => {
                  const status = String(place.status);
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
                          <Link className="font-medium text-ink hover:text-teal-deep hover:underline" href={`/destinations/${place.id}/detail?from=region:${id}`}>
                            {text(place.name)}
                          </Link>
                        </span>
                      </TableCell>
                      <TableCell>{provinceName.get(text(place.provinceId)) || "—"}</TableCell>
                      <TableCell>
                        <Badge dot tone={isKnownStatus(status) ? STATUS_TONES[status] : "neutral"}>
                          {isKnownStatus(status) ? t(`status.${status}`) : text(place.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link aria-label={t("editName", { name: text(place.name) })} className="inline-flex text-muted hover:text-ink" href={`/destinations/${place.id}`}>
                          <Pencil aria-hidden className="size-4" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : null}
        </Surface>
      ) : null}
    </div>
  );
}

/** A region's categories or search filters as chips, retired ones marked. */
function TermChips({ field, label, rows }: { readonly field: string; readonly label: string; readonly rows: readonly CatalogRecord[] }) {
  const t = useTranslations("catalog.region");
  return (
    <div>
      <p className="text-xs font-medium text-muted">
        {t("termCount", { label, count: rows.length })}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5" data-field={field}>
        {rows.length ? rows.map((row) => (
          <Badge className={row.isActive === false ? "line-through opacity-70" : undefined} key={row.id} tone="neutral">
            {text(row.name)}
          </Badge>
        )) : <span className="text-sm text-muted">{t("noneYet")}</span>}
      </div>
    </div>
  );
}
