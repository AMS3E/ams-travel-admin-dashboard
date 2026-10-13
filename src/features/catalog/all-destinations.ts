import type { BadgeTone } from "@/components/ui/badge";
import { canCreateResource, canManageResource } from "@/features/auth/permissions";
import type { CatalogRecord } from "@/features/catalog/api/contracts";
import { mediaPath, statusOption, statusValueOf } from "@/features/catalog/resource";
import { byName, getResource } from "@/features/catalog/resources";

/**
 * "All Destinations": every attraction, place to eat and stay in one list,
 * with a tab per main type. Tourism corridors are not destinations: they have
 * their own page. The All tab reads every type together;
 * a type's tab is that type's own table, with everything it can do.
 */

export type DestinationTypeKey = "destinations" | "foods" | "stays";

export interface DestinationType {
  readonly key: DestinationTypeKey;
  /** The `?type=` it is opened with. */
  readonly tab: string;
  /** The tab's name. */
  readonly label: string;
  /** One of them, in a sentence: "New stay". */
  readonly one: string;
}

/** The main types, A to Z — the same ones Create Destination offers. */
export const DESTINATION_TYPES: readonly DestinationType[] = [
  { key: "destinations", tab: "attractions", label: "Attractions", one: "attraction" },
  { key: "foods", tab: "food", label: "Food", one: "food listing" },
  { key: "stays", tab: "stays", label: "Stays", one: "stay" },
];

/**
 * The list a record of this table goes back to: a stay or a food listing to
 * its tab of All Destinations, where they are listed; anything else to its
 * own page.
 */
export function listPageOf(key: string): string {
  const type = DESTINATION_TYPES.find((each) => each.key === key && each.key !== "destinations");
  return type ? `/destinations?type=${type.tab}` : `/${key}`;
}

/** What that list is called, for a Back link: "All Destinations", or its own name. */
export function listPageLabel(key: string, ownName: string): string {
  const page = listPageOf(key);
  const on = (list: string) => page === list || page.startsWith(`${list}?`);
  return on("/destinations") ? "All Destinations" : ownName;
}

/** The main types this account manages. */
export function destinationTypes(roles: readonly string[]): readonly DestinationType[] {
  return DESTINATION_TYPES.filter((type) => canManageResource(roles, type.key));
}

/** The tab a link asks for, if this account has it; otherwise All. */
export function chosenType(tab: unknown, types: readonly DestinationType[]): DestinationType | null {
  return types.find((type) => type.tab === tab) ?? null;
}

/** Where "New …" goes from a tab: the chooser from All, that type's form from its tab. */
export function createHref(roles: readonly string[], type: DestinationType | null): string | null {
  if (!type) return destinationTypes(roles).some((each) => canCreateResource(roles, each.key)) ? "/create" : null;
  return canCreateResource(roles, type.key) ? `/${type.key}/new` : null;
}

/** One row of the All tab, whatever its type. */
export interface DestinationRow {
  readonly id: string;
  readonly type: DestinationTypeKey;
  /** "Attraction", "Food", "Stay". */
  readonly typeLabel: string;
  readonly name: string;
  /** Its own type within the main one: "Hotel", "Cafe". */
  readonly kind: string | null;
  /** Where it is: its address, else its province. */
  readonly place: string | null;
  readonly status: string | null;
  readonly statusLabel: string;
  readonly statusTone: BadgeTone;
  readonly createdAt: string | null;
  readonly createdBy: string | null;
  /** Who may send it for review: who wrote it, and the partner a stay or a food listing is listed for. */
  readonly authors: readonly string[];
  /** Its cover photo's link, when it has one. */
  readonly cover: string | null;
  readonly href: string;
}

const SINGULAR: Readonly<Record<DestinationTypeKey, string>> = {
  destinations: "Attraction",
  foods: "Food",
  stays: "Stay",
};

/** How a type reads where its option label would not. */
const KIND_WORDS: Readonly<Record<string, string>> = { CAFE: "Cafe" };

const text = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value.trim() : null);

/** A type's rows as the All tab shows them. */
export function toRows(
  type: DestinationTypeKey,
  records: readonly CatalogRecord[],
  provinceNames: ReadonlyMap<string, string> = new Map(),
): DestinationRow[] {
  const definition = getResource(type);
  const kinds = definition.fields.find((field) => field.name === "type")?.options ?? [];
  return records.map((record) => {
    const status = statusValueOf(definition, record);
    const option = statusOption(definition, status);
    const kindValue = text(record.type);
    const province = typeof record.provinceId === "string" ? provinceNames.get(record.provinceId) ?? null : null;
    return {
      id: record.id,
      type,
      typeLabel: SINGULAR[type],
      name: text(record[definition.titleField]) ?? `Untitled ${SINGULAR[type].toLowerCase()}`,
      kind: kindValue ? (KIND_WORDS[kindValue] ?? kinds.find((each) => each.value === kindValue)?.label ?? null) : null,
      place: text(record.address) ?? province,
      status,
      statusLabel: option?.label ?? "—",
      statusTone: option?.tone ?? "neutral",
      createdAt: text(record.createdAt),
      createdBy: text(record.createdBy),
      authors: [text(record.ownerUserId), text(record.createdBy)].filter((id): id is string => id !== null),
      cover: text(record.coverUrl) ?? (text(record.coverKey) ? mediaPath(text(record.coverKey)!) : null),
      href: `/${type}/${record.id}`,
    };
  });
}

/** Every type's rows together, A to Z by name. */
export function allRows(groups: readonly (readonly DestinationRow[])[]): DestinationRow[] {
  return groups.flat().sort((a, b) => byName(a.name, b.name) || byName(a.typeLabel, b.typeLabel));
}
