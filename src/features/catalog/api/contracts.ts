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

/** The box around a region's or a province's published places, for a map to frame. */
export interface GeoBounds {
  readonly north: number;
  readonly south: number;
  readonly east: number;
  readonly west: number;
}

export interface RegionResponse {
  readonly id: string;
  readonly name: string;
  readonly code: string | null;
  readonly kind: RegionKind;
  readonly parentId: string | null;
  readonly description: string | null;
  /** Its cover picture: its Explore card and the banner of its page. */
  readonly coverKey: string | null;
  readonly coverUrl: string | null;
  /** Its map picture: the Historical Map panel of its page in the app. */
  readonly mapKey: string | null;
  readonly mapUrl: string | null;
  /** A tourism region's shelves, and the filter chips its page offers. Empty on a zone. */
  readonly categoryIds: readonly string[];
  readonly tagIds: readonly string[];
  /** The interests an attraction of its theme is offered. */
  readonly interestIds: readonly string[];
  readonly isActive: boolean;
  /** Recommended by AMS Travel: the badge on its card and its page in the app. */
  readonly amsRecommended: boolean;
  /** Its place among the regions of its kind, 0 first. */
  readonly sortOrder: number | null;
  /** Its centre, the marker on the app's Map screen: the one an editor set, else the middle of its places. */
  readonly latitude: number | null;
  readonly longitude: number | null;
  /** True only when an editor stored the centre; false while it is the middle of its places. */
  readonly centreSet: boolean;
  /** Null while it has no published place. */
  readonly bounds: GeoBounds | null;
  readonly createdAt: string | null;
}

export interface ProvinceResponse {
  readonly id: string;
  /** Its zone; null for one made without. */
  readonly regionId: string | null;
  readonly name: string;
  /** Its address on the website, made from its name. */
  readonly slug: string | null;
  readonly countryCode: string | null;
  readonly isActive: boolean;
  /** The picture on its card, folder `province`; null without one. */
  readonly coverKey: string | null;
  readonly coverUrl: string | null;
  /** Its centre, the marker on the app's Map screen; the seed gives every province its capital town. */
  readonly latitude: number | null;
  readonly longitude: number | null;
  /** Null while it has no published place. */
  readonly bounds: GeoBounds | null;
  /** Published attractions, stays and food places in it. */
  readonly placeCount: number;
  /** Their ratings together; null until somebody rated. */
  readonly averageRating: number | null;
  readonly reviewCount: number;
  /** Who made it; null for the seeded ones. */
  readonly createdBy: string | null;
  readonly createdAt: string | null;
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
  /** An icon's name; no longer edited here, kept for the website and app until they show pictures. */
  readonly iconKey: string | null;
  /** Its uploaded picture (folder `interest`). */
  readonly coverKey: string | null;
  readonly coverUrl: string | null;
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
  /** The Khmer twins of its text, typed by hand; null until written. */
  readonly nameKm: string | null;
  readonly descriptionKm: string | null;
  readonly sloganKm: string | null;
  readonly sloganByKm: string | null;
  readonly addressKm: string | null;
  /** The Khmer fields still empty while their English says something: publishing waits until there are none. */
  readonly missingKhmer: readonly string[];
}

export type MediaType = "IMAGE" | "VIDEO";

/** Whose photos a media row is: the four galleries at `/media`, and a review's own photos. */
export type MediaOwnerType = "DESTINATION" | "STAY" | "FOOD" | "CORRIDOR" | "REVIEW";

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

export type BadgeCriteria = "BROWSES" | "REVIEWS" | "STAMPS" | "POINTS" | "DESTINATION_STAMPS";

/** Its rung on a badge's ladder. */
export type BadgeTier = "SILVER" | "GOLDEN" | "PLATINUM";

export interface BadgeDefinitionResponse {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  readonly iconKey: string | null;
  /** `GET /badges`: how it is earned, how many it takes, and its tier. */
  readonly type: BadgeCriteria;
  readonly threshold: number;
  readonly level: BadgeTier | null;
  readonly status: "ACTIVE" | "INACTIVE";
  /** The places that count, for DESTINATION_STAMPS. */
  readonly destinationIds: readonly string[];
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
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
export type SeasonKind = "HIGH_SEASON" | "GREEN_SEASON";

/**
 * `GET /seasons` — the tourist calendar. Saving one creates or moves one badge
 * period per badge, with the same name and dates; deleting it retires them.
 */
export interface SeasonResponse {
  readonly id: string;
  readonly name: string;
  readonly type: SeasonKind;
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
