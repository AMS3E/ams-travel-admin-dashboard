/**
 * The JSON the Spring API actually returns, one interface per `*Response`
 * record. Field names and nullability are copied from the API contract — when
 * a record changes, this file changes with it and TypeScript points at every
 * screen that needs attention.
 *
 * Every id is a UUID string. Every picture comes as a pair: the MinIO object
 * `…Key` a form sends back, and the `…Url` a screen renders.
 */

/** Destinations, stays and foods: written as drafts, published by a reviewer. */
export type PublicationStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

/** Partners and user accounts. */
export type AccountStatus = "ACTIVE" | "INACTIVE";

/** ZONE: geography the provinces sit in. TOURISM: a theme the Discover layer browses by. */
export type RegionKind = "ZONE" | "TOURISM";

export interface RegionResponse {
  readonly id: string;
  readonly name: string;
  readonly code: string | null;
  readonly kind: RegionKind;
  readonly parentId: string | null;
  readonly description: string | null;
  /** A tourism region's shelves, and the filter chips its page offers. Empty on a zone. */
  readonly categoryIds: readonly string[];
  readonly tagIds: readonly string[];
  readonly isActive: boolean;
  readonly createdAt: string | null;
}

export interface ProvinceResponse {
  readonly id: string;
  /** Its zone; null for one made without. */
  readonly regionId: string | null;
  readonly name: string;
  readonly code: string | null;
  readonly countryCode: string | null;
  readonly isActive: boolean;
}

export interface CategoryResponse {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
  /** An icon name, e.g. `compass` — not an upload. */
  readonly iconKey: string | null;
  readonly sortOrder: number | null;
  readonly isActive: boolean;
}

export interface TagResponse {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
  readonly isActive: boolean;
}

export interface InterestResponse {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string | null;
  /** What the website's Interests tab lists it under; null keeps it off those lists. */
  readonly groupName: string | null;
  readonly iconKey: string | null;
  readonly isActive: boolean;
}

/**
 * A tourism corridor's overview. Its days, stops and road route are
 * `GET /corridors/{id}/itinerary` — see `features/corridors/api/contracts.ts`.
 */
export type { CorridorSummary as CorridorResponse } from "@/features/corridors/api/contracts";

export interface DestinationResponse {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly provinceId: string;
  /** Follows from the province; not written. */
  readonly regionId: string | null;
  readonly shortDescription: string | null;
  readonly description: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly address: string | null;
  readonly coverKey: string | null;
  readonly coverUrl: string | null;
  readonly status: PublicationStatus;
  readonly viewCount: number | null;
  /** The `users` id of whoever created it. */
  readonly createdBy: string | null;
  readonly publishedAt: string | null;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
  readonly categoryIds: readonly string[] | null;
  readonly tagIds: readonly string[] | null;
  readonly interestIds: readonly string[] | null;
  /** Its heritage ties, written with the rest of the row. */
  readonly architectureStyleIds: readonly string[] | null;
  readonly religionIds: readonly string[] | null;
}

export type MediaType = "IMAGE" | "VIDEO";

export type MediaOwnerType = "DESTINATION" | "STAY" | "FOOD" | "REVIEW";

/** One gallery photo of any owner, as `/media` and a review's `photos` give it. */
export interface MediaItemResponse {
  readonly id: string;
  readonly ownerType: MediaOwnerType;
  readonly ownerId: string;
  readonly mediaKey: string;
  readonly mediaUrl: string | null;
  readonly mediaType: MediaType;
  readonly caption: string | null;
  readonly sortOrder: number | null;
  readonly isCover: boolean;
  readonly createdAt: string | null;
}

export type StayType =
  | "HOTEL"
  | "GUESTHOUSE"
  | "HOSTEL"
  | "RESORT"
  | "HOMESTAY"
  | "VILLA"
  | "OTHER";

export interface StayResponse {
  readonly id: string;
  readonly destinationId: string;
  readonly ownerUserId: string | null;
  readonly name: string;
  readonly type: StayType;
  readonly starRating: number | null;
  readonly shortDescription: string | null;
  readonly description: string | null;
  readonly slogan: string | null;
  readonly sloganBy: string | null;
  readonly provinceId: string | null;
  readonly policies: string | null;
  /** `HH:mm[:ss]` local time, as the property states it; no date is involved. */
  readonly checkInFrom: string | null;
  readonly checkOutUntil: string | null;
  readonly phone: string | null;
  readonly contactEmail: string | null;
  readonly website: string | null;
  readonly priceFrom: number | null;
  readonly currency: string | null;
  /** Slugs from the API's `StayAmenities`, never free text. */
  readonly amenities: readonly string[] | null;
  readonly coverKey: string | null;
  readonly coverUrl: string | null;
  readonly address: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly status: PublicationStatus;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
}

export type FoodType =
  | "RESTAURANT"
  | "CAFE"
  | "STREET_FOOD"
  | "MARKET"
  | "OTHER";

