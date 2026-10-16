import type { BadgeTone } from "@/components/ui/badge";
import type { AuditAction, AuditData, AuditLogResponse } from "@/features/dashboard/api/contracts";
import type { ResourceKey } from "@/features/catalog/resource";
import { RESOURCE_KEYS, RESOURCES } from "@/features/catalog/resources";
import { ENGLISH_DATES, ZONE, datePartsOf, fillDate, type DateParts, type DateWords } from "@/i18n/dates";

export type { DateWords };

/* `entityType` is the entity's class name; registry keys are plural slugs, so one is derived from the other. */
function singular(word: string): string {
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.endsWith("s")) return word.slice(0, -1);
  return word;
}

/** The four galleries are one API table, audited as `Media`. */
const GALLERIES: ReadonlySet<ResourceKey> = new Set(["destination-media", "stay-media", "food-media", "corridor-media"]);

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

export const AUDIT_ACTIONS: readonly AuditAction[] = ["CREATE", "UPDATE", "DELETE", "PURGE"];

/** The most the API returns in one read; it has no paging, so the page pages these. */
export const AUDIT_FETCH_LIMIT = 200;
export const AUDIT_PAGE_SIZES = [25, 50, 100] as const;
export const AUDIT_DEFAULT_PAGE_SIZE = 50;

/** One badge colour per action, shared by every screen that shows the feed. */
export const AUDIT_ACTION_TONES: Readonly<Record<AuditAction, BadgeTone>> = {
  CREATE: "success",
  UPDATE: "info",
  DELETE: "danger",
  PURGE: "danger",
};

export const AUDIT_ACTION_LABELS: Readonly<Record<AuditAction, string>> = {
  CREATE: "Created",
  UPDATE: "Updated",
  DELETE: "Deleted",
  PURGE: "Log cleared",
};

/** A snapshot as an object of fields; older logs hold it as a JSON string. */
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

/** The property names a write touched, from its before and after snapshots. */
export function changedFieldsOf(
  entry: Pick<AuditLogResponse, "oldData" | "newData">,
): readonly string[] {
  return [
    ...new Set([...Object.keys(snapshotOf(entry.oldData)), ...Object.keys(snapshotOf(entry.newData))]),
  ].sort();
}

export interface FieldChange {
  readonly field: string;
  /** `undefined` when the snapshot does not mention the field. */
  readonly before: unknown;
  readonly after: unknown;
}

/** Each touched field with its raw value on either side. */
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

/** Who made a change, as a row says it: their name, else their e-mail. */
export function actorOf(
  entry: Pick<AuditLogResponse, "userName" | "userId"> & Partial<Pick<AuditLogResponse, "userEmail">>,
  words: Pick<AuditWords, "deletedAccount" | "system"> = ENGLISH_WORDS,
): string {
  return (
    entry.userName?.trim() ||
    entry.userEmail?.trim() ||
    (entry.userId ? words.deletedAccount : words.system)
  );
}

export interface AuditPerson {
  readonly id: string;
  readonly name: string;
}

/** The people who made the entries, A to Z, for the By filter; automatic changes have no one to pick. */
export function peopleOf(entries: readonly AuditLogResponse[], words: AuditWords = ENGLISH_WORDS): readonly AuditPerson[] {
  const people = new Map<string, string>();
  for (const entry of entries) {
    if (entry.userId && !people.has(entry.userId)) people.set(entry.userId, actorOf(entry, words));
  }
  return [...people].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "en"));
}

const ACRONYMS: Readonly<Record<string, string>> = { id: "ID", api: "API", url: "URL", ip: "IP", uuid: "UUID", seo: "SEO" };

