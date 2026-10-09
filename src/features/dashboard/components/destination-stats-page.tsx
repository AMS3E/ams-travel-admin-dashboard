"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BadgeCheck, Eye, Star, ThumbsUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Surface, SurfaceHeader } from "@/components/ui/surface";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { SearchField, SegmentedControl, Toolbar } from "@/components/ui/toolbar";
import { useGetCatalogQuery } from "@/features/catalog/api/catalog-api";
import { byName } from "@/features/catalog/resources";
import { QueryState } from "@/features/cms/components/query-state";
import { BASIS_LABELS } from "@/features/verification/api/contracts";
import { useGetDestinationStatsQuery } from "../api/dashboard-api";
import type { DestinationStatsRow } from "../api/contracts";
import { StatGrid, StatTile } from "./stat-tile";

type Scope = "published" | "all";
type SortKey = "rating" | "reviews" | "browses" | "views" | "name";

const SORTS: readonly { readonly value: SortKey; readonly label: string }[] = [
  { value: "rating", label: "Rating, highest first" },
  { value: "reviews", label: "Most reviewed" },
  { value: "browses", label: "Most browsed" },
  { value: "views", label: "Most viewed, all time" },
  { value: "name", label: "Name A–Z" },
];

const STATUS: Readonly<Record<string, { label: string; tone: "active" | "neutral" | "inactive" }>> = {
  PUBLISHED: { label: "Published", tone: "active" },
  DRAFT: { label: "Draft", tone: "neutral" },
  ARCHIVED: { label: "Archived", tone: "inactive" },
};

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
    default:
      return byName(a.name, b.name);
  }
}

const count = (value: number) => value.toLocaleString();

/**
 * Content Management → Destination Stats: what travellers make of each
 * destination, and what its Verified badge rests on. Read-only: the
 * figures come from the app's visitors, and verification is decided on
 * the Verification page. Nothing here is set by hand.
 */
