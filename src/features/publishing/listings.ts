import type { DestinationResponse, FoodResponse, PublicationStatus, StayResponse } from "@/features/catalog/api/contracts";
import { mediaPath } from "@/features/catalog/resource";
import { LISTING_NOUNS, LISTING_RESOURCES, type ListingType } from "./api/contracts";

/**
 * Anything a partner or a contributor writes and a reviewer puts live — an
 * attraction, a stay or a food listing — as the drafts and requests screens
 * list it. Ids are UUIDs, unique across the three tables, so the id alone
 * names a listing.
 */
export interface ListingRow {
  readonly type: ListingType;
  readonly id: string;
  readonly name: string;
  /** Where it is, or what it is, in a line. */
  readonly detail: string | null;
  readonly summary: string | null;
  /** Its cover photo's link, when it has one. */
  readonly cover: string | null;
  readonly status: PublicationStatus;
  readonly isFeatured: boolean;
  /**
   * Who may send it for review: who wrote an attraction; the partner a stay or
   * a food listing is listed for (and who wrote a food listing).
   */
  readonly authors: readonly string[];
  readonly createdAt: string | null;
  /** When it last changed: its update, or its creation for one never changed. */
  readonly updatedAt: string | null;
}

/** The three tables' rows, as listing rows. */
export interface ListingSources {
  readonly destinations?: readonly DestinationResponse[] | null;
  readonly stays?: readonly StayResponse[] | null;
  readonly foods?: readonly FoodResponse[] | null;
}

/** Where a row's cover is read: the link the API made, or one made from its key. */
const coverOf = (row: { readonly coverUrl: string | null; readonly coverKey: string | null }): string | null =>
  row.coverUrl || (row.coverKey ? mediaPath(row.coverKey) : null);

const present = (...ids: readonly (string | null | undefined)[]): string[] =>
  ids.filter((id): id is string => typeof id === "string" && id.length > 0);

export function listingRows({ destinations, stays, foods }: ListingSources): ListingRow[] {
  return [
    ...(destinations ?? []).map((row): ListingRow => ({
      type: "DESTINATION",
      id: row.id,
      name: row.name,
      detail: row.address,
      summary: row.shortDescription ?? row.description ?? null,
      cover: coverOf(row),
      status: row.status,
      isFeatured: row.isFeatured,
      authors: present(row.createdBy),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt ?? row.createdAt,
    })),
    ...(stays ?? []).map((row): ListingRow => ({
      type: "STAY",
      id: row.id,
      name: row.name,
      detail: row.address,
      summary: row.shortDescription ?? row.description ?? null,
      cover: coverOf(row),
      status: row.status,
      isFeatured: false,
      authors: present(row.ownerUserId),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt ?? row.createdAt,
    })),
    ...(foods ?? []).map((row): ListingRow => ({
      type: "FOOD",
      id: row.id,
      name: row.name,
      detail: row.address,
      summary: row.shortDescription ?? row.description ?? null,
      cover: coverOf(row),
      status: row.status,
      isFeatured: row.isFeatured,
      authors: present(row.ownerUserId, row.createdBy),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt ?? row.createdAt,
    })),
  ];
}

/** Where a listing is opened in the dashboard. */
export function listingPath(row: Pick<ListingRow, "type" | "id">): string {
  return `/${LISTING_RESOURCES[row.type]}/${row.id}`;
}

/** "Attraction", "Stay", "Food listing" — as a badge reads. */
export function listingLabel(type: ListingType): string {
  const noun = LISTING_NOUNS[type];
  return noun.charAt(0).toUpperCase() + noun.slice(1);
}

/** Whether this account wrote the listing, and so may send it for review. */
export function isAuthor(row: Pick<ListingRow, "authors">, userId: string | null): boolean {
  return userId !== null && row.authors.includes(userId);
}