/** `routePolyline` → "Route polyline", `isActive` → "Active", `provinceId` → "Province ID". */
export function fieldLabel(field: string): string {
  const words = field
    .replace(/^is(?=[A-Z])/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(" ")
    .map((word) => ACRONYMS[word] ?? word)
    .join(" ");
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

/** One audited value, typed for display; the raw value stays in the event's JSON. */
export type AuditValue =
  | { readonly kind: "absent" }
  | { readonly kind: "null" }
  | { readonly kind: "empty" }
  | { readonly kind: "hidden" }
  | { readonly kind: "boolean"; readonly value: boolean; readonly raw: string }
  | { readonly kind: "number"; readonly text: string }
  | { readonly kind: "date"; readonly text: string; readonly raw: string }
  | { readonly kind: "id"; readonly raw: string; readonly name: string | null }
  | { readonly kind: "text"; readonly text: string }
  | { readonly kind: "json"; readonly text: string; readonly count: number; readonly shape: "list" | "fields" };

export interface AuditFieldChange {
  readonly field: string;
  readonly label: string;
  /** Null when the event has no such side: a create has no before, a delete no after. */
  readonly before: AuditValue | null;
  readonly after: AuditValue | null;
  /** A create or delete field with nothing in it. */
  readonly blank: boolean;
}

/** What the Changes cell says. */
export interface AuditSummary {
  /** Changed field labels, most important first; only for an update. */
  readonly fields: readonly string[];
  readonly more: number;
  /** The cell's text when it names no fields. */
  readonly note: string | null;
  /** Every changed field, for the tooltip. */
  readonly title: string;
}

/** One entry as the audit screen shows it. */
export interface AuditRow {
  readonly id: number;
  readonly action: AuditAction;
  readonly entityType: string;
  readonly typeLabel: string;
  readonly entityId: string | null;
  readonly name: string | null;
  readonly href: string | null;
  readonly actor: string;
  readonly actorEmail: string | null;
  readonly userId: string | null;
  readonly iso: string;
  /** "14:32", in Cambodia. */
  readonly time: string;
  /** The heading of its day: "Today · Friday 16 October", "Wednesday 14 October". */
  readonly day: string;
  /** "Friday 16 October 2026 at 14:32:05". */
  readonly at: string;
  readonly changes: readonly AuditFieldChange[];
  readonly summary: AuditSummary;
  /** How many entries a PURGE removed, when it says. */
  readonly removed: number | null;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  /** The entry as the API sent it, secrets masked. */
  readonly raw: AuditLogResponse;
  /** Lower-case text the search box matches against. */
  readonly haystack: string;
}

/** What a row is written in: the language's own words, and how it says dates and numbers. */
export interface AuditWords {
  /** An Intl locale for numbers: "en-GB", "km-KH". */
  readonly locale: string;
  readonly dates: DateWords;
  readonly today: string;
  readonly yesterday: string;
  readonly system: string;
  readonly deletedAccount: string;
  readonly newRecord: string;
  readonly recordRemoved: string;
  readonly noFieldChanges: string;
  readonly allRemoved: string;
  readonly removed: (count: number) => string;
  readonly action: (action: AuditAction) => string;
  /** `Destination` → "Destination"; falls back to the English name. */
  readonly typeLabel: (entityType: string) => string;
  /** `openingHours` → "Opening hours"; falls back to the English name. */
  readonly fieldLabel: (field: string) => string;
}

export const ENGLISH_WORDS: AuditWords = {
  locale: "en-GB",
  dates: ENGLISH_DATES,
  today: "Today",
  yesterday: "Yesterday",
  system: "System",
  deletedAccount: "A deleted account",
  newRecord: "New record",
  recordRemoved: "Record removed",
  noFieldChanges: "No field changes",
  allRemoved: "All entries removed",
  removed: (count) => `${plural(count, "entry", "entries")} removed`,
  action: (action) => AUDIT_ACTION_LABELS[action],
  typeLabel: auditTypeLabel,
  fieldLabel,
};

/** The ways a row writes a moment, in one language. */
function datesOf(words: AuditWords) {
  const { dates } = words;
  const seconds = (parts: DateParts) => `${parts.hour}:${parts.minute}:${parts.second}`;
  return {
    /** "14:32", in Cambodia. */
    time: (at: Date) => {
      const parts = datePartsOf(at, ZONE);
      return `${parts.hour}:${parts.minute}`;
    },
    full: (at: Date) => {
      const parts = datePartsOf(at, ZONE);
      return fillDate(dates.full, parts, dates, seconds(parts));
    },
    /** A day's heading; the year only when it is not this one. */
    day: (at: Date, now: Date) => {
      const parts = datePartsOf(at, ZONE);
      return fillDate(parts.year === datePartsOf(now, ZONE).year ? dates.day : dates.dayYear, parts, dates, "");
    },
    /** A stored timestamp: Cambodian time when it carries a zone, as written when it does not. */
    stamp: (at: Date, zoned: boolean) => {
      const parts = datePartsOf(at, zoned ? ZONE : "UTC");
      return fillDate(dates.stamp, parts, dates, seconds(parts));
    },
    date: (day: Date) => fillDate(dates.date, datePartsOf(day, "UTC"), dates, ""),
  };
}

type Dates = ReturnType<typeof datesOf>;

export function formatCount(value: number, locale = "en-GB"): string {
  return value.toLocaleString(locale);
}

export function plural(count: number, one: string, many: string): string {
  return `${formatCount(count)} ${count === 1 ? one : many}`;
}

function dayOf(at: Date, now: Date, words: AuditWords, dates: Dates): string {
  const day = (moment: Date) => {
    const parts = datePartsOf(moment, ZONE);
    return `${parts.year}-${parts.month}-${parts.day}`;
  };
  const date = dates.day(at, now);
  if (day(at) === day(now)) return `${words.today} · ${date}`;
  if (day(at) === day(new Date(now.valueOf() - 86_400_000))) return `${words.yesterday} · ${date}`;
  return date;
}

/* The entry's own time already says these. */
const BOOKKEEPING: ReadonlySet<string> = new Set(["createdAt", "updatedAt"]);
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const ZONED = /(?:Z|[+-]\d{2}:?\d{2})$/i;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/* Never shown, whatever a future entity stores under these names. */
const SENSITIVE = /password|passcode|secret|token|api[-_]?key|credential|private[-_]?key/i;
/* Fields an update summary names first. */
const PRIORITY = ["name", "title", "status", "slug", "caption", "code"];

function dateValue(value: string, dates: Dates): AuditValue | null {
  if (DATE_ONLY.test(value)) {
    const day = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(day.valueOf()) ? null : { kind: "date", text: dates.date(day), raw: value };
  }
  if (!TIMESTAMP.test(value)) return null;
  const zoned = ZONED.test(value);
  const at = new Date(zoned ? value : `${value}Z`);
  if (Number.isNaN(at.valueOf())) return null;
  return { kind: "date", text: dates.stamp(at, zoned), raw: value };
}

function valueOf(field: string, value: unknown, names: ReadonlyMap<string, string>, dates: Dates): AuditValue {
  if (value === undefined) return { kind: "absent" };
  if (value === null) return { kind: "null" };
  if (SENSITIVE.test(field)) return { kind: "hidden" };
  if (typeof value === "boolean") return { kind: "boolean", value, raw: String(value) };
  if (typeof value === "number") return { kind: "number", text: String(value) };
  if (typeof value === "string") {
    if (value === "") return { kind: "empty" };
    if (UUID.test(value)) return { kind: "id", raw: value, name: names.get(value) ?? null };
    return dateValue(value, dates) ?? { kind: "text", text: value };
  }
  if (Array.isArray(value)) {
    return { kind: "json", text: JSON.stringify(value, null, 2), count: value.length, shape: "list" };
  }
  if (typeof value === "object") {
    return { kind: "json", text: JSON.stringify(value, null, 2), count: Object.keys(value).length, shape: "fields" };
  }
  return { kind: "text", text: String(value) };
}

function isBlank(value: unknown): boolean {
  if (value == null || value === "") return true;
  if (Array.isArray(value)) return value.length === 0;
  return typeof value === "object" && Object.keys(value).length === 0;
}

/** A snapshot with its secret-looking fields masked. */
function masked(data: unknown): AuditData | null {
  if (data == null) return null;
  return Object.fromEntries(
    Object.entries(snapshotOf(data)).map(([key, value]) => [key, SENSITIVE.test(key) && value != null ? "[hidden]" : value]),
  );
}

function rank(field: string): number {
  const index = PRIORITY.indexOf(field);
  return index === -1 ? PRIORITY.length : index;
}

function summaryOf(action: AuditAction, changes: readonly AuditFieldChange[], removed: number | null, words: AuditWords): AuditSummary {
  const title = changes.map((change) => change.label).join(", ");
  switch (action) {
    case "PURGE":
      return { fields: [], more: 0, note: removed == null ? words.allRemoved : words.removed(removed), title: "" };
    case "CREATE":
      return { fields: [], more: 0, note: words.newRecord, title };
    case "DELETE":
      return { fields: [], more: 0, note: words.recordRemoved, title };
    case "UPDATE": {
      if (!changes.length) return { fields: [], more: 0, note: words.noFieldChanges, title };
      /* "en" collation on purpose: the server and a browser without Khmer data must sort alike. */
      const ordered = [...changes].sort((a, b) => rank(a.field) - rank(b.field) || a.label.localeCompare(b.label, "en"));
      /* "+1 more" takes the room of the name it hides, so three show whole. */
      const shown = ordered.length <= 3 ? ordered : ordered.slice(0, 2);
      return { fields: shown.map((change) => change.label), more: ordered.length - shown.length, note: null, title };
    }
  }
}

/** The feed as rows: named, linked, summarised and searchable. */
export function auditRowsOf(entries: readonly AuditLogResponse[], now = new Date(), words: AuditWords = ENGLISH_WORDS): readonly AuditRow[] {
  const dates = datesOf(words);
  /* A name found on any entry names every entry of that record. */
  const names = new Map<string, string>();
  /* A record deleted in the feed is not linked: its page would be a 404. */
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
    const whole = entry.action === "CREATE" || entry.action === "DELETE";
    const changes: AuditFieldChange[] = purge
      ? []
      : fieldChangesOf(entry)
          .filter((change) => !BOOKKEEPING.has(change.field))
          .map((change) => ({
            field: change.field,
            label: words.fieldLabel(change.field),
            before: entry.oldData == null ? null : valueOf(change.field, change.before, names, dates),
            after: entry.newData == null ? null : valueOf(change.field, change.after, names, dates),
            blank: whole && isBlank(change.before ?? change.after),
          }));
    const removed = purge ? snapshotOf(entry.newData).removed : null;
    const removedCount = typeof removed === "number" ? removed : null;
    const entityId = purge ? null : entry.entityId;
    const name = entityId ? (names.get(entityId) ?? null) : null;
    const typeLabel = words.typeLabel(entry.entityType);
    const actor = actorOf(entry, words);
    const actorEmail = entry.userEmail && entry.userEmail !== actor ? entry.userEmail : null;

    return {
      id: entry.id,
      action: entry.action,
      entityType: entry.entityType,
      typeLabel,
      entityId,
      name,
      href: entityId && !deleted.has(entityId) ? auditRecordHref(entry.entityType, entityId) : null,
      actor,
      actorEmail,
      userId: entry.userId,
      iso: entry.createdAt,
      time: Number.isNaN(at.valueOf()) ? "—" : dates.time(at),
      day: Number.isNaN(at.valueOf()) ? "" : dayOf(at, now, words, dates),
      at: Number.isNaN(at.valueOf()) ? entry.createdAt : dates.full(at),
      changes,
      summary: summaryOf(entry.action, changes, removedCount, words),
      removed: removedCount,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      raw: { ...entry, oldData: masked(entry.oldData), newData: masked(entry.newData) },
      haystack: [
        String(entry.id),
        `#${entry.id}`,
        words.action(entry.action),
        AUDIT_ACTION_LABELS[entry.action],
        entry.action,
        typeLabel,
        entry.entityType,
        entityId,
        name,
        actor,
        entry.userEmail,
        entry.userId,
        entry.ipAddress,
        ...changes.flatMap((change) => [change.field, change.label, fieldLabel(change.field)]),
        auditTypeLabel(entry.entityType),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase(),
    };
  });
}

/** Every word of the search must appear somewhere in the row. */
export function matchesSearch(row: AuditRow, search: string): boolean {
  return search
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => row.haystack.includes(word));
}

export type AuditCounts = Readonly<Record<AuditAction | "total", number>>;

export function auditCountsOf(rows: readonly AuditRow[]): AuditCounts {
  const counts = { total: rows.length, CREATE: 0, UPDATE: 0, DELETE: 0, PURGE: 0 };
  for (const row of rows) counts[row.action] += 1;
  return counts;
}

/** The filters the API applies; the rest of the page's state is the browser's. */
export interface AuditServerFilters {
  readonly entityType: string;
  readonly action: AuditAction | "";
  readonly userId: string;
  readonly entityId: string;
}

export function shortId(id: string): string {
  return id.slice(0, 8);
}
