/**
 * Every row the API returns is keyed by a UUID string — only the audit log and
 * the browse events keep a numeric id. Route handlers check a path segment
 * against this before it is spliced into an API URL, so a crafted segment can
 * never smuggle another path through the proxy.
 */
export const UUID_PATTERN =
  "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

const UUID = new RegExp(`^${UUID_PATTERN}$`, "i");

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}
