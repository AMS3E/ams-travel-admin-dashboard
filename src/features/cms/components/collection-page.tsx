"use client";
import { useState } from "react";
import { firstLine } from "@/lib/text";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ImageIcon, Sparkles } from "lucide-react";
import { useGetCatalogQuery } from "@/features/catalog/api/catalog-api";
import { useGetHomepageListQuery } from "@/features/editorial/api/editorial-api";
import type {
  DestinationResponse,
  RecommendationReason,
} from "@/features/catalog/api/contracts";
import { QueryState } from "./query-state";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Surface, SurfaceHeader } from "@/components/ui/surface";
import { SearchField } from "@/components/ui/toolbar";

type List = "recommended" | "popular" | "featured";

/*
 * Recommended and Popular lead with the destinations marked Featured, then
 * rank the rest by what visitors browse. Nobody picks the ranked part by hand,
 * so these pages show the lists rather than edit them.
 */
const RANKED: Partial<Record<List, { path: "popular" | "recommendations/for-you"; rule: string }>> = {
  popular: {
    path: "popular",
    rule: "Featured destinations first, always. Then the places visitors browsed most in the last 30 days.",
  },
  recommended: {
    path: "recommendations/for-you",
    rule: "Featured destinations first, always. Then, for a signed-in visitor, places like the ones they browse; for everyone else, the places browsed most.",
  },
};

const REASONS: Readonly<Record<RecommendationReason, { label: string; tone: "neutral" | "info" }>> = {
  MOST_BROWSED: { label: "Most browsed", tone: "neutral" },
  LIKE_YOUR_BROWSING: { label: "Like your browsing", tone: "neutral" },
  FEATURED: { label: "Featured", tone: "info" },
};

export function CollectionPage({ list }: { readonly list: List }) {
  const query = useGetCatalogQuery("destinations");
  const destinations = (query.data ?? []) as unknown as DestinationResponse[];
  const ranked = RANKED[list];
  return (
    <div className="flex flex-col gap-4">
      {ranked ? (
        <LiveList destinations={destinations} path={ranked.path} rule={ranked.rule} />
      ) : null}
      <FeaturedDestinations
        destinations={destinations}
        error={query.error}
        loading={query.isLoading}
        fetching={query.isFetching}
        retry={query.refetch}
        compact={Boolean(ranked)}
      />
    </div>
  );
}

/** The list as the homepage shows it right now, with why each place is on it. */
function LiveList({
  path,
  rule,
  destinations,
}: {
  readonly path: "popular" | "recommendations/for-you";
  readonly rule: string;
  readonly destinations: readonly DestinationResponse[];
}) {
  const query = useGetHomepageListQuery(path);
  const names = new Map(destinations.map((item) => [item.id, item.name]));
  const entries = query.data?.destinations ?? [];
  return (
    <Surface>
      <SurfaceHeader description={rule} title="Live on the homepage" />
      {query.isLoading || query.error ? (
        <div className="p-3">
          <QueryState
            loading={query.isLoading}
            error={query.error}
            retry={query.refetch}
          />
        </div>
      ) : null}
      {query.data &&
        (entries.length ? (
          <ol className="grid divide-y divide-line md:grid-cols-2 md:divide-y-0 md:[&>li]:border-b md:[&>li]:border-line md:[&>li:nth-child(odd)]:border-r">
            {entries.map((entry, index) => (
              <li
                className="flex items-center gap-3 px-4 py-2.5 text-sm"
                key={entry.destinationId}
              >
                <span className="w-5 shrink-0 text-right text-xs text-muted tabular-nums">{index + 1}</span>
                <Link
                  className="min-w-0 flex-1 truncate font-medium text-ink hover:text-teal-deep hover:underline"
                  href={"/destinations/" + entry.destinationId}
                >
                  {names.get(entry.destinationId) ?? "A destination outside your workspace"}
                </Link>
                <span className="shrink-0 text-xs text-muted">
                  {entry.browses} {entry.browses === 1 ? "browse" : "browses"}
                </span>
                <Badge tone={REASONS[entry.reason]?.tone ?? "neutral"}>
                  {REASONS[entry.reason]?.label ?? entry.reason}
                </Badge>
              </li>
            ))}
          </ol>
        ) : (
          <p className="px-4 py-6 text-center text-sm text-muted">
            Nothing to show yet: no place has browses, and no published place is featured.
          </p>
        ))}
    </Surface>
  );
}

/**
 * The destinations marked Featured — the one editorial say left over these
 * lists. The switch itself is on each destination's form.
 */
function FeaturedDestinations({
  destinations,
  loading,
  fetching,
  error,
  retry,
  compact,
}: {
  readonly destinations: readonly DestinationResponse[];
  readonly loading: boolean;
  readonly fetching: boolean;
  readonly error: unknown;
  readonly retry: () => unknown;
  readonly compact: boolean;
}) {
  const [search, setSearch] = useState("");
  const featured = destinations.filter(
    (item) => item.isFeatured && item.name.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <Surface>
      <SurfaceHeader
        actions={
          <SearchField className="w-56" label="Search featured destinations" onChange={setSearch} placeholder="Search destinations…" value={search} />
        }
        description={
          compact
            ? "These always lead the list. Mark or unmark one on its form."
            : "Mark or unmark a destination as featured on its form."
        }
        title="Featured destinations"
      />
      {loading || error ? (
        <div className="p-3">
          <QueryState loading={loading} error={error} retry={retry} />
        </div>
      ) : null}
      <div className={featured.length ? "grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "hidden"}>
        {featured.map((item) => (
          <article key={item.id} className="overflow-hidden rounded-lg border border-line bg-paper">
            <div className="relative aspect-video bg-sand-deep">
              {item.coverUrl ? (
                <Image
                  fill
                  unoptimized
                  className="object-cover"
                  alt={item.name}
                  src={item.coverUrl}
                />
              ) : (
                <div className="grid h-full place-items-center text-muted">
                  <ImageIcon className="size-6" strokeWidth={1.75} />
                </div>
              )}
              <div className="absolute left-2 top-2">
                <Badge dot tone={item.status === "PUBLISHED" ? "success" : "neutral"}>
                  {item.status === "PUBLISHED" ? "Published" : item.status === "ARCHIVED" ? "Archived" : "Draft"}
                </Badge>
              </div>
            </div>
            <div className="flex items-start justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-medium text-ink">{item.name}</h3>
                <p className="mt-0.5 truncate text-xs text-muted">
                  {firstLine(item.description) || item.address || "Explore Cambodia"}
                </p>
              </div>
              <Link
                aria-label={"Edit " + item.name}
                href={"/destinations/" + item.id}
                className="text-muted hover:text-teal-deep"
              >
                <ArrowUpRight className="size-4" />
              </Link>
            </div>
          </article>
        ))}
      </div>
      {!fetching && !error && !featured.length && (
        <EmptyState
          description={search ? "Try another name." : "Tick Featured on a destination's form to add it here."}
          icon={Sparkles}
          title={search ? "No featured destination matches your search" : "No destination is featured yet"}
        />
      )}
    </Surface>
  );
}
