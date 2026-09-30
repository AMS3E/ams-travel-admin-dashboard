"use client";
import { useMemo, useState } from "react";
import Image from "next/image";
import { Eye, EyeOff, MessageSquare, Star } from "lucide-react";
import {
  useGetReviewsQuery,
  useModerateReviewMutation,
} from "@/features/editorial/api/editorial-api";
import { useGetCatalogQuery } from "@/features/catalog/api/catalog-api";
import { REVIEW_TARGET_LABELS, REVIEW_TARGET_RESOURCES } from "@/features/dashboard/reviews";
import type { ReviewTarget } from "@/features/dashboard/api/contracts";
import { QueryState } from "./query-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState as NothingHere } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { SearchField, Toolbar } from "@/components/ui/toolbar";

/** Names for the targets reviews point at, from the lists this account can read. */
function useTargetNames(): (type: ReviewTarget, id: string) => string | undefined {
  const destinations = useGetCatalogQuery(REVIEW_TARGET_RESOURCES.DESTINATION);
  const foods = useGetCatalogQuery(REVIEW_TARGET_RESOURCES.FOOD);
  const stays = useGetCatalogQuery(REVIEW_TARGET_RESOURCES.STAY);
  const names = useMemo(() => {
    const byType = new Map<ReviewTarget, Map<string, string>>();
    for (const [type, rows] of [
      ["DESTINATION", destinations.data],
      ["FOOD", foods.data],
      ["STAY", stays.data],
    ] as const) {
      byType.set(type, new Map((rows ?? []).map((row) => [row.id, String(row.name ?? "")])));
    }
    return byType;
  }, [destinations.data, foods.data, stays.data]);
  return (type, id) => names.get(type)?.get(id) || undefined;
}

export function ReviewsPage() {
  const query = useGetReviewsQuery();
  const [moderate, mutation] = useModerateReviewMutation();
  const nameOf = useTargetNames();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const rows = (query.data ?? []).filter(
    (item) =>
      (status === "all" || item.status === status) &&
      [item.authorName, item.title, item.content, nameOf(item.targetType, item.targetId)]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <section aria-label="Reviews" className="panel min-w-0 overflow-hidden">
      <Toolbar>
        <SearchField className="max-w-sm" label="Search reviews" onChange={setSearch} placeholder="Search reviews…" value={search} />
        <Select
          aria-label="Review visibility"
          className="h-8 w-40 text-sm"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="all">All reviews</option>
          <option value="VISIBLE">Visible</option>
          <option value="HIDDEN">Hidden</option>
        </Select>
        <span className="ml-auto text-xs text-muted tabular-nums">
          {rows.length} {rows.length === 1 ? "review" : "reviews"}
        </span>
      </Toolbar>
      {query.isLoading || query.error || mutation.error ? (
        <div className="p-3">
          <QueryState
            loading={query.isLoading}
            error={query.error ?? mutation.error}
            retry={query.refetch}
          />
        </div>
      ) : null}
      <div className="divide-y divide-line">
        {rows.map((item) => {
          const visible = item.status === "VISIBLE";
          const photos = [...(item.photos ?? [])].sort(
            (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
          );
          return (
            <article className="px-4 py-3" key={item.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-medium text-ink">{item.authorName || "Traveler"}</h2>
                  <p className="mt-0.5 text-xs text-muted">
                    {REVIEW_TARGET_LABELS[item.targetType]}
                    {nameOf(item.targetType, item.targetId) ? `: ${nameOf(item.targetType, item.targetId)}` : ""} ·{" "}
                    {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="flex items-center gap-1 text-xs font-medium text-ink-soft tabular-nums">
                  <Star className="size-3.5 fill-gold text-gold" />
                  {item.rating} / 5
                </span>
              </div>
              {item.title && (
                <h3 className="mt-2 text-sm font-medium text-ink">{item.title}</h3>
              )}
              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-ink-soft">
                {item.content || "No written review."}
              </p>
              {photos.length ? (
                <ul className="mt-3 flex flex-wrap gap-2" aria-label="Photos">
                  {photos.map((photo) =>
                    photo.mediaUrl ? (
                      <li key={photo.id}>
                        <Image
                          alt={photo.caption ?? ""}
                          className="size-14 rounded-md object-cover ring-1 ring-line"
                          height={64}
                          src={photo.mediaUrl}
                          unoptimized
                          width={64}
                        />
                      </li>
                    ) : null,
                  )}
                </ul>
              ) : null}
              <div className="mt-2 flex items-center justify-between">
                <Badge dot tone={visible ? "success" : "neutral"}>
                  {visible ? "Visible" : "Hidden"}
                </Badge>
                <Button
                  disabled={mutation.isLoading}
                  onClick={() =>
                    void moderate({
                      id: item.id,
                      status: visible ? "HIDDEN" : "VISIBLE",
                    })
                  }
                  variant="secondary"
                  size="sm"
                >
                  {visible ? (
                    <EyeOff className="size-3.5" />
                  ) : (
                    <Eye className="size-3.5" />
                  )}
                  {visible ? "Hide review" : "Show review"}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
      {!query.isFetching && !query.isError && !rows.length && (
        <NothingHere
          description={search || status !== "all" ? "Try another search or visibility." : "Reviews appear here once travellers write them."}
          icon={MessageSquare}
          title="No reviews match this view"
        />
      )}
    </section>
  );
}
