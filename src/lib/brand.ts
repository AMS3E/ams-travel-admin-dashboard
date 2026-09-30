import { mediaPath } from "@/features/catalog/resource";

/**
 * The pictures that belong to AMS Travel itself rather than to a row: the
 * logo, and the photograph behind the dashboard's welcome.
 *
 * They are objects in MinIO like every other picture the platform shows, put
 * there by the API's seed media library, so there is one place a picture can
 * live and one way to fetch it. That also means the dashboard ships no images
 * of its own — nothing in `public/` to fall out of step with the site.
 *
 * This is the one place a media path is built from a key rather than taken
 * from a row's `…Url`. It can be, because the owner segment is not a secret
 * here: every seed image is stored under the all-zero system UUID, which is
 * already visible in each seeded `coverUrl` the API hands over.
 */
const SEED_OWNER = "00000000-0000-0000-0000-000000000000";

export function brandImage(fileName: string): string {
  return mediaPath(`general/${SEED_OWNER}/${fileName}`);
}

/** A round badge on a white ground: clip it to a circle and the corners go. */
export const LOGO = brandImage("ams-logo.jpg");
