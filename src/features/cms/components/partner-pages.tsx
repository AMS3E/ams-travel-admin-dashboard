"use client";
import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronRight, Store } from "lucide-react";
import { useGetCurrentUserQuery } from "@/features/auth/api/auth-api";
import {
  canManageResource,
  hasAnyPermission,
} from "@/features/auth/permissions";
import { useGetDashboardQuery } from "@/features/dashboard/api/dashboard-api";
import { LISTING_RESOURCES } from "@/features/publishing/api/contracts";
import { useGetPublishRequestsQuery } from "@/features/publishing/api/publishing-api";
import { listingPath, listingRows } from "@/features/publishing/listings";
import { QueryState } from "./query-state";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchField, Toolbar } from "@/components/ui/toolbar";

/**
 * The attractions, stays and food listings partners have submitted for
 * publication, as far as this workspace can see them.
 */
export function PartnerListingsPage() {
  const t = useTranslations("cms");
  const { data: user } = useGetCurrentUserQuery();
  const grants = user?.roles ?? [];
  const requests = useGetPublishRequestsQuery(
    {
      mine: !hasAnyPermission(grants, [
        "PERM_PARTNER_PUBLISH_APPROVE",
        "PERM_CONTRIBUTOR_PUBLISH_APPROVE",
      ]),
    },
    { skip: !user },
  );
  const catalog = useGetDashboardQuery(undefined, { skip: !user });
  const [search, setSearch] = useState("");
  const partnerIds = new Set(
    (requests.data ?? [])
      .filter((item) => item.desk === "PARTNER")
      .map((item) => item.targetId),
  );
  const listings = listingRows(catalog.data ?? {})
    .filter(
      (item) =>
        partnerIds.has(item.id) &&
        item.name.toLowerCase().includes(search.toLowerCase()),
    );
  const error = requests.error ?? catalog.error;
  return (
    <section aria-label={t("partners.label")} className="panel min-w-0 overflow-hidden">
      <Toolbar>
        <SearchField className="max-w-sm" label={t("partners.search")} onChange={setSearch} placeholder={t("partners.searchPlaceholder")} value={search} />
        <span className="ml-auto text-xs text-muted tabular-nums">
          {t("listings", { count: listings.length })}
        </span>
      </Toolbar>
      <p className="border-b border-line bg-sand px-4 py-2 text-xs text-muted">
        {t("partners.intro")}
      </p>
      {requests.isLoading || catalog.isLoading || error ? (
        <div className="p-3">
          <QueryState
            loading={requests.isLoading || catalog.isLoading}
            error={error}
            retry={() => {
              void requests.refetch();
              void catalog.refetch();
            }}
          />
        </div>
      ) : null}
      <ul className="divide-y divide-line">
        {listings.map((item) => {
          const body = (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">{item.name}</span>
                <span className="block truncate text-xs text-muted">
                  {item.detail || item.summary || t("partners.fallback")}
                </span>
              </span>
              <Badge tone="neutral">{t(`listing.${item.type}`)}</Badge>
              <Badge dot tone={item.status === "PUBLISHED" ? "success" : "neutral"}>
                {item.status === "PUBLISHED" ? t("status.PUBLISHED") : item.status === "ARCHIVED" ? t("status.ARCHIVED") : t("status.DRAFT")}
              </Badge>
            </>
          );
          return (
            <li key={item.id}>
              {/* Only offer the detail screen to a role the API would let open it. */}
              {canManageResource(grants, LISTING_RESOURCES[item.type]) ? (
                <Link className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-sand" href={listingPath(item)}>
                  {body}
                  <ChevronRight aria-hidden className="size-4 shrink-0 text-muted" />
                </Link>
              ) : (
                <div className="flex items-center gap-3 px-4 py-2.5">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
      {!requests.isFetching && !catalog.isFetching && !error && !listings.length && (
        <EmptyState
          description={t("partners.empty.description")}
          icon={Store}
          title={t("partners.empty.title")}
        />
      )}
    </section>
  );
}
