import Link from "next/link";
import { notFound } from "next/navigation";
import { PencilLine } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { canEditRecord, canManageResource, namesListingOwner } from "@/features/auth/permissions";
import { getBackendUserId, requireAdmin } from "@/features/auth/session";
import { findRecord, getRecords, getReferenceOptions } from "@/features/catalog/api/catalog.server";
import type { CatalogRecord } from "@/features/catalog/api/contracts";
import { LISTING_GALLERIES, readinessChecks } from "@/features/catalog/components/listing-form/steps";
import {
  galleryOf,
  mediaPath,
  toFormValues,
  withoutField,
  type ResourceDefinition,
} from "@/features/catalog/resource";
import { getResource } from "@/features/catalog/resources";
import { PageHeader } from "@/features/shell/components/page-header";
import { navigationForPath } from "@/features/shell/nav";
import { BackendApiError } from "@/lib/backend-api.server";
import { isUuid } from "@/lib/ids";
import { LISTING_RESOURCES, listingHref } from "../api/contracts";
import { getPublishRequest } from "../api/publishing.server";
import { listingLabel } from "../listings";
import { decidesRequest } from "../workflow";
import { checkedLines, reviewValue } from "../review";
import { ListingReview, type ReviewItem, type ReviewPhoto } from "./listing-review";
import { ReviewDecision } from "./review-decision";

/** The desk pages a request is reviewed under: `/partner-requests/{id}` and the rest. */
export const REQUEST_PAGE = /^(partner|contributor|editor|bdo|publish)-requests$/;

/** The page's title: the listing under review. */
export async function requestReviewTitle(id: string): Promise<string> {
  const request = isUuid(id) ? await getPublishRequest(id) : null;
  return request ? `Review · ${request.targetName}` : "Not found";
}

/** A gallery's rows for this listing, in the order its author arranged them. */
function photosOf(listingId: string, gallery: ResourceDefinition, rows: readonly CatalogRecord[]): ReviewPhoto[] {
  const shape = galleryOf(gallery);
  if (!shape) return [];
  const order = gallery.orderField;
  return rows
    .filter((row) => String(row[shape.owner.name] ?? "") === listingId)
    .toSorted((a, b) => (order ? Number(a[order] ?? 0) - Number(b[order] ?? 0) : 0))
    .map((row) => {
      const key = String(row[shape.file.name] ?? "");
      const url = shape.file.urlField ? String(row[shape.file.urlField] ?? "") : "";
      return { key, url: url || mediaPath(key) };
    })
    .filter((photo) => photo.key);
}

/** Rooms of this listing, each with its first photo, in their order. */
function itemsOf(
  listingId: string,
  owner: string,
  definition: ResourceDefinition,
  rows: readonly CatalogRecord[],
  photoUrls: ReadonlyMap<string, string>,
): ReviewItem[] {
  return rows
    .filter((row) => String(row[owner] ?? "") === listingId)
    .map((row) => {
      const values = toFormValues(definition, row);
      const keys = Array.isArray(values.photoKeys) ? values.photoKeys : [];
      return { id: row.id, values, photoUrl: keys.length ? (photoUrls.get(keys[0]) ?? mediaPath(keys[0])) : undefined };
    })
    .toSorted((a, b) => Number(a.values.sortOrder || 0) - Number(b.values.sortOrder || 0));
}

/**
 * A request, reviewed: the listing as its author sent it beside the decision.
 * Reached from any desk's requests page, the bell and the dashboard. The API
 * decides who may read it — the desk that answers it and the account that
 * sent it — and anyone else finds nothing here.
 */
