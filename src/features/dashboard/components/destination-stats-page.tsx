"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BadgeCheck, Eye, Star, ThumbsUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Surface, SurfaceHeader } from "@/components/ui/surface";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/table";
import { SearchField, SegmentedControl, Toolbar } from "@/components/ui/toolbar";
import { useGetCatalogQuery } from "@/features/catalog/api/catalog-api";
import { HelpIcon } from "@/features/catalog/components/listing-form/listing-field";
import { byName } from "@/features/catalog/resources";
import { QueryState } from "@/features/cms/components/query-state";
import { BASIS_LABELS } from "@/features/verification/api/contracts";
import { useGetDestinationStatsQuery } from "../api/dashboard-api";
import type { DestinationStatsPeriod, DestinationStatsRow } from "../api/contracts";
import { StatGrid, StatTile } from "./stat-tile";

type Scope = "published" | "all";
type Period = "all" | "today" | "week" | "month" | "custom";
type SortKey = "rating" | "reviews" | "browses" | "views" | "name";

const PERIODS: readonly { readonly value: Period; readonly label: string }[] = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "custom", label: "Custom" },
];

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

/** A calendar date as the API takes it, in the viewer's own day. */
function isoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The dates a period stands for: today's, this week's from Monday, this month's from the 1st, or the ones typed. */
function windowOf(period: Period, custom: DestinationStatsPeriod): DestinationStatsPeriod {
  const now = new Date();
  const today = isoDate(now);
  switch (period) {
    case "today":
      return { from: today, to: today };
    case "week": {
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      return { from: isoDate(monday), to: today };
    }
    case "month":
      return { from: `${today.slice(0, 7)}-01`, to: today };
    case "custom":
      return { ...(custom.from ? { from: custom.from } : {}), ...(custom.to ? { to: custom.to } : {}) };
    default:
      return {};
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
        <StatTile icon={BadgeCheck} label="Verified" value={query.data ? count(verified) : null} />
        <StatTile icon={ThumbsUp} label="Recommended by Traveler" value={query.data ? count(traveler) : null} />
        <StatTile icon={Star} label="Average rating" value={query.data ? (average == null ? "—" : average.toFixed(1)) : null} />
        <StatTile icon={Eye} label="Browses" value={query.data ? count(browses) : null} />
      </StatGrid>

      <Surface aria-label="Destination stats">
        <SurfaceHeader
          actions={query.data ? <span className="text-xs text-muted tabular-nums">{count(rows.length)} of {count(inScope.length)}</span> : null}
          description="What travellers make of each place, and what its Verified badge rests on. Browses count different signed-in visitors; views count every first open of a day. Verify or revoke on the Verification page."
          title="Every destination"
        />
        <Toolbar>
          <SegmentedControl label="Period" onChange={setPeriod} options={PERIODS} value={period} />
          {period === "custom" ? (
            <span className="flex items-center gap-1.5 text-xs text-muted" data-field="custom-period">
              <Input
                aria-label="From"
                className="h-8 w-36 text-sm"
                max={custom.to}
                onChange={(event) => setCustom((range) => ({ ...range, from: event.target.value || undefined }))}
                type="date"
                value={custom.from ?? ""}
              />
              to
              <Input
                aria-label="To"
                className="h-8 w-36 text-sm"
                min={custom.from}
                onChange={(event) => setCustom((range) => ({ ...range, to: event.target.value || undefined }))}
                type="date"
                value={custom.to ?? ""}
              />
            </span>
          ) : null}
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
            {SORTS.filter((option) => allTime || option.value !== "views").map((option) => (
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
                  <TableHeaderCell className="text-right">Browses</TableHeaderCell>
                  {allTime ? <TableHeaderCell className="text-right">Views</TableHeaderCell> : null}
                  <TableHeaderCell>
                    <span className="inline-flex items-center gap-1">
                      Verified
                      <HelpIcon id="stats-verified-help" label="Verified" text="As of today, whatever the period. A badge is never filtered by date." />
                    </span>
                  </TableHeaderCell>
                  <TableHeaderCell>
                    <span className="inline-flex items-center gap-1">
                      Status
                      <HelpIcon id="stats-status-help" label="Status" text="Today's status, whatever the period." />
                    </span>
                  </TableHeaderCell>
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
                      {allTime ? <TableCell className="text-right tabular-nums">{count(row.viewCount)}</TableCell> : null}
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
