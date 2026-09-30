import "server-only";

import { cache } from "react";
import { getSessionToken } from "@/features/auth/session";
import { backendRequest } from "@/lib/backend-api.server";
import type { PublishRequestResponse } from "@/features/publishing/api/contracts";

/**
 * Both sides of the workflow, read with the caller's own token.
 *
 * The API answers `/publish-requests` from the caller's permissions — a BDO is
 * shown partner listings, an editor contributor drafts — so there is no filter
 * to pass and nothing for a client to get wrong. A role holding neither gets a
 * 403, which is an empty panel here rather than a broken screen.
 */
async function read<T>(path: string): Promise<T | null> {
  const token = await getSessionToken();
  if (!token) return null;
  try {
    return await backendRequest<T>(path, {}, token);
  } catch {
    return null;
  }
}

/** What the signed-in account has submitted, newest first. */
export const getMyRequests = cache(
  async (): Promise<readonly PublishRequestResponse[]> =>
    (await read<PublishRequestResponse[]>("/publish-requests/mine")) ?? [],
);

/** The queue for the signed-in account's desk. */
export const getReviewQueue = cache(
  async (status?: "PENDING_REVIEW"): Promise<readonly PublishRequestResponse[]> =>
    (await read<PublishRequestResponse[]>(
      status ? `/publish-requests?status=${status}` : "/publish-requests",
    )) ?? [],
);

/**
 * One request, as its desk's reviewer or the account that sent it may read
 * it; null for anyone else, and for one that is gone.
 */
export const getPublishRequest = cache(
  async (id: string): Promise<PublishRequestResponse | null> =>
    read<PublishRequestResponse>(`/publish-requests/${encodeURIComponent(id)}`),
);