export async function RequestReviewPage({ page, id }: { readonly page: string; readonly id: string }) {
  if (!isUuid(id)) notFound();
  const admin = await requireAdmin();
  const request = await getPublishRequest(id);
  if (!request) notFound();

  const resource = LISTING_RESOURCES[request.targetType];
  /* Who runs it is read by the desks that name one; to its own author it says only themselves. */
  const definition = namesListingOwner(admin.roles, resource)
    ? getResource(resource)
    : withoutField(getResource(resource), "ownerUserId");
  const galleryDefinition = getResource(LISTING_GALLERIES[resource]);
  let record: CatalogRecord;
  try {
    record = await findRecord(resource, request.targetId);
  } catch (error) {
    if (error instanceof BackendApiError && (error.status === 403 || error.status === 404)) notFound();
    throw error;
  }

  const [lists, galleryRows, roomRows, userId] = await Promise.all([
    getReferenceOptions(definition, "fields"),
    getRecords(galleryDefinition.key).catch(() => []),
    request.targetType === "STAY" ? getRecords("stay-rooms").catch(() => []) : [],
    getBackendUserId(),
  ]);

  /*
   * A listing's owner is the partner who sent it. A reviewer who may not read
   * the accounts list still reads their name, from the request.
   */
  const people = lists.users ?? [];
  const options = request.requestedByName && !people.some((person) => person.value === request.requestedBy)
    ? { ...lists, users: [...people, { value: request.requestedBy, label: request.requestedByName, inactive: false }] }
    : lists;

  const photos = photosOf(record.id, galleryDefinition, galleryRows);
  const photoUrls = new Map(photos.map((photo) => [photo.key, photo.url]));
  const rooms = itemsOf(record.id, "stayId", getResource("stay-rooms"), roomRows, photoUrls);

  const values = toFormValues(definition, record);
  const kindField = definition.fields.find((field) => field.name === (resource === "destinations" ? "theme" : "type"));
  const kind = kindField && typeof values[kindField.name] === "string" ? (values[kindField.name] as string) || undefined : undefined;
  /* The counts the form keeps for itself, so "At least one room" is answered too. */
  const lines = checkedLines(readinessChecks(definition, kind), {
    ...values,
    rooms: rooms.length ? String(rooms.length) : "",
  });

  const coverKey = typeof values.coverKey === "string" ? values.coverKey : "";
  const cover = (typeof record.coverUrl === "string" && record.coverUrl) || (coverKey ? mediaPath(coverKey) : null);
  const currency = typeof values.currency === "string" && values.currency.trim() ? values.currency.trim().toUpperCase() : "USD";
  const kindLabel = kindField ? reviewValue(kindField, values, options) : null;
  const address = typeof values.address === "string" ? values.address.trim() : "";
  const backHref = `/${page}`;
  const backLabel = navigationForPath(backHref, admin.roles)?.label ?? "Requests";
  const canEdit = canManageResource(admin.roles, resource) && canEditRecord(admin.roles, resource, record, userId);
  const canDecide = decidesRequest(admin.roles, request, userId);
  /* Their own submission: they publish it themselves rather than asking an administrator. */
  const own = request.requestedBy === userId;
  /* A reviewer who corrects it first comes back here to decide; anyone else just opens the listing. */
  const editHref = canEdit ? (canDecide ? `${listingHref(request)}?review=${request.id}` : listingHref(request)) : null;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
      <PageHeader
        backHref={backHref}
        backLabel={backLabel}
        actions={editHref && canDecide ? (
          <Link className={buttonVariants({ variant: "secondary", size: "sm" })} href={editHref}>
            <PencilLine aria-hidden className="size-3.5" />
            Edit before approving
          </Link>
        ) : undefined}
        description={[listingLabel(request.targetType), typeof kindLabel === "string" ? kindLabel : null, address || null].filter(Boolean).join(" · ")}
        title={request.targetName}
      />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* On a phone the decision and its checklist come first; beside the listing on a wide screen. */}
        <div className="min-w-0 lg:sticky lg:top-20 lg:order-2 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <ReviewDecision
            backHref={backHref}
            backLabel={backLabel}
            canDecide={canDecide}
            editHref={editHref}
            own={own}
            lines={lines}
            request={request}
          />
        </div>
        <div className="min-w-0 lg:order-1">
          <ListingReview
            cover={cover}
            currency={currency}
            definition={definition}
            kind={kind}
            options={options}
            photos={photos}
            rooms={rooms}
            values={values}
          />
        </div>
      </div>
    </div>
  );
}
