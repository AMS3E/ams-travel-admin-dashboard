"use client";
import { ReviewsPage } from "./editorial-pages";
import { PublishRequestsPage } from "@/features/publishing/components/publish-requests-page";
import { PartnerListingsPage } from "./partner-pages";
import { ContentWorkspace } from "./content-workspace";
import { canVerifyDestinations, primaryRole, reviewsDesk } from "@/features/auth/permissions";
import { DESKS, type Desk } from "@/features/shell/nav";
import { STAFF_PAGES } from "@/features/publishing/workflow";
import { VerificationQueue } from "@/features/verification/components/verification-queue";
import { DestinationStatsPage } from "@/features/dashboard/components/destination-stats-page";
import { RegionTaxonomyTree } from "@/features/catalog/components/region-taxonomy-tree";
import {
  CustomersPage,
  RolesPage,
  SettingsPage,
} from "./system-pages";

const DESK_PAGE = /^(partner|contributor|editor|bdo)-(requests|draft|listing-approvals)$/;

/**
 * Grants come from the server route rather than a client query.
 *
 * A control gated on `useGetCurrentUserQuery` is absent from the server HTML
 * and only appears once that request resolves in the browser — so a screen
 * whose only action is permission-gated looks, for a moment, like a screen with
 * no action at all. The route has already verified the token to render at all;
 * passing what it knows renders the control in the first paint.
 */
export function CmsPage({
  grants,
  resource,
  userId = null,
}: {
  readonly grants: readonly string[];
  readonly resource: string;
  readonly userId?: string | null;
}) {
  /*
   * A desk's three pages. One URL each, answered from where the viewer stands:
   * the desk that reviews it sees the queue and acts on it, the account that
   * submitted to it sees its own requests and drafts.
   */
  const page = resource.match(DESK_PAGE);
  if (page) {
    const desk = DESKS[page[1] as Desk].desk;
    /* The editors' and the BDOs' pages share the STAFF desk; each lists only its own role's requests. */
    const requester = STAFF_PAGES[page[1]];
    const reviewing = reviewsDesk(grants, desk);
    switch (page[2]) {
      case "requests":
        return <PublishRequestsPage desk={desk} deskPage={page[1]} requester={requester} userId={userId} />;
      case "listing-approvals":
        return <PublishRequestsPage desk={desk} deskPage={page[1]} requester={requester} userId={userId} approvalsOnly />;
      case "draft":
        return reviewing
          ? <ContentWorkspace view="drafts" desk={desk} requester={requester} userId={userId} />
          : <ContentWorkspace view="drafts" own userId={userId} />;
    }
  }
  switch (resource) {
    case "drafts": {
      /* An editor sees contributor drafts and their own; a BDO partner drafts and theirs; an administrator all. */
      const role = primaryRole(grants);
      const desk = role === "EDITOR" ? DESKS.contributor.desk : role === "BDO" ? DESKS.partner.desk : undefined;
      return desk
        ? <ContentWorkspace view="drafts" desk={desk} own userId={userId} />
        : <ContentWorkspace view="drafts" userId={userId} />;
    }
    case "publish-requests":
      return <PublishRequestsPage userId={userId} />;
    case "reviews":
      return <ReviewsPage />;
    case "partner-listings":
      return <PartnerListingsPage />;
    case "verification":
      /* The route already found this page in the viewer's sidebar; this is the same rule, stated again. */
      return canVerifyDestinations(grants) ? <VerificationQueue grants={grants} /> : null;
    case "destination-stats":
      return <DestinationStatsPage />;
    case "categories-and-tags":
      return <RegionTaxonomyTree grants={grants} />;
    case "users":
      return <CustomersPage grants={grants} />;
    case "roles":
      return <RolesPage grants={grants} />;
    case "settings":
      return <SettingsPage />;
    default:
      return null;
  }
}
