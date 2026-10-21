import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { getBackendUserId, getCurrentAdmin } from "@/features/auth/session";
import { hasAnyPermission, hasPermission } from "@/features/auth/permissions";
import { requireAdminToken } from "@/lib/api-route.server";
import { backendRequest } from "@/lib/backend-api.server";
import type { DashboardResponse } from "@/features/dashboard/api/dashboard-api";

export async function GET() {
  const session = await requireAdminToken();
  if ("response" in session) return session.response;
  const token = session.token;
  const admin = await getCurrentAdmin();
  const grants = admin?.roles ?? [];
  const failures: string[] = [];
  /* The sections that could not be read, named in the reader's language. */
  const source = await getTranslations("dashboard.sources");
  async function read<T>(
    label: string,
    path: string,
    enabled: boolean,
  ): Promise<T | null> {
    if (!enabled) return null;
    try {
      return await backendRequest<T>(path, {}, token);
    } catch {
      failures.push(label);
      return null;
    }
  }
  const canReview = hasAnyPermission(grants, [
    "PERM_PARTNER_PUBLISH_APPROVE",
    "PERM_CONTRIBUTOR_PUBLISH_APPROVE",
  ]);
  /* A reviewer who also submits — an editor or a BDO — needs both lists. */
  const viewsOwn = hasPermission(grants, "PERM_PUBLISH_REQUEST_VIEW_OWN");
  /* Stays, food listings and activities: a partner writes their own, an editor, a BDO or an administrator all of them. */
  const managesListings = hasAnyPermission(grants, ["PERM_DESTINATION_EDIT_ANY", "PERM_FULL_CONTROL"]);
  const writesListings = managesListings || hasPermission(grants, "PERM_LISTING_EDIT_OWN");
  const [overview, destinations, requests, audit, ownRequests, stays, foods, activities, userId] = await Promise.all([
    /* A moderator reads the review tiles; the API adds table counts for full control alone. */
    read<NonNullable<DashboardResponse["overview"]>>(
      source("overview"),
      "/admin/overview",
      hasAnyPermission(grants, ["PERM_FULL_CONTROL", "PERM_REVIEW_MODERATE"]),
    ),
    read<NonNullable<DashboardResponse["destinations"]>>(
      source("destinations"),
      "/destinations/workspace",
      hasAnyPermission(grants, [
        "PERM_LISTING_EDIT_OWN",
        "PERM_DESTINATION_DRAFT_EDIT_OWN",
        "PERM_DESTINATION_EDIT_ANY",
        "PERM_PARTNER_PUBLISH_APPROVE",
      ]),
    ),
    read<NonNullable<DashboardResponse["requests"]>>(
      source("requests"),
      canReview ? "/publish-requests" : "/publish-requests/mine",
      canReview || hasPermission(grants, "PERM_PUBLISH_REQUEST_VIEW_OWN"),
    ),
    read<NonNullable<DashboardResponse["audit"]>>(
      source("audit"),
      "/admin/audit?limit=200",
      hasPermission(grants, "PERM_AUDIT_VIEW"),
    ),
    read<NonNullable<DashboardResponse["mine"]>>(
      source("mine"),
      "/publish-requests/mine",
      canReview && viewsOwn,
    ),
    read<NonNullable<DashboardResponse["stays"]>>(source("stays"), "/stays", writesListings),
    read<NonNullable<DashboardResponse["foods"]>>(source("foods"), "/foods", writesListings),
    read<NonNullable<DashboardResponse["activities"]>>(source("activities"), "/activities", writesListings),
    managesListings ? Promise.resolve(null) : getBackendUserId(),
  ]);
  /*
   * The API lists every stay and food listing to the back office; a partner is
   * shown only the ones listed in their name, here rather than in the browser.
   */
  const own = <T extends { readonly ownerUserId?: string | null; readonly createdBy?: string | null }>(rows: T[] | null): T[] | null =>
    rows === null || managesListings
      ? rows
      : rows.filter((row) => userId !== null && (row.ownerUserId === userId || row.createdBy === userId));
  return NextResponse.json({
    overview,
    /* An attraction a contributor wrote is theirs; the rest of the catalogue is not their board's business. */
    destinations: own(destinations),
    stays: own(stays),
    foods: own(foods),
    activities: own(activities),
    requests,
    mine: canReview ? ownRequests : requests,
    audit,
    failures,
  } satisfies DashboardResponse);
}