/** `mon` … `sun` → `"07:00-22:00"`. A day left out is closed or unknown. */
export type OpeningHours = Readonly<Partial<Record<(typeof WEEKDAYS)[number], string>>>;

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export interface FoodResponse {
  readonly id: string;
  readonly destinationId: string;
  readonly ownerUserId: string | null;
  readonly name: string;
  readonly slug: string;
  readonly type: FoodType;
  readonly shortDescription: string | null;
  readonly description: string | null;
  readonly slogan: string | null;
  readonly sloganBy: string | null;
  readonly provinceId: string | null;
  readonly address: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly priceRange: "$" | "$$" | "$$$" | "$$$$" | null;
  readonly priceFrom: number | null;
  readonly currency: string | null;
  readonly openingHours: OpeningHours | null;
  readonly phone: string | null;
  readonly contactEmail: string | null;
  readonly website: string | null;
  readonly coverKey: string | null;
  readonly coverUrl: string | null;
  readonly status: PublicationStatus;
  readonly isLocalSpecialty: boolean;
  readonly averageRating: number | null;
  readonly reviewCount: number | null;
  readonly createdBy: string | null;
  readonly publishedAt: string | null;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
  readonly categoryIds: readonly string[] | null;
  readonly tagIds: readonly string[] | null;
  readonly interestIds: readonly string[] | null;
}

export type PartnerType =
  | "HOTEL"
  | "RESTAURANT"
  | "TOUR_OPERATOR"
  | "TRANSPORT"
  | "ATTRACTION"
  | "OTHER";

export interface PartnerResponse {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly type: PartnerType;
  readonly contactEmail: string | null;
  readonly contactPhone: string | null;
  readonly logoKey: string | null;
  readonly logoUrl: string | null;
  readonly status: AccountStatus;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
}

export interface PartnerUserResponse {
  readonly id: string;
  readonly partnerId: string;
  readonly partnerName: string | null;
  readonly userId: string;
  readonly userFullName: string | null;
  readonly userEmail: string | null;
  readonly role: "OWNER" | "STAFF";
  readonly createdAt: string | null;
}

export type BadgeCriteria = "BROWSES" | "REVIEWS" | "STAMPS" | "DESTINATION_STAMPS";

/** Which of the three ladders a badge climbs. */
export type BadgeTrack = "BROWSER" | "REVIEWER" | "ADVENTURE";

/** Its rung on that ladder. */
export type BadgeTier = "SILVER" | "GOLDEN" | "PLATINUM";

export interface BadgeDefinitionResponse {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  readonly iconKey: string | null;
  readonly criteriaType: BadgeCriteria;
  readonly criteriaValue: number;
  /**
   * Worked out by the API from the criteria, never written. Both are null for
   * a destination-collection badge (DESTINATION_STAMPS), which is known by
   * its name alone.
   */
  readonly track: BadgeTrack | null;
  readonly tier: BadgeTier | null;
  readonly isActive: boolean;
  readonly createdAt: string | null;
}

/**
 * One badge's window. Every badge has its own period per season, so two
 * badges of the same season have different ids — compare them by dates.
 *
 * `GET /badge-periods/current` and the overview's `currentPeriod` answer one
 * of these for the window covering today: whichever badge's period it is, its
 * name and days are the season's, which every badge's period shares.
 */
export interface BadgePeriodResponse {
  readonly id: string;
  readonly badgeId: string;
  readonly name: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly isActive: boolean;
}

/** High season, or the green (rainy) season. */
export type SeasonKind = "HIGH" | "GREEN";

/**
 * `GET /seasons` — the tourist calendar. Saving one creates or moves one badge
 * period per badge, with the same name and dates; deleting it retires them.
 */
export interface SeasonResponse {
  readonly id: string;
  readonly name: string;
  readonly kind: SeasonKind;
  readonly startsOn: string;
  readonly endsOn: string;
  readonly isActive: boolean;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
}

/** `GET /ratings?destinationIds=` — one per id asked about. */
export interface RatingResponse {
  readonly destinationId: string;
  /** Null when nothing visible has been written about it yet. */
  readonly average: number | null;
  readonly count: number;
  readonly stars: Readonly<Record<string, number>>;
}

/** `POST /media/files` — one stored file. */
export interface MediaResponse {
  /** The MinIO object key a form stores in the row's `…Key` field. */
  readonly key: string;
  /** Where the file can be read right now — the preview after an upload. */
  readonly uri: string;
  readonly name: string;
  readonly extension: string;
  readonly mimeTypeFile: string;
  readonly size: number;
  readonly category: string;
}

/**
 * Every list screen reads rows through this shape. Each resource's real
 * response type is narrower; the registry is what knows which fields exist.
 * Only destinations and foods record an owner, and not every table has a
 * `status` — the taxonomy has an `isActive` flag instead.
 */
export type CatalogRecord = {
  readonly id: string;
  readonly createdBy?: string | null;
  readonly status?: string;
} & Readonly<Record<string, unknown>>;
