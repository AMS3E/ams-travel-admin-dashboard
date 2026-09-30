import "server-only";

import { notFound } from "next/navigation";
import { canManageResource } from "@/features/auth/permissions";
import { requireAdmin } from "@/features/auth/session";
import { getCorridorItinerary } from "@/features/corridors/api/corridors.server";
import { BackendApiError } from "@/lib/backend-api.server";
import { isUuid } from "@/lib/ids";

/**
 * The signed-in curator and the corridor a page is about. Anyone who may not
 * curate corridors, and any id that is not one, gets the not-found page.
 */
export async function loadCorridorPage(id: string) {
  const admin = await requireAdmin();
  if (!canManageResource(admin.roles, "corridors") || !isUuid(id)) notFound();
  try {
    return { admin, itinerary: await getCorridorItinerary(id) };
  } catch (error) {
    if (error instanceof BackendApiError && [400, 403, 404].includes(error.status)) notFound();
    throw error;
  }
}
