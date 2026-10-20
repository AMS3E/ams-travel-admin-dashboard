import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listPageLabel, listPageOf } from "@/features/catalog/all-destinations";
import {
  findRecord,
  getReferenceOptions,
} from "@/features/catalog/api/catalog.server";
import type { CatalogRecord } from "@/features/catalog/api/contracts";
import {
  canCreateResource,
  canDeleteRecord,
  canDeleteResource,
  canEditRecord,
  canManageResource,
  canSetStatus,
  namesListingOwner,
  canVerifyDestinations,
  seesOwnRowsOnly,
} from "@/features/auth/permissions";
import { getBackendUserId, requireAdmin } from "@/features/auth/session";
import { ListingForm } from "@/features/catalog/components/listing-form/listing-form";
import { LISTING_GALLERIES, isListing } from "@/features/catalog/components/listing-form/steps";
import { ResourceForm } from "@/features/catalog/components/resource-form";
import { getResource, isResourceKey } from "@/features/catalog/resources";
import { shownRow, withoutField } from "@/features/catalog/resource";
import { PageHeader } from "@/features/shell/components/page-header";
import {
  getVerificationHistory,
  getVerifiedStatus,
} from "@/features/verification/api/verification.server";
import { VerificationPanel } from "@/features/verification/components/verification-panel";
import { DESK_REVIEWERS, listingTypeOf } from "@/features/publishing/api/contracts";
import { reviewPageOf, sendsOwnToAdmin, submissionDesk } from "@/features/publishing/workflow";
import { getPublishRequest } from "@/features/publishing/api/publishing.server";
import { REQUEST_PAGE, RequestReviewPage, requestReviewTitle } from "@/features/publishing/components/request-review-page";
import { BackendApiError } from "@/lib/backend-api.server";
import { isUuid } from "@/lib/ids";

function recordTitle(
  record: CatalogRecord,
  titleField: string,
  fallback: string,
): string {
  const value = record[titleField];
  return typeof value === "string" && value.trim() ? value : `Untitled ${fallback.toLowerCase()}`;
}

async function loadRecord(resource: string, id: string) {
  if (!isResourceKey(resource) || !isUuid(id)) notFound();

  try {
    return await findRecord(resource, id);
  } catch (error) {
    if (error instanceof BackendApiError && (error.status === 400 || error.status === 403 || error.status === 404)) notFound();
    throw error;
  }
}

export async function generateMetadata(
  props: PageProps<"/[resource]/[id]">,
): Promise<Metadata> {
  const { resource, id } = await props.params;
  if (REQUEST_PAGE.test(resource)) return { title: await requestReviewTitle(id) };
  if (!isResourceKey(resource)) return { title: "Not found" };
  const admin = await requireAdmin();
  if (!canManageResource(admin.roles, resource)) notFound();

  const definition = getResource(resource);
  const record = await loadRecord(resource, id);
  return { title: recordTitle(record, definition.titleField, definition.label) };
}

export default async function EditRecordPage(
  props: PageProps<"/[resource]/[id]">,
) {
  const { resource, id } = await props.params;
  /* A request on a desk's page — /partner-requests/{id} — is reviewed beside the listing it puts forward. */
  if (REQUEST_PAGE.test(resource)) return <RequestReviewPage id={id} page={resource} />;
  if (!isResourceKey(resource)) notFound();

  const admin = await requireAdmin();
  if (!canManageResource(admin.roles, resource)) notFound();

  /* Who runs it is asked only of a desk that lists for others; an owner is their own. */
  const definition = namesListingOwner(admin.roles, resource)
    ? getResource(resource)
    : withoutField(getResource(resource), "ownerUserId");
  const scoped = seesOwnRowsOnly(admin.roles, resource);
  const [record, referenceOptions, userId] = await Promise.all([
    loadRecord(resource, id),
    getReferenceOptions(definition, "fields"),
    /* Whose it is: for a role that sees only its own rows, and for an editor's or a BDO's own listing. */
    scoped || sendsOwnToAdmin(admin.roles) ? getBackendUserId() : null,
  ]);

  /*
   * A scoped role may only open what it created. The API would refuse the save
   * anyway — this is so the row never appears to be theirs to edit.
   */
  if (scoped && record.createdBy !== userId) notFound();
  /* A zone is not a tourism region: it has no page among them. */
  if (!shownRow(definition, record)) notFound();
  const canEdit = canEditRecord(admin.roles, resource, record, userId);
  /*
   * Opened from a review — `?review={request}` — to correct the listing before
   * deciding on it: back and save return to that review, and going live is
   * left to the decision there. Only a request still waiting on this listing counts.
   */
  const { review } = await props.searchParams;
  const reviewing = canEdit && isUuid(review) ? await getPublishRequest(review) : null;
  const reviewHref = reviewing && reviewing.targetId === record.id && reviewing.status === "PENDING_REVIEW" ? reviewPageOf(reviewing) : undefined;
  /* An attraction, a stay or a food listing is sent to its desk's reviewer from the form: an editor's or a BDO's own one to an administrator. */
  const own = userId !== null && (record.createdBy === userId || record.ownerUserId === userId);
  const sendsTo = listingTypeOf(resource) && canEdit && (!canSetStatus(admin.roles, resource) || (own && sendsOwnToAdmin(admin.roles))) ? submissionDesk(admin.roles) : null;
  const title = recordTitle(record, definition.titleField, definition.label);

  /*
   * A destination of any kind, an attraction, a stay or a food place, also
   * shows whether it is verified — public, so anyone may read it — and, for a
   * desk that verifies, the decisions behind it. The history answers null
   * outside the caller's desks; the panel then shows the status alone.
   */
  const isDestination = isListing(resource);
  const [verifiedStatus, verificationHistory] = isDestination
    ? await Promise.all([
        getVerifiedStatus(record.id),
        canVerifyDestinations(admin.roles) ? getVerificationHistory(record.id) : null,
      ])
    : [null, null];

  return (
    <div className={`mx-auto flex flex-col gap-5 ${isListing(resource) ? "max-w-7xl" : "max-w-4xl"}`}>
      <PageHeader
        backHref={reviewHref ?? listPageOf(resource)}
        backLabel={reviewHref ? "Back to the review" : listPageLabel(resource, definition.labelPlural)}
        description={reviewHref ? `${definition.label} · correcting it before you decide` : definition.label}
        title={title}
      />

      {isDestination ? (
        <VerificationPanel
          destinationId={record.id}
          history={verificationHistory}
          name={title}
          resource={resource}
          status={verifiedStatus}
        />
      ) : null}

      {isListing(resource) ? (
        <ListingForm
          gallery={{
            canAdd: canCreateResource(admin.roles, LISTING_GALLERIES[resource]),
            canDelete: canDeleteResource(admin.roles, LISTING_GALLERIES[resource]),
          }}
          canDelete={canDeleteRecord(admin.roles, resource, record, userId)}
          canEdit={canEdit}
          afterSaveHref={reviewHref}
          cancelHref={reviewHref}
          canSetStatus={canEdit && canSetStatus(admin.roles, resource) && !reviewHref}
          definition={definition}
          record={record}
          referenceOptions={referenceOptions}
          reviewHref={reviewHref}
          reviewer={sendsTo ? DESK_REVIEWERS[sendsTo] : undefined}
        />
      ) : (
        <ResourceForm
          canEdit={canEdit}
          canDelete={canDeleteRecord(admin.roles, resource, record, userId)}
          canSetStatus={canEdit && canSetStatus(admin.roles, resource)}
          definition={definition}
          record={record}
          referenceOptions={referenceOptions}
        />
      )}

    </div>
  );
}
