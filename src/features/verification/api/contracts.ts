import type { PublicationStatus } from "@/features/catalog/api/contracts";
import type { PublishDesk } from "@/features/publishing/api/contracts";

/**
 * The `verify` service's JSON. A destination's Verified badge rests on one of
 * four things: it is an official site, a partner's own listing with the
 * agreement behind it, a paid verification with its invoice, or the
 * travellers' reviews, which earn it on their own. The first three are a
 * desk's decision; the fourth is never filed. A verified place shows as
 * Recommended by AMS Travel in the app, and the fourth adds Recommended by
 * Traveler. None of it is the visitors' badges.
 *
 * Who decides is the desk the destination was written from: a BDO verifies
 * partner listings, an editor contributor drafts, and full control anything,
 * staff content included. The API scopes every read below to those desks.
 */

export type VerificationBasis = "OFFICIAL_SITE" | "PARTNER" | "PAID" | "TRAVELER_SCORE";

/** How each basis reads in a chip or a line. */
export const BASIS_LABELS: Readonly<Record<VerificationBasis, string>> = {
  OFFICIAL_SITE: "Official site",
  PARTNER: "Partner",
  PAID: "Paid",
  TRAVELER_SCORE: "Travellers' reviews",
};

/** Whether a desk's decision verifies the place now, rather than the travellers' seal alone. */
export function decidedVerified(row: Pick<VerificationResponse, "verified" | "basis">): boolean {
  return row.verified && row.basis !== "TRAVELER_SCORE";
}

/**
 * The service's one response, `VerificationResponse`. The same shape answers
 * three reads, each filling in what it may: a place's decisions, the desk's
 * queue, and the public status. The narrower types below say which is which.
 */
/** The kinds of destination a decision can be on: all three alike since 2026-10-20. */
export type VerificationTarget = "DESTINATION" | "STAY" | "FOOD";

/** The catalogue resource a kind's listing lives under. */
export const RESOURCE_OF_TARGET: Readonly<Record<VerificationTarget, "destinations" | "stays" | "foods">> = {
  DESTINATION: "destinations",
  STAY: "stays",
  FOOD: "foods",
};

/** How a kind reads on a row. */
export const TARGET_LABELS: Readonly<Record<VerificationTarget, string>> = {
  DESTINATION: "Attraction",
  STAY: "Stay",
  FOOD: "Food",
};

export interface VerificationResponse {
  /** The decision; null for a place in the queue nobody has decided on yet. */
  readonly id: string | null;
  /** An attraction, a stay or a food place; null only in a public status with no decision. */
  readonly targetType: VerificationTarget | null;
  /** The place's id, whatever its kind. */
  readonly destinationId: string;
  readonly destinationName: string | null;
  readonly destinationSlug: string | null;
  readonly destinationCoverUrl: string | null;
  readonly destinationStatus: PublicationStatus | null;
  /** Whose writing the place is; the queue's only. */
  readonly desk: PublishDesk | null;
  readonly verified: boolean;
  /**
   * What the verification rests on. In a history row the decision's own; in
   * the queue and the status the place's standing now, `TRAVELER_SCORE` when
   * only the reviews verify it. Null while not verified.
   */
  readonly basis: VerificationBasis | null;
  /** Whether the reviews have earned the Recommended by Traveler seal; null in a history row. */
  readonly travelerRecommended: boolean | null;
  /** Star ratings so far and their average; null in a history row, the average null while unrated. */
  readonly ratingCount: number | null;
  readonly averageRating: number | null;
  /** The invoice or receipt number, or the agreement's reference. */
  readonly reference: string | null;
  /** Why it was decided. Always present on a revocation. */
  readonly note: string | null;
  /** The evidence file's key, in the private `verification` folder. */
  readonly evidenceKey: string | null;
  /**
   * Its link on the API, which answers only a verifying desk's token — the
   * dashboard reads it through its own route instead (see `evidenceHref`).
   */
  readonly evidenceUrl: string | null;
  readonly decidedBy: string | null;
  readonly decidedByName: string | null;
  /** When the decision was made: "verified since". */
  readonly createdAt: string | null;
}

/**
 * One decision, as `GET /destination-verifications?destinationId=` lists them
 * (newest first) and `POST /destination-verifications` files them. Decisions
 * are never edited: renewing is another one with `verified: true`, revoking
 * one with `verified: false`.
 */
export interface DestinationVerificationResponse extends VerificationResponse {
  readonly id: string;
  readonly destinationName: string;
  readonly createdAt: string;
}

/** `POST /destination-verifications`. */
export interface RecordVerificationRequest {
  readonly destinationId: string;
  readonly verified: boolean;
  /** What it rests on; required to verify, ignored to revoke, never `TRAVELER_SCORE`. */
  readonly basis: VerificationBasis | null;
  /** At most 120 characters. */
  readonly reference: string | null;
  /** At most 2000 characters; required to revoke. */
  readonly note: string | null;
  /** A key `POST /media/files?type=verification` returned — the API refuses any other. */
  readonly evidenceKey: string | null;
}

/**
 * `GET /destination-verifications/queue` — one destination the signed-in desk
 * may verify: its latest decision, or, for a place never decided on, a row
 * with no `id` and `verified` false.
 */
export interface VerificationQueueItem extends VerificationResponse {
  readonly targetType: VerificationTarget;
  readonly destinationName: string;
  /** A stay has none. */
  readonly destinationSlug: string | null;
  readonly destinationStatus: PublicationStatus;
  /** Whose desk it is on: who wrote it. Seeded places, with no author, are the staff desk's. */
  readonly desk: PublishDesk;
}

/**
 * `GET /destination-verifications/status?destinationIds=` — public; one row
 * per id asked about. Who decided and on what evidence stay with the desks.
 */
export type VerifiedStatusResponse = Pick<
  VerificationResponse,
  "destinationId" | "verified" | "basis" | "travelerRecommended" | "ratingCount" | "averageRating" | "createdAt"
>;
