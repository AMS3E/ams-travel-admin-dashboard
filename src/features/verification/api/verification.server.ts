import "server-only";

import { getSessionToken } from "@/features/auth/session";
import { backendRequest } from "@/lib/backend-api.server";
import type { DestinationVerificationResponse, VerifiedStatusResponse } from "./contracts";

/**
 * One destination's decisions, newest first — or `null` when the caller's
 * desk may not verify it.
 *
 * The API reads this history on the same terms it is written (a BDO for
 * partner listings, an editor for contributor drafts, full control for
 * anything), so the answer doubles as "may this account verify this row?"
 * without the dashboard re-deriving whose desk the destination is on.
 *
 * Any other failure is `null` too: the destination's own page renders this
 * beside its form, and verification being unreachable must not stop anyone
 * editing. The Verification page reports the same failure out loud.
 */
export async function getVerificationHistory(
  destinationId: string,
): Promise<readonly DestinationVerificationResponse[] | null> {
  const token = await getSessionToken();
  if (!token) return null;
  try {
    return await backendRequest<DestinationVerificationResponse[]>(
      `/destination-verifications?destinationId=${encodeURIComponent(destinationId)}`,
      {},
      token,
    );
  } catch {
    return null;
  }
}

/**
 * Whether a destination is verified right now, and since when. Public, so any
 * desk can see it; `null` when the API could not say, which a screen shows as
 * nothing rather than as "not verified".
 */
export async function getVerifiedStatus(
  destinationId: string,
): Promise<VerifiedStatusResponse | null> {
  try {
    const rows = await backendRequest<VerifiedStatusResponse[]>(
      `/destination-verifications/status?destinationIds=${encodeURIComponent(destinationId)}`,
    );
    return rows.find((row) => row.destinationId === destinationId) ?? null;
  } catch {
    return null;
  }
}