export function DestinationStatsPage() {
  const query = useGetDestinationStatsQuery();
  const provinces = useGetCatalogQuery("provinces");
  const [scope, setScope] = useState<Scope>("published");
  const [sort, setSort] = useState<SortKey>("rating");
  const [search, setSearch] = useState("");

  const places = useMemo(() => query.data?.places ?? [], [query.data]);
  const provinceName = useMemo(
    () => new Map((provinces.data ?? []).map((row) => [row.id, typeof row.name === "string" ? row.name : ""])),
    [provinces.data],
  );
  const inScope = useMemo(() => places.filter((row) => scope === "all" || row.status === "PUBLISHED"), [places, scope]);
  const needle = search.trim().toLowerCase();
  const rows = inScope.filter((row) => !needle || row.name.toLowerCase().includes(needle)).toSorted((a, b) => compare(a, b, sort));

  /* The figures, over the places in scope. */
  const verified = inScope.filter((row) => row.verified);
  const bases = (["OFFICIAL_SITE", "PARTNER", "PAID", "TRAVELER_SCORE"] as const)
    .map((basis) => [verified.filter((row) => row.basis === basis).length, BASIS_LABELS[basis].toLowerCase()] as const)
    .filter(([n]) => n > 0)
    .map(([n, label]) => `${n} ${label}`)
    .join(" · ");
  const traveler = inScope.filter((row) => row.travelerRecommended).length;
  const ratings = inScope.reduce((sum, row) => sum + row.ratingCount, 0);
  const average = ratings
    ? inScope.reduce((sum, row) => sum + (row.averageRating ?? 0) * row.ratingCount, 0) / ratings
    : null;
  const reviews = inScope.reduce((sum, row) => sum + row.reviewCount, 0);
  const browses = inScope.reduce((sum, row) => sum + row.browses, 0);
  const views = inScope.reduce((sum, row) => sum + row.viewCount, 0);
  const days = query.data?.browseDays ?? 30;
  const published = places.filter((row) => row.status === "PUBLISHED").length;

  return (
    <div className="flex flex-col gap-4">
      <StatGrid>
        <StatTile
          hint={bases || "Verify a place on the Verification page."}
          icon={BadgeCheck}
          label="Verified"
          value={query.data ? `${count(verified.length)} of ${count(inScope.length)}` : null}
        />
        <StatTile
          hint="Earned from reviews, never given."
          icon={ThumbsUp}
          label="Recommended by Traveler"
          value={query.data ? count(traveler) : null}
        />
        <StatTile
          hint={query.data ? `${count(ratings)} ${ratings === 1 ? "rating" : "ratings"} · ${count(reviews)} ${reviews === 1 ? "review" : "reviews"}` : undefined}
          icon={Star}
          label="Average rating"
          value={query.data ? (average == null ? "—" : average.toFixed(1)) : null}
        />
        <StatTile
          hint={query.data ? `${count(views)} views all time` : undefined}
          icon={Eye}
          label={`Browses, last ${days} days`}
          value={query.data ? count(browses) : null}
        />
      </StatGrid>

      <Surface aria-label="Destination stats">
        <SurfaceHeader
          actions={query.data ? <span className="text-xs text-muted tabular-nums">{count(rows.length)} of {count(inScope.length)}</span> : null}
          description="What travellers make of each place, and what its Verified badge rests on. Browses count different signed-in visitors; views count every first open of a day. Verify or revoke on the Verification page."
          title="Every destination"
        />
        <Toolbar>
          <SearchField label="Search destinations" onChange={setSearch} placeholder="Search by name…" value={search} />
          <SegmentedControl
            label="Which destinations"
            onChange={setScope}
            options={[
              { value: "published", label: "Published", count: published },
              { value: "all", label: "All", count: places.length },
            ]}
            value={scope}
          />
          <Select aria-label="Sort" className="h-8 w-52 text-sm" onChange={(event) => setSort(event.target.value as SortKey)} value={sort}>
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
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
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell className="text-right">Rating</TableHeaderCell>
                  <TableHeaderCell className="text-right">Reviews</TableHeaderCell>
                  <TableHeaderCell className="text-right">Browses, {days} days</TableHeaderCell>
                  <TableHeaderCell className="text-right">Views</TableHeaderCell>
                  <TableHeaderCell>Verified</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => {
                  const status = STATUS[row.status];
                  return (
                    <TableRow data-destination-id={row.id} key={row.id}>
                      <TableCell>
                        <Link className="font-medium text-ink hover:text-teal-deep hover:underline" href={`/destinations/${row.id}`}>
                          {row.name}
                        </Link>
                        <p className="truncate text-xs text-muted">{(row.provinceId && provinceName.get(row.provinceId)) || row.slug}</p>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className="font-medium text-ink">{row.averageRating == null ? "—" : row.averageRating.toFixed(1)}</span>
                        <span className="block text-xs text-muted">{count(row.ratingCount)} {row.ratingCount === 1 ? "rating" : "ratings"}</span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{count(row.reviewCount)}</TableCell>
                      <TableCell className="text-right tabular-nums">{count(row.browses)}</TableCell>
                      <TableCell className="text-right tabular-nums">{count(row.viewCount)}</TableCell>
                      <TableCell>
                        <span className="flex flex-wrap items-center gap-1.5">
                          <Badge tone={row.verified ? "info" : "neutral"}>
                            {row.verified && row.basis ? `Verified · ${BASIS_LABELS[row.basis]}` : row.verified ? "Verified" : "Not verified"}
                          </Badge>
                          {row.travelerRecommended ? <Badge tone="success">Recommended by Traveler</Badge> : null}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge dot tone={status?.tone ?? "neutral"}>{status?.label ?? row.status}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="px-4 py-6 text-center text-sm text-muted">
              {needle ? "No destination matches that search." : "No destination yet."}
            </p>
          )
        ) : null}
      </Surface>
    </div>
  );
}
