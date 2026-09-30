import type { PublicationStatus } from "@/features/catalog/api/contracts";
import type { PublishDesk } from "@/features/publishing/api/contracts";

/**
 * The `verify` service's JSON. Verification is a desk's decision on evidence —
 * an invoice or a receipt — and has nothing to do with badges.
 *
 * Who decides is the desk the destination was written from: a BDO verifies
 * partner listings, an editor contributor drafts, and full control anything,
 * staff content included. The API scopes every read below to those desks.
 */

/**
 * The service's one response, `VerificationResponse`. The same shape answers
 * three reads, each filling in what it may: a place's decisions, the desk's
 * queue, and the public status. The narrower types below say which is which.
 */
export interface VerificationResponse {
  /** The decision; null for a place in the queue nobody has decided on yet. */
  readonly id: string | null;
  readonly destinationId: string;
  readonly destinationName: string | null;
  readonly destinationSlug: string | null;
  readonly destinationCoverUrl: string | null;
  readonly destinationStatus: PublicationStatus | null;
  /** Whose writing the place is; the queue's only. */
  readonly desk: PublishDesk | null;
  readonly verified: boolean;
  /** The invoice or receipt number. */
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
  readonly destinationName: string;
  readonly destinationSlug: string;
  readonly destinationStatus: PublicationStatus;
  /** Whose desk it is on: who wrote it. Seeded places, with no author, are the staff desk's. */
  readonly desk: PublishDesk;
}

/**
 * `GET /destination-verifications/status?destinationIds=` — public; one row
 * per id asked about. Who decided and on what evidence stay with the desks.
 */
export type VerifiedStatusResponse = Pick<VerificationResponse, "destinationId" | "verified" | "createdAt">;
