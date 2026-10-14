import type { BadgeTone } from "@/components/ui/badge";
import type { AuditAction, AuditLogResponse } from "@/features/dashboard/api/contracts";
import type { ResourceKey } from "@/features/catalog/resource";
import { RESOURCE_KEYS, RESOURCES } from "@/features/catalog/resources";

/**
 * `entityType` in the audit log is the entity name — `Destination`,
 * `MediaItem` — because a single event listener records every write and
 * knows the class, not the route. The registry keys are the plural slugs, so
 * the filter derives one from the other rather than keeping a second table that
 * would go stale the day a resource is added.
 */
function singular(word: string): string {
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.endsWith("s")) return word.slice(0, -1);
  return word;
}

/** The four galleries are one API table, audited as `MediaItem`. */
const GALLERIES: ReadonlySet<ResourceKey> = new Set(["destination-media", "stay-media", "food-media", "corridor-media"]);

export function entityTypeOf(key: ResourceKey): string {
  if (GALLERIES.has(key)) return "MediaItem";
  const words = key.split("-");
  return words
    .map((word, index) =>
      index === words.length - 1 ? singular(word) : word,
    )
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

export interface AuditEntityOption {
  readonly value: string;
  readonly label: string;
}

export const AUDIT_ENTITY_TYPES: readonly AuditEntityOption[] = [
  ...RESOURCE_KEYS.filter((key) => !GALLERIES.has(key)).map((key) => ({
    value: entityTypeOf(key),
    label: RESOURCES[key].labelPlural,
  })),
  { value: "MediaItem", label: "Gallery media" },
  /* Not catalogue resources here, but written through the API and audited all the same. */
  { value: "Review", label: "Reviews" },
  { value: "PublishRequest", label: "Publish requests" },
  { value: "DestinationVerification", label: "Verification decisions" },
].sort((a, b) => a.label.localeCompare(b.label));

export const AUDIT_LIMITS = [25, 50, 100, 200] as const;

/**
 * The badge each action wears, in one place: three screens render this feed and
 * a fourth colour scheme was how PURGE came to be missing from all of them.
 */
export const AUDIT_ACTION_TONES: Readonly<Record<AuditAction, BadgeTone>> = {
  CREATE: "success",
  UPDATE: "info",
  DELETE: "danger",
  /* Amber: the one entry about the log itself rather than about a row. */
  PURGE: "warning",
};

/**
 * A snapshot as an object of fields. The API sends objects; a log written
 * before it did holds the same thing as a JSON string, which is read the
 * same way rather than shown as one long line.
 */
function snapshotOf(data: unknown): Readonly<Record<string, unknown>> {
  if (typeof data === "string") {
    try {
      return snapshotOf(JSON.parse(data));
    } catch {
      return {};
    }
  }
  return data && typeof data === "object" && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};
}

/**
 * The property names a write touched, from the before and after snapshots the
 * log keeps. Only the names are shown in lists — the values are one click
 * away in the audit table, not spread across every dashboard.
 */
export function changedFieldsOf(
  entry: Pick<AuditLogResponse, "oldData" | "newData">,
): readonly string[] {
  return [
    ...new Set([...Object.keys(snapshotOf(entry.oldData)), ...Object.keys(snapshotOf(entry.newData))]),
  ].sort();
}

export interface FieldChange {
  readonly field: string;
  /** `undefined` when the snapshot does not mention the field — a CREATE has no before. */
  readonly before: unknown;
  readonly after: unknown;
}

/**
 * Each touched field with its value on either side. An UPDATE lists only the
 * fields that changed, so this reads as the edit itself; a CREATE has only
 * afters and a DELETE only befores.
 */
export function fieldChangesOf(
  entry: Pick<AuditLogResponse, "oldData" | "newData">,
): readonly FieldChange[] {
  const before = snapshotOf(entry.oldData);
  const after = snapshotOf(entry.newData);
  return changedFieldsOf(entry).map((field) => ({
    field,
    before: Object.hasOwn(before, field) ? before[field] : undefined,
    after: Object.hasOwn(after, field) ? after[field] : undefined,
  }));
}

/** One audited value as a cell shows it. Empty and absent read differently on purpose. */
export function auditValueText(value: unknown): string {
  if (value === undefined) return "—";
  if (value === null) return "empty";
  if (typeof value === "string") return value === "" ? "empty" : value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

/** Who made a change, as a row says it: their name, else their e-mail. */
export function actorOf(
  entry: Pick<AuditLogResponse, "userName" | "userId"> & Partial<Pick<AuditLogResponse, "userEmail">>,
): string {
  return (
    entry.userName?.trim() ||
    entry.userEmail?.trim() ||
    (entry.userId ? "A deleted account" : "No signed-in actor")
  );
}
