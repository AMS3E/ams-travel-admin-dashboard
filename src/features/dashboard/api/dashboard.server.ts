import "server-only";

import { cache } from "react";
import { getSessionToken } from "@/features/auth/session";
import { getRecords } from "@/features/catalog/api/catalog.server";
import type { DestinationResponse } from "@/features/catalog/api/contracts";
import { backendRequest } from "@/lib/backend-api.server";
import type { AuditLogResponse } from "@/features/dashboard/api/contracts";

/**
 * Server-side reads for the pages rendered on the server: the audit log, and
 * a person's own contributions on their profile. The dashboard's home screen
 * reads through RTK Query (`getDashboard`).
 *
 * Every loader here answers `null` or an empty list rather than throwing. The
 * API gates these by permission — `/admin/audit` wants `PERM_AUDIT_VIEW` — so
 * a read that is routine for one role is a 403 for the next. A panel with
 * nothing to show must not take the whole screen down with it.
 */
async function read<T>(path: string): Promise<T | null> {
  const token = await getSessionToken();
  try {
    return await backendRequest<T>(path, {}, token ?? undefined);
  } catch {
    return null;
  }
}

export interface AuditFilters {
  /** The entity name, e.g. `Destination`. */
  readonly entityType?: string;
  readonly action?: string;
  /** The `users` id of whoever made the change. */
  readonly userId?: string;
  readonly limit: number;
}

/**
 * The audit feed. ADMIN only in practice: the endpoint needs `PERM_AUDIT_VIEW`.
 *
 * The API caps `limit` whatever is asked for — the table only grows, and a
 * screen that could ask for all of it would eventually ask for all of it.
 */
export async function getAuditEntries(
  filters: AuditFilters,
): Promise<readonly AuditLogResponse[]> {
  const query = new URLSearchParams({ limit: String(filters.limit) });
  if (filters.entityType) query.set("entityType", filters.entityType);
  if (filters.action) query.set("action", filters.action);
  if (filters.userId) query.set("userId", filters.userId);

  return (await read<AuditLogResponse[]>(`/admin/audit?${query}`)) ?? [];
}

/**
 * Destinations, typed.
 *
 * The registry read hands back the row shape every table shares, which is
 * what a generated list screen needs. A profile reasons about this one table
 * field by field — who owns it, whether it is live — so the real response type
 * is worth naming, once, here.
 */
export const getDestinations = cache(
  async (): Promise<readonly DestinationResponse[]> => {
    try {
      const records = await getRecords("destinations");
      return records as unknown as readonly DestinationResponse[];
    } catch {
      return [];
    }
  },
);
