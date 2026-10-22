"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { BadgeCheck, Eye, Star, ThumbsUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Surface } from "@/components/ui/surface";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { SearchField, SegmentedControl, Toolbar } from "@/components/ui/toolbar";
import { useGetCatalogQuery } from "@/features/catalog/api/catalog-api";
import { HelpIcon } from "@/features/catalog/components/listing-form/listing-field";
import { byName } from "@/features/catalog/resources";
import { QueryState } from "@/features/cms/components/query-state";
import { useGetDestinationStatsQuery } from "../api/dashboard-api";
import type { DestinationStatsPeriod, DestinationStatsRow } from "../api/contracts";
import { PeriodControl, windowOf, type Period } from "./period-control";
import { StatGrid, StatTile } from "./stat-tile";

type Scope = "published" | "all";
type SortKey = "rating" | "reviews" | "browses" | "views" | "checkIns" | "name";

const SORTS: readonly SortKey[] = ["rating", "reviews", "browses", "views", "checkIns", "name"];

export const STATUS_TONES = {
  PUBLISHED: "active",
  DRAFT: "neutral",
  ARCHIVED: "neutral",
} as const satisfies Record<string, "active" | "neutral" | "inactive">;

export type ListingStatus = keyof typeof STATUS_TONES;

export function isListingStatus(value: unknown): value is ListingStatus {
  return typeof value === "string" && value in STATUS_TONES;
}

/** "Verified · Partner", "Verified" or "Not verified", in the reader's language. */
export function useStandingText(): (row: Pick<DestinationStatsRow, "verified" | "basis">) => string {
  const t = useTranslations("stats");
  return (row) =>
    row.verified && row.basis
      ? t("badge.verifiedOn", { basis: t(`basis.${row.basis}`) })
      : row.verified
        ? t("badge.verified")
        : t("badge.notVerified");
}

/** Highest first, the better-known place winning a tie, then by name. */
function compare(a: DestinationStatsRow, b: DestinationStatsRow, sort: SortKey): number {
  switch (sort) {
    case "rating":
      return (b.averageRating ?? -1) - (a.averageRating ?? -1) || b.ratingCount - a.ratingCount || byName(a.name, b.name);
    case "reviews":
      return b.reviewCount - a.reviewCount || byName(a.name, b.name);
    case "browses":
      return b.browses - a.browses || b.viewCount - a.viewCount || byName(a.name, b.name);
    case "views":
      return b.viewCount - a.viewCount || byName(a.name, b.name);
    case "checkIns":
      return b.checkIns - a.checkIns || byName(a.name, b.name);
    default:
      return byName(a.name, b.name);
  }
}

/**
 * Content Management → Destination Stats: what travellers make of each
 * destination, and what its Verified badge rests on. Browses, reviews and
 * ratings follow the period chosen; views, the Verified badge and the status
 * are as of today whatever the period, and say so. Read-only: the figures
 * are the visitors', and verification is decided on the Verification page.
 */
