import "server-only";

import { cache } from "react";
import { getSessionToken } from "@/features/auth/session";
import type { CatalogRecord } from "@/features/catalog/api/contracts";
import {
  resourcePath,
  mediaOwnerType,
  isArranged,
  statusValueOf,
  type ReferenceKey,
  type ReferenceOption,
  type ReferenceOptions,
  type ResourceDefinition,
  type ResourceKey,
} from "@/features/catalog/resource";
import {
  byName,
  getResource,
  isResourceKey,
  referencedResources,
} from "@/features/catalog/resources";
import { backendRequest } from "@/lib/backend-api.server";

/**
 * Server-side reads for the catalogue.
 *
 * The destination workspace requires a token and is scoped by the API. Every
 * other list uses the public read endpoint, with the token attached so a
 * back-office reader sees every status.
 */

function createdAtOf(record: CatalogRecord): number {
  const value = record.createdAt;
  const parsed = typeof value === "string" ? Date.parse(value) : Number.NaN;
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Newest first, for a list opened to find what was just added. A row the API
 * gave no creation time sinks below the ones it did, rather than to the top.
 */
export function newestFirst(
  definition: ResourceDefinition,
  records: readonly CatalogRecord[],
): CatalogRecord[] {
  const title = definition.titleField;
  return [...records].sort(
    (a, b) =>
      createdAtOf(b) - createdAtOf(a) ||
      String(a[title] ?? "").localeCompare(String(b[title] ?? "")) ||
      a.id.localeCompare(b.id),
  );
}

/**
 * A to Z by the row's name, whatever order the table is arranged in. A row with
 * no name of its own — a photograph nobody captioned — goes below the named
 * ones, in the order the gallery was arranged in rather than scattering.
 */
export function aToZ(definition: ResourceDefinition, records: readonly CatalogRecord[]): CatalogRecord[] {
  const title = definition.titleField;
  const order = definition.orderField;
  const named = (record: CatalogRecord) => String(record[title] ?? "").trim();
  const place = (record: CatalogRecord) =>
    order && typeof record[order] === "number" ? (record[order] as number) : Number.MAX_SAFE_INTEGER;
  return [...records].sort(
    (a, b) =>
      Number(!named(a)) - Number(!named(b)) ||
      byName(named(a), named(b)) ||
      place(a) - place(b) ||
      createdAtOf(b) - createdAtOf(a) ||
      a.id.localeCompare(b.id),
  );
}

function sortRecords(
  definition: ResourceDefinition,
  records: readonly CatalogRecord[],
): CatalogRecord[] {
  const order = definition.orderField;

  /* Grouped rows go group by group, in the groups' own order — the interests as the Interests tab shows them. */
  const groups = definition.groupBy?.order ?? [];
  const groupAt = (row: CatalogRecord) => {
    const at = groups.indexOf(String(row[definition.groupBy?.field ?? ""] ?? ""));
    return at < 0 ? groups.length : at;
  };

  return [...records].sort((a, b) => {
    if (groups.length && groupAt(a) !== groupAt(b)) return groupAt(a) - groupAt(b);
    if (order) {
      /* An unset order sinks to the bottom rather than sorting as zero. */
      const left = typeof a[order] === "number" ? (a[order] as number) : Number.MAX_SAFE_INTEGER;
      const right = typeof b[order] === "number" ? (b[order] as number) : Number.MAX_SAFE_INTEGER;
      if (left !== right) return left - right;
    }

    const title = definition.titleField;
    const leftTitle = String(a[title] ?? "");
    const rightTitle = String(b[title] ?? "");
    /* Ids are UUIDs and say nothing about age; the creation time breaks ties. */
    return (
      leftTitle.localeCompare(rightTitle) ||
      createdAtOf(b) - createdAtOf(a) ||
      a.id.localeCompare(b.id)
    );
  });
}

async function loadRecords(key: ResourceKey): Promise<CatalogRecord[]> {
  const token = (await getSessionToken()) ?? undefined;
  const records = await backendRequest<CatalogRecord[]>(listPath(key), {}, token);
  return withInverse(getResource(key), sortRecords(getResource(key), records));
}

/**
 * A link kept on the other rows, read back onto these: a category's tourism
 * regions are the regions whose categories include it (see `inverse`).
 */
async function withInverse(definition: ResourceDefinition, records: CatalogRecord[]): Promise<CatalogRecord[]> {
  const fields = definition.fields.filter((field) => field.inverse);
  if (!fields.length) return records;
  const others = await Promise.all(fields.map((field) => getRecords(field.inverse!.resource)));
  return records.map((record) => ({
    ...record,
    ...Object.fromEntries(
      fields.map((field, index) => [
        field.name,
        others[index]
          .filter((other) => Array.isArray(other[field.inverse!.field]) && (other[field.inverse!.field] as unknown[]).map(String).includes(record.id))
          .map((other) => other.id),
      ]),
    ),
  }));
}

/**
 * Destinations are listed from the desk's own workspace, every status
 * included; every other table from its public list.
 */
function listPath(key: ResourceKey): string {
  if (key === "destinations") return "/destinations/workspace";
  const ownerType = mediaOwnerType(key);
  return ownerType ? `${resourcePath(key)}?ownerType=${ownerType}` : resourcePath(key);
}

/** Cached per request: a destination form asks for four lists, some twice. */
export const getRecords = cache(loadRecords);

/**
 * One row. A destination is read from its public path too: a draft outside
 * the caller's desk answers 404, and a published one reads for anyone —
 * whether it is theirs to edit is `canEditRecord`'s to say, and the API's on
 * `PUT`.
 */
export async function findRecord(
  key: ResourceKey,
  id: string,
): Promise<CatalogRecord> {
  const token = (await getSessionToken()) ?? undefined;
  const record = await backendRequest<CatalogRecord>(
    `${resourcePath(key)}/${encodeURIComponent(id)}`,
    {},
    token,
  );
  const [linked] = await withInverse(getResource(key), [record]);
  return withTies(getResource(key), linked, token);
}

/**
 * A link that is a row of its own, read onto the record as the ids it names:
 * a site's kings (see `ties`). One that cannot be read is left out, so the
 * form shows none and a save leaves them as they are.
 */
async function withTies(definition: ResourceDefinition, record: CatalogRecord, token?: string): Promise<CatalogRecord> {
  const fields = definition.fields.filter((field) => field.ties);
  if (!fields.length) return record;
  const tied = await Promise.all(
    fields.map(async (field) => {
      const { path, by, key } = field.ties!;
      try {
        const rows = await backendRequest<Record<string, unknown>[]>(`${path}?${by}=${encodeURIComponent(record.id)}`, {}, token);
        return [field.name, rows.map((row) => String(row[key]))] as const;
      } catch {
        return null;
      }
    }),
  );
  return { ...record, ...Object.fromEntries(tied.filter((entry) => entry !== null)) };
}

/* -------------------------------------------------------------------------- */
/* Reference options                                                          */
/* -------------------------------------------------------------------------- */

function toOptions(
  definition: ResourceDefinition,
  records: readonly CatalogRecord[],
): ReferenceOption[] {
  const options = records.map((record) => {
    const group = definition.groupBy ? record[definition.groupBy.field] : undefined;
    return {
      value: record.id,
      label: String(record[definition.titleField] ?? "") || definition.label,
      /*
       * Retired rows stay selectable. A destination already pointing at an
       * archived province must not silently lose it the next time it is saved.
       */
      inactive:
        definition.status != null &&
        statusValueOf(definition, record) === definition.status.retired,
      ...(typeof group === "string" && group.trim() ? { group: group.trim() } : {}),
      /* A region has a code, not a slug: an attraction's theme names its region by it. */
      ...(typeof record.slug === "string" && record.slug
        ? { slug: record.slug }
        : typeof record.code === "string" && record.code
          ? { slug: record.code }
          : {}),
      /* An amenity's level and icon: the pickers offer by level and draw by icon. */
      ...(typeof record.level === "string" && record.level ? { level: record.level } : {}),
      ...(typeof record.iconKey === "string" && record.iconKey ? { icon: record.iconKey } : {}),
    };
  });
  /*
   * A list the curators numbered keeps their order — the tourism regions 1 to
   * 9, the interests group by group as the Interests tab shows them. Anything
   * else A to Z, grouped options by group; rows in no group last.
   */
  if (isArranged(definition.key) && definition.orderField) {
    const place = new Map(records.map((record, index) => [record.id, index]));
    const groups = definition.groupBy?.order ?? [];
    const groupAt = (group: string | undefined) => (group ? (groups.indexOf(group) + 1 || groups.length + 1) : groups.length + 2);
    return options.sort((a, b) => groupAt(a.group) - groupAt(b.group) || (place.get(a.value) ?? 0) - (place.get(b.value) ?? 0));
  }
  return options.sort(
    (a, b) => Number(!a.group) - Number(!b.group) || byName(a.group ?? "", b.group ?? "") || byName(a.label, b.label),
  );
}

interface UserRow {
  readonly id: string;
  readonly fullName: string | null;
  readonly email: string | null;
  readonly status: string | null;
}

/**
 * Accounts, for the fields and columns that name a person — who runs a listing,
 * who wrote a row. The whole account is USER_MANAGE's to read; every desk that
 * reads other people's rows reads the names alone, so a list that says
 * "created by" says a name to a BDO and an editor as well as an administrator.
 */
const loadUserOptions = cache(async (): Promise<ReferenceOption[]> => {
  const token = await getSessionToken();
  try {
    const users = await backendRequest<UserRow[]>("/users", {}, token ?? undefined);
    return users
      .map((user) => ({
        value: user.id,
        label: [user.fullName, user.email].filter(Boolean).join(" · ") || "Unnamed account",
        inactive: user.status === "INACTIVE",
      }))
      .sort((a, b) => byName(a.label, b.label));
  } catch {
    const authors = await backendRequest<{ id: string; fullName: string }[]>("/users/authors", {}, token ?? undefined);
    return authors
      .map((author) => ({ value: author.id, label: author.fullName, inactive: false }))
      .sort((a, b) => byName(a.label, b.label));
  }
});

async function optionsFor(key: ReferenceKey): Promise<readonly ReferenceOption[]> {
  /*
   * One list the account may not read — `/users` needs USER_MANAGE — must not
   * take the whole form down. The dropdown is simply empty, and the API still
   * decides whatever is saved.
   */
  try {
    if (key === "tourism-regions") {
      const regions = (await getRecords("regions")).filter((region) => region.kind === "TOURISM");
      const options = toOptions(getResource("regions"), regions);
      /* Each region's own categories and tags, in its order: all an attraction of that region is offered. */
      return options.map((option) => {
        const region = regions.find((each) => each.id === option.value);
        return {
          ...option,
          links: {
            categoryIds: idsOf(region?.categoryIds),
            tagIds: idsOf(region?.tagIds),
          },
        };
      });
    }
    /* The zones provinces sit in: never a tourism region, which is a theme. */
    if (key === "zones") {
      const zones = (await getRecords("regions")).filter((region) => region.kind !== "TOURISM");
      return toOptions(getResource("regions"), zones);
    }
    if (!isResourceKey(key)) return await loadUserOptions();
    return toOptions(getResource(key), await getRecords(key));
  } catch {
    return [];
  }
}

/**
 * Loads every list a screen's dropdowns and reference columns need, in one
 * pass. Which lists those are is read off the resource declaration.
 */
export async function getReferenceOptions(
  definition: ResourceDefinition,
  include: "columns" | "fields" | "both" = "both",
): Promise<ReferenceOptions> {
  const keys = referencedResources(definition, include);
  const lists = await Promise.all(keys.map((key) => optionsFor(key)));

  return Object.fromEntries(
    keys.map((key, index) => [key, lists[index]]),
  ) as ReferenceOptions;
}

function idsOf(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}
