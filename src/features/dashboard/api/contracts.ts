import type { VerificationBasis } from "@/features/verification/api/contracts";
import type { BadgePeriodResponse, MediaItemResponse, PublicationStatus } from "@/features/catalog/api/contracts";

/**
 * The JSON the back-office endpoints return — everything under `/admin`, plus
 * review moderation. The catalogue's own shapes live in
 * `features/catalog/api/contracts.ts`; these are the reads no public page makes.
 */

export interface ReviewOverview {
  readonly total: number;
  readonly visible: number;
  readonly hidden: number;
  /** Null rather than zero when no badge period is running — a gap is not a drought. */
  readonly thisPeriod: number | null;
  readonly averageRating: number | null;
}

/** What a review is about. */
export type ReviewTarget = "DESTINATION" | "FOOD" | "STAY" | "ACTIVITY" | "CORRIDOR";

/** Who the author travelled with, as the app's "Kind of visit" chips offer it. */
export type ReviewVisitType = "BUSINESS" | "COUPLES" | "FAMILY" | "FRIENDS" | "SOLO";

export type ReviewStatus = "VISIBLE" | "HIDDEN";

/** A review's photo: a media item whose owner is the review. */
export type ReviewPhoto = MediaItemResponse;

export interface ReviewResponse {
  readonly id: string;
  readonly userId: string | null;
  readonly authorName: string | null;
  readonly authorAvatarUrl: string | null;
  readonly targetType: ReviewTarget;
  readonly targetId: string;
  readonly rating: number;
  readonly title: string | null;
  readonly content: string | null;
  /** Who came, when the author said. */
  readonly visitType: ReviewVisitType | null;
  /** The month of the visit as `YYYY-MM`, when the author said. */
  readonly visitedOn: string | null;
  readonly status: ReviewStatus;
  readonly photos: readonly ReviewPhoto[] | null;
  readonly createdAt: string;
  readonly updatedAt: string | null;
}

/** The tables the overview counts, keyed as the API names them. */
export type OverviewCountKey =
  | "destinations"
  | "regions"
  | "provinces"
  | "categories"
  | "tags"
  | "interests"
  | "corridors"
  | "stays"
  | "foods"
  | "activities"
  | "partners"
  | "users"
  | "reviews"
  | "favorites"
  | "badgeDefinitions";

/**
 * `GET /admin/overview` — every tile on every dashboard, in one request. A
 * moderator reads it too; `counts` is full control's alone and left out for
 * anyone else.
 */
export interface AdminOverviewResponse {
  readonly counts?: Readonly<Partial<Record<OverviewCountKey, number>>>;
  readonly reviews: ReviewOverview;
  /** The badge period running today, standing for the season, or null between periods. */
  readonly currentPeriod: BadgePeriodResponse | null;
  readonly recentReviews: readonly ReviewResponse[];
}

/** PURGE is the log recording that it was cleared; it describes no row. */
export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "PURGE";

/**
 * One snapshot of a row, keyed by property name. Values are what the API's
 * listener made plain: a string, a number, a boolean, null, or — for a JSON
 * column such as opening hours — an object.
 */
export type AuditData = Readonly<Record<string, unknown>>;

export interface AuditLogResponse {
  /** The one numeric id left in the API: the log is an identity column. */
  readonly id: number;
  /** The `users` id of whoever made the change; null for a system write or a deleted account. */
  readonly userId: string | null;
  readonly userName: string | null;
  readonly userEmail: string | null;
  readonly action: AuditAction;
  readonly entityType: string;
  readonly entityId: string | null;
  /**
   * Before the write. On UPDATE only the fields that changed; on DELETE every
   * field; null on CREATE and PURGE.
   */
  readonly oldData: AuditData | null;
  /**
   * After the write. On UPDATE only the fields that changed; on CREATE every
   * field; on PURGE `{ removed }`; null on DELETE.
   */
  readonly newData: AuditData | null;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  readonly createdAt: string;
}

/**
 * `GET /admin/destination-stats` — every destination's standing with
 * travellers and with the desks, in one read, for the Destination Stats
 * page. Browses are the different signed-in visitors who opened a place in
 * the period, reviews and ratings the ones written in it; views, the
 * Verified badge and the status are as of today whatever the period.
 */
export interface DestinationStatsResponse {
  /** The period the browses, reviews and ratings cover, inclusive dates; both null for all time. */
  readonly from: string | null;
  readonly to: string | null;
  readonly places: readonly DestinationStatsRow[];
}

/** `?from=&to=`, inclusive dates; neither for all time. */
export interface DestinationStatsPeriod {
  readonly from?: string;
  readonly to?: string;
}

/** The kinds of place Destination Detail reads the standing of. */
export type PlaceType = "DESTINATION" | "STAY" | "FOOD" | "ACTIVITY";

export interface DestinationStatsRow {
  readonly id: string;
  /** An attraction, a stay or a food place; the Destination Stats list holds attractions only. */
  readonly type: PlaceType;
  readonly name: string;
  /** A stay has none. */
  readonly slug: string | null;
  readonly provinceId: string | null;
  readonly status: PublicationStatus;
  readonly browses: number;
  readonly viewCount: number;
  /** Star ratings so far; every review carries one. */
  readonly ratingCount: number;
  /** Their average, one decimal; null while unrated. */
  readonly averageRating: number | null;
  readonly reviewCount: number;
  /** By a desk's decision or by the reviews. */
  readonly verified: boolean;
  readonly basis: VerificationBasis | null;
  readonly travelerRecommended: boolean;
}

/**
 * `GET /admin/destination-stats/{id}` — one place's standing, for Destination
 * Detail: an attraction, a stay or a food place, told apart by `place.type`.
 * The same figures and period as the list; a stay or a food place is never
 * verified.
 */
export interface PlaceStatsResponse {
  readonly from: string | null;
  readonly to: string | null;
  readonly place: DestinationStatsRow;
}

/** The kinds of destination a check-in code is posted at: all four alike. */
export type StampTarget = "DESTINATION" | "STAY" | "FOOD" | "ACTIVITY";

/**
 * `GET /stamps/codes?targetType=&targetId=` — a destination's check-in codes,
 * current first; `POST /stamps/codes` issues one and replaces the current;
 * `DELETE /stamps/codes/{id}` withdraws one for good. A check-in needs the
 * code scanned on site and the phone within the radius.
 */
export interface StampCodeResponse {
  readonly id: string;
  readonly targetType: StampTarget;
  readonly targetId: string;
  /** Printed under the QR, for a visitor to read. */
  readonly code: string;
  /** What the QR encodes: the scan page's link, whose last part is the code. */
  readonly payload: string;
  readonly issuedAt: string;
  readonly issuedBy: string | null;
  /** Null while current. */
  readonly replacedAt: string | null;
}
