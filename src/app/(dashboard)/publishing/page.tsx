import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { canManageResource, hasPermission } from "@/features/auth/permissions";
import { getBackendUserId, requireAdmin } from "@/features/auth/session";
import { getRecords } from "@/features/catalog/api/catalog.server";
import type { FoodResponse, StayResponse } from "@/features/catalog/api/contracts";
import { getDestinations } from "@/features/dashboard/api/dashboard.server";
import { DashboardSection } from "@/features/dashboard/components/dashboard-section";
import {
  getMyRequests,
  getReviewQueue,
} from "@/features/publishing/api/publishing.server";
import { LISTING_RESOURCES, isAwaitingDecision, type ListingType } from "@/features/publishing/api/contracts";
import { listingRows } from "@/features/publishing/listings";
import { submittableListings } from "@/features/publishing/workflow";
import { DecisionForm } from "@/features/publishing/components/decision-form";
import { RequestRows } from "@/features/publishing/components/request-rows";
import { SubmitRequestForm } from "@/features/publishing/components/submit-request-form";
import { PageHeader } from "@/features/shell/components/page-header";

export const metadata: Metadata = { title: "Publishing" };

/**
 * One screen, two jobs, decided by the token.
 *
 * A partner and a contributor submit and track; a BDO and an editor decide. An
 * administrator holds both sides and sees both. Nobody sees the other desk's
 * queue: the API answers `/publish-requests` from the caller's own permissions,
 * so what arrives here is already scoped.
 */
export default async function PublishingPage() {
  const admin = await requireAdmin();
  const maySubmit = hasPermission(admin.roles, "PERM_PUBLISH_REQUEST_SUBMIT");
  const mayReview =
    hasPermission(admin.roles, "PERM_PARTNER_PUBLISH_APPROVE") ||
    hasPermission(admin.roles, "PERM_CONTRIBUTOR_PUBLISH_APPROVE");

  if (!maySubmit && !mayReview) notFound();

  /* A stay or a food listing is read only by an account that writes them: a partner, or one who manages them all. */
  const writesListings = maySubmit && canManageResource(admin.roles, "stays");
  const [mine, queue, destinations, stays, foods, userId] = await Promise.all([
    maySubmit ? getMyRequests() : [],
    mayReview ? getReviewQueue() : [],
    maySubmit ? getDestinations() : [],
    writesListings ? getRecords("stays").catch(() => []) : [],
    writesListings ? getRecords("foods").catch(() => []) : [],
    maySubmit ? getBackendUserId() : null,
  ]);

  /* What this account wrote — an attraction, a stay or a food listing — that is not live and not already waiting. */
  const submittable = submittableListings(
    listingRows({
      destinations,
      stays: stays as unknown as StayResponse[],
      foods: foods as unknown as FoodResponse[],
    }),
    mine,
    userId,
  ).map((listing) => ({ type: listing.type, id: listing.id, name: listing.name }));

  const waiting = queue.filter(isAwaitingDecision);
  const returned = queue.filter(
    (request) => request.status === "DRAFT",
  );
  const decided = queue.filter(
    (request) =>
      request.status === "PUBLISHED" || request.status === "REJECTED" || request.status === "UNPUBLISHED",
  );
  /* A request row opens its listing only for a role the API would let open it. */
  const openable = (Object.keys(LISTING_RESOURCES) as ListingType[]).filter((type) =>
    canManageResource(admin.roles, LISTING_RESOURCES[type]),
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <PageHeader
        description="An attraction, a stay or a food listing goes live when the desk responsible for it says so. Partners are answered by a BDO, contributors by an editor, and editors and BDOs by an administrator."
        eyebrow="Workflow"
        title="Publishing"
      />

      {mayReview ? (
        <>
          <DashboardSection
            description="Approving publishes the listing in the same step."
            title="Awaiting your decision"
          >
            <RequestRows
              actions={(request) => <DecisionForm requestId={request.id} />}
              openable={openable}
              empty="Your queue is clear."
              requests={waiting}
              showRequester
            />
          </DashboardSection>

          <DashboardSection
            description="Sent back to their author, and off your queue until they answer."
            title="Waiting on changes"
          >
            <RequestRows
              openable={openable}
              empty="Nothing is waiting on its author."
              requests={returned}
              showRequester
            />
          </DashboardSection>

          <DashboardSection title="Recently decided">
            <RequestRows
              openable={openable}
              empty="Nothing has been decided yet."
              limit={8}
              requests={decided}
              showRequester
            />
          </DashboardSection>
        </>
      ) : null}

      {maySubmit ? (
        <>
          <DashboardSection
            description="What you own that is not live and not already with a reviewer — including anything sent back for changes."
            title="Submit for publishing"
          >
            <SubmitRequestForm options={submittable} />
          </DashboardSection>

          <DashboardSection
            description="Where each of your asks stands, and what the reviewer said."
            title="Your requests"
          >
            <RequestRows
              openable={openable}
              empty="You have not submitted anything yet."
              requests={mine}
            />
          </DashboardSection>
        </>
      ) : null}
    </div>
  );
}
