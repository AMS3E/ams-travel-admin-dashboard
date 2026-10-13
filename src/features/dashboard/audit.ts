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

/** The three galleries are one API table, audited as `Media`. */
const GALLERIES: ReadonlySet<ResourceKey> = new Set(["destination-media", "stay-media", "food-media"]);

export function entityTypeOf(key: ResourceKey): string {
  if (GALLERIES.has(key)) return "Media";
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
  { value: "Media", label: "Photos" },
  /* Not catalogue resources here, but written through the API and audited all the same. */
  { value: "CorridorDay", label: "Corridor days" },
  { value: "CorridorStop", label: "Corridor stops" },
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
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  return JSON.stringify(value);
}

/** Who made a change, as a row says it: their name, else their e-mail. */
export function actorOf(
  entry: Pick<AuditLogResponse, "userName" | "userId"> & Partial<Pick<AuditLogResponse, "userEmail">>,
): string {
  return (
    entry.userName?.trim() ||
    entry.userEmail?.trim() ||
    (entry.userId ? "A deleted account" : "System")
  );
}

/** `routePolyline` → "Route polyline", `isActive` → "Active". */
export function fieldLabel(field: string): string {
  const words = field
    .replace(/^is(?=[A-Z])/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const TYPE_KEYS: ReadonlyMap<string, ResourceKey> = new Map(
  RESOURCE_KEYS.filter((key) => !GALLERIES.has(key)).map((key) => [entityTypeOf(key), key]),
);

const TYPE_LABELS: Readonly<Record<string, string>> = {
  Media: "Photo",
  PublishRequest: "Publish request",
  DestinationVerification: "Verification decision",
  AuditLog: "Audit log",
};

/** An entity name as a person says it: `CorridorStop` → "Corridor stop". */
export function auditTypeLabel(entityType: string): string {
  const key = TYPE_KEYS.get(entityType);
  if (key) return RESOURCES[key].label;
  return TYPE_LABELS[entityType] ?? fieldLabel(entityType);
}

/** The record's edit page, where the dashboard has one. */
export function auditRecordHref(entityType: string, entityId: string | null): string | null {
  const key = TYPE_KEYS.get(entityType);
  return key && entityId ? `/${key}/${entityId}` : null;
}

const NAME_FIELDS = ["name", "title", "caption", "code"] as const;

/** A readable name from either snapshot; an update only carries one when the name changed. */
export function recordNameOf(entry: Pick<AuditLogResponse, "oldData" | "newData">): string | null {
  for (const snapshot of [snapshotOf(entry.newData), snapshotOf(entry.oldData)]) {
    for (const field of NAME_FIELDS) {
      const value = snapshot[field];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    const key = snapshot.mediaKey;
    if (typeof key === "string" && key) return key.split("/").pop() ?? key;
  }
  return null;
}

export const AUDIT_ACTION_LABELS: Readonly<Record<AuditAction, string>> = {
  CREATE: "Created",
  UPDATE: "Updated",
  DELETE: "Deleted",
  PURGE: "Log cleared",
};

export interface AuditChange {
  readonly field: string;
  readonly label: string;
  readonly before?: string;
  readonly after?: string;
}

/** One entry as the audit table shows it; plain data, so it crosses to the client. */
export interface AuditRow {
  readonly id: number;
  /** "Today · 30 Sep 2026", in Cambodia. */
  readonly day: string;
  readonly time: string;
  readonly at: string;
  readonly action: AuditAction;
  readonly typeLabel: string;
  readonly entityId: string | null;
  readonly name: string | null;
  readonly href: string | null;
  readonly actor: string;
  readonly actorEmail: string | null;
  readonly userId: string | null;
  readonly changes: readonly AuditChange[];
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
}

const ZONE = "Asia/Phnom_Penh";
const DAY_KEY = new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, dateStyle: "short" });
const DAY_LABEL = new Intl.DateTimeFormat("en-GB", { timeZone: ZONE, day: "numeric", month: "short", year: "numeric" });
const WEEKDAY = new Intl.DateTimeFormat("en-GB", { timeZone: ZONE, weekday: "long" });
const TIME = new Intl.DateTimeFormat("en-GB", { timeZone: ZONE, hour: "2-digit", minute: "2-digit" });
const FULL = new Intl.DateTimeFormat("en-GB", { timeZone: ZONE, dateStyle: "full", timeStyle: "medium" });

function dayOf(at: Date, now: Date): string {
  const key = DAY_KEY.format(at);
  const date = DAY_LABEL.format(at);
  if (key === DAY_KEY.format(now)) return `Today · ${date}`;
  if (key === DAY_KEY.format(new Date(now.valueOf() - 86_400_000))) return `Yesterday · ${date}`;
  return `${WEEKDAY.format(at)} · ${date}`;
}

/* The entry's own time already says these. */
const BOOKKEEPING: ReadonlySet<string> = new Set(["createdAt", "updatedAt"]);
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STAMP = new Intl.DateTimeFormat("en-GB", { timeZone: ZONE, dateStyle: "medium", timeStyle: "short" });

/** A value as read: timestamps in Cambodian time, a record id as its name when the feed knows it. */
function shownValue(value: unknown, names: ReadonlyMap<string, string>): string {
  if (typeof value === "string" && TIMESTAMP.test(value) && !Number.isNaN(Date.parse(value))) {
    return STAMP.format(new Date(value));
  }
  if (typeof value === "string" && UUID.test(value) && names.has(value)) return names.get(value)!;
  return auditValueText(value);
}

function isEmpty(value: unknown): boolean {
  if (value == null || value === "") return true;
  if (Array.isArray(value)) return value.length === 0;
  return typeof value === "object" && Object.keys(value).length === 0;
}

/** What a PURGE entry says under its name. */
function purgeNote(entry: AuditLogResponse): string {
  const removed = snapshotOf(entry.newData).removed;
  return typeof removed === "number" ? `${removed.toLocaleString()} entries removed` : "Every entry removed";
}

/**
 * The feed as rows: named and linked. A name found on any entry
 * names every entry of that record, and a record deleted in the feed is not
 * linked, since its page would be a 404.
 */
export function auditRowsOf(entries: readonly AuditLogResponse[], now = new Date()): readonly AuditRow[] {
  const names = new Map<string, string>();
  const deleted = new Set<string>();
  for (const entry of entries) {
    if (!entry.entityId) continue;
    const name = recordNameOf(entry);
    if (name && !names.has(entry.entityId)) names.set(entry.entityId, name);
    if (entry.action === "DELETE") deleted.add(entry.entityId);
  }

  return entries.map((entry) => {
    const at = new Date(entry.createdAt);
    const purge = entry.action === "PURGE";
    /* A new or removed row lists every field; only the ones with a value say anything. */
    const whole = entry.action === "CREATE" || entry.action === "DELETE";
    const changes = purge
      ? []
      : fieldChangesOf(entry)
          .filter((change) => !BOOKKEEPING.has(change.field))
          .filter((change) => !whole || !isEmpty(change.before ?? change.after))
          .map((change) => ({
            field: change.field,
            label: fieldLabel(change.field),
            before: entry.oldData == null ? undefined : shownValue(change.before, names),
            after: entry.newData == null ? undefined : shownValue(change.after, names),
          }));
    const linkable = !purge && entry.entityId != null && !deleted.has(entry.entityId);

    return {
      id: entry.id,
      day: dayOf(at, now),
      time: TIME.format(at),
      at: FULL.format(at),
      action: entry.action,
      typeLabel: purge ? purgeNote(entry) : auditTypeLabel(entry.entityType),
      entityId: purge ? null : entry.entityId,
      name: purge ? "The audit log" : (entry.entityId ? names.get(entry.entityId) : null) ?? null,
      href: linkable ? auditRecordHref(entry.entityType, entry.entityId) : null,
      actor: actorOf(entry),
      actorEmail: entry.userEmail && entry.userEmail !== actorOf(entry) ? entry.userEmail : null,
      userId: entry.userId,
      changes,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
    };
  });
}
