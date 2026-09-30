import type { DestinationResponse } from "@/features/catalog/api/contracts";

/**
 * The questions the dashboards ask of the destinations table.
 *
 * `status` is the whole publishing workflow: a row created by anyone short of
 * full control starts as a DRAFT, so "not live" and "waiting for a reviewer"
 * are the same set of rows seen from two desks.
 */
export function isLive(destination: Pick<DestinationResponse, "status">): boolean {
  return destination.status === "PUBLISHED";
}