export function DestinationStatsPage() {
  const t = useTranslations("stats");
  const format = useFormatter();
  const count = (value: number) => format.number(value);
  const standing = useStandingText();
  const [period, setPeriod] = useState<Period>("all");
  const [custom, setCustom] = useState<DestinationStatsPeriod>({});
  const window = windowOf(period, custom);
  const query = useGetDestinationStatsQuery(window);
  const provinces = useGetCatalogQuery("provinces");
  const [scope, setScope] = useState<Scope>("published");
  const [sort, setSort] = useState<SortKey>("rating");
  const [search, setSearch] = useState("");
  const allTime = period === "all";

  const places = useMemo(() => query.data?.places ?? [], [query.data]);
  const provinceName = useMemo(
    () => new Map((provinces.data ?? []).map((row) => [row.id, typeof row.name === "string" ? row.name : ""])),
    [provinces.data],
  );
  const inScope = useMemo(() => places.filter((row) => scope === "all" || row.status === "PUBLISHED"), [places, scope]);
  const needle = search.trim().toLowerCase();
  const rows = inScope.filter((row) => !needle || row.name.toLowerCase().includes(needle)).toSorted((a, b) => compare(a, b, sort));

  /* The figures, over the places in scope. */
  const verified = inScope.filter((row) => row.verified).length;
  const traveler = inScope.filter((row) => row.travelerRecommended).length;
  const ratings = inScope.reduce((sum, row) => sum + row.ratingCount, 0);
  const average = ratings
    ? inScope.reduce((sum, row) => sum + (row.averageRating ?? 0) * row.ratingCount, 0) / ratings
    : null;
  const browses = inScope.reduce((sum, row) => sum + row.browses, 0);
  const published = places.filter((row) => row.status === "PUBLISHED").length;

  return (
    <div className="flex flex-col gap-4">
      <StatGrid>
        <StatTile icon={BadgeCheck} label={t("tiles.verified")} value={query.data ? count(verified) : null} />
        <StatTile icon={ThumbsUp} label={t("badge.traveler")} value={query.data ? count(traveler) : null} />
        <StatTile icon={Star} label={t("tiles.average")} value={query.data ? (average == null ? "—" : average.toFixed(1)) : null} />
        <StatTile icon={Eye} label={t("tiles.browses")} value={query.data ? count(browses) : null} />
      </StatGrid>

      <Surface aria-label={t("list.label")}>
        <Toolbar>
          <PeriodControl custom={custom} onCustom={setCustom} onPeriod={setPeriod} period={period} />
          <SearchField label={t("list.search")} onChange={setSearch} placeholder={t("list.searchPlaceholder")} value={search} />
          <SegmentedControl
            label={t("list.scope")}
            onChange={setScope}
            options={[
              { value: "published", label: t("list.scopePublished"), count: published },
              { value: "all", label: t("list.scopeAll"), count: places.length },
            ]}
            value={scope}
          />
          <Select aria-label={t("list.sort")} className="h-8 w-52 text-sm" onChange={(event) => setSort(event.target.value as SortKey)} value={sort}>
            {SORTS.filter((option) => allTime || option !== "views").map((option) => (
              <option key={option} value={option}>
                {t(`list.sorts.${option}`)}
              </option>
            ))}
          </Select>
          {query.data ? (
            <span className="ml-auto text-xs text-muted tabular-nums">{t("list.shown", { shown: rows.length, total: inScope.length })}</span>
          ) : null}
        </Toolbar>

        {query.isLoading || query.error ? (
          <div className="p-3">
            <QueryState error={query.error} loading={query.isLoading} retry={query.refetch} />
          </div>
        ) : null}

        {query.data ? (
          rows.length ? (
            <Table>
              <TableHead>
                <TableRow className="hover:bg-transparent">
                  <TableHeaderCell>{t("table.name")}</TableHeaderCell>
                  <TableHeaderCell className="text-right">{t("table.rating")}</TableHeaderCell>
                  <TableHeaderCell className="text-right">{t("table.reviews")}</TableHeaderCell>
                  <TableHeaderCell className="text-right">{t("table.browses")}</TableHeaderCell>
                  <TableHeaderCell className="text-right">{t("table.checkIns")}</TableHeaderCell>
                  {allTime ? <TableHeaderCell className="text-right">{t("table.views")}</TableHeaderCell> : null}
                  <TableHeaderCell>
                    <span className="inline-flex items-center gap-1">
                      {t("table.verified")}
                      <HelpIcon id="stats-verified-help" label={t("table.verified")} text={t("table.verifiedHelp")} />
                    </span>
                  </TableHeaderCell>
                  <TableHeaderCell>
                    <span className="inline-flex items-center gap-1">
                      {t("table.status")}
                      <HelpIcon id="stats-status-help" label={t("table.status")} text={t("table.statusHelp")} />
                    </span>
                  </TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow data-destination-id={row.id} key={row.id}>
                    <TableCell>
                      <Link className="font-medium text-ink hover:text-teal-deep hover:underline" href={`/destinations/${row.id}/detail?from=stats`}>
                        {row.name}
                      </Link>
                      <p className="truncate text-xs text-muted">{(row.provinceId && provinceName.get(row.provinceId)) || row.slug}</p>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className="font-medium text-ink">{row.averageRating == null ? "—" : row.averageRating.toFixed(1)}</span>
                      <span className="block text-xs text-muted">{t("ratings", { count: row.ratingCount })}</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{count(row.reviewCount)}</TableCell>
                    <TableCell className="text-right tabular-nums">{count(row.browses)}</TableCell>
                    <TableCell className="text-right tabular-nums">{count(row.checkIns)}</TableCell>
                    {allTime ? <TableCell className="text-right tabular-nums">{count(row.viewCount)}</TableCell> : null}
                    <TableCell>
                      <span className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={row.verified ? "info" : "neutral"}>{standing(row)}</Badge>
                        {row.travelerRecommended ? <Badge tone="success">{t("badge.traveler")}</Badge> : null}
                      </span>
                    </TableCell>
                    <TableCell>
                      {isListingStatus(row.status) ? (
                        <Badge dot tone={STATUS_TONES[row.status]}>{t(`status.${row.status}`)}</Badge>
                      ) : (
                        <Badge dot tone="neutral">{row.status}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="px-4 py-6 text-center text-sm text-muted">{needle ? t("list.noMatch") : t("list.none")}</p>
          )
        ) : null}
      </Surface>
    </div>
  );
}
