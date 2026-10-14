/**
 * The folders the media bucket is divided into, one per feature that owns
 * media. Mirrors `MediaCategory` in the API, which is what actually builds the
 * object key: `{category}/{uploaderUuid}/{uuid}.{ext}`.
 *
 * Typed rather than a free string because the API rejects an unknown value with
 * a 400 at upload time — the Media Library asked for `"destinations"` for a
 * while and every upload through it failed. A union turns that into a
 * compile error instead of a bug someone finds by trying to upload a picture.
 *
 * Singular throughout, because the segment names what one object *is*, not
 * which screen it came from.
 */
export const IMAGE_CATEGORIES = [
  /** Anyone's own profile picture — needs no grant beyond being signed in. */
  "avatar",
  /** The photos a traveller attaches to a review. Signed-in customers upload these. */
  "review",
  /** Destination covers and the destination media gallery. */
  "destination",
  /** A stay's cover. */
  "stay",
  /** A food listing's cover and its photo set. */
  "food",
  /** A corridor's cover. */
  "corridor",
  /** A tourism region's cover: its Explore card and the banner of its page. */
  "region",
  /** A province's cover: its card on the app's province list and the top of its page. */
  "province",
  /** Partner logos. */
  "partner",
  /**
   * The invoice or receipt a verification decision is made on. Private: only
   * the verifying desks may upload here or read a file back, so no catalogue
   * field uploads into it and its links need the session's token.
   */
  "verification",
  /**
   * Everything with no feature of its own, and the photographs that ship with
   * the product (`general/{SYSTEM_UUID}/{file}`): the same picture can be a
   * destination cover and a gallery frame, so it is filed once, here. The
   * heritage vocabulary — period covers, monarch portraits, style photographs —
   * has no folder of its own and is filed here too.
   */
  "general",
] as const;

export type ImageCategory = (typeof IMAGE_CATEGORIES)[number];
