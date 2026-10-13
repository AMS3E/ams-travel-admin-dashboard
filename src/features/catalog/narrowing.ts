/**
 * A list of choices narrowed by another field: an attraction's categories,
 * tags and interests are those of its tourism region. Pure, so the rule is
 * tested without a form.
 */

import type { ReferenceOption } from "@/features/catalog/resource";

export interface NarrowedChoices {
  /** What the list offers: the chosen sources' own options, and anything already chosen outside them. */
  readonly options: readonly ReferenceOption[];
  /** The chosen sources' names, in the order they were chosen; empty when none is chosen and nothing is narrowed. */
  readonly scope: readonly string[];
  /** Already chosen, but not one of the chosen sources' own: shown so it can be taken away, not dropped unseen. */
  readonly outside: ReadonlySet<string>;
}

/**
 * The options a field narrowed by `sources` offers. Nothing chosen in the
 * source field narrows nothing: every option is offered.
 *
 * @param linkKey which of a source option's `links` lists this field's allowed values
 */
/** The links whose order is the region's own: its categories and its search filters. */
const ORDERED_LINKS: ReadonlySet<string> = new Set(["categoryIds", "tagIds"]);

export function narrowChoices(
  options: readonly ReferenceOption[],
  sources: readonly ReferenceOption[],
  chosenSources: readonly string[],
  linkKey: string,
  selected: readonly string[],
): NarrowedChoices {
  /* A source is named by its id, or by its slug — a region's code. */
  const chosen = chosenSources
    .map((id) => sources.find((source) => source.value === id || source.slug === id))
    .filter((source): source is ReferenceOption => source !== undefined);
  if (chosen.length === 0) return { options, scope: [], outside: new Set() };

  const linked = chosen.flatMap((source) => source.links?.[linkKey] ?? []);
  const allowed = new Set(linked);
  const picked = new Set(selected);
  /* A region's categories and tags are in its own order; its interests keep the Interests tab's. */
  const rank = new Map<string, number>();
  if (ORDERED_LINKS.has(linkKey)) linked.forEach((id, index) => rank.has(id) || rank.set(id, index));
  return {
    options: options
      .filter((option) => allowed.has(option.value) || picked.has(option.value))
      .toSorted((a, b) => (rank.get(a.value) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.value) ?? Number.MAX_SAFE_INTEGER)),
    scope: chosen.map((source) => source.label),
    outside: new Set(selected.filter((value) => !allowed.has(value))),
  };
}

/**
 * The one region an attraction opens on when it is listed on several — a place
 * listed before each had one region of its own: its theme's region, or else
 * the first. One already: as it is.
 *
 * @param theme the region's code (its option's slug)
 */
export function mainRegion(regions: readonly ReferenceOption[], theme: string | undefined, chosenIds: readonly string[]): string[] {
  if (chosenIds.length < 2) return [...chosenIds];
  const own = theme ? regions.find((region) => region.slug === theme && chosenIds.includes(region.value)) : undefined;
  return [own?.value ?? chosenIds[0]];
}

/**
 * The API's kind of a stay or a food listing, by the interest it is filed
 * under — the Stays and Food shelves of the mind map, nothing else. The API's
 * other kinds (guesthouse, hostel, villa, cafe as such, other) are never given.
 */
export const KIND_BY_INTEREST: Readonly<Record<string, string>> = {
  "Luxury Hotel": "HOTEL",
  Homestay: "HOMESTAY",
  Resorts: "RESORT",
  "Private Island": "RESORT",
  "Eco Lodge": "RESORT",
  Restaurants: "RESTAURANT",
  Markets: "MARKET",
  Drinks: "CAFE",
  Streetfood: "STREET_FOOD",
  "Traditional Food": "RESTAURANT",
  Skybar: "RESTAURANT",
};

/**
 * A stay's or a food listing's kind: that of the first interest ticked, kept
 * as it is while an interest still says so — the API hands interests back in
 * its own order, and the kind must not change with it. `current` stays while
 * nothing is ticked, so an opened record is not blanked.
 */
export function kindOf(interests: readonly ReferenceOption[], chosenIds: readonly string[], current: string): string {
  const kinds = chosenIds
    .map((id) => KIND_BY_INTEREST[interests.find((option) => option.value === id)?.label ?? ""])
    .filter((kind): kind is string => Boolean(kind));
  if (!kinds.length) return current;
  return kinds.includes(current) ? current : kinds[0]!;
}

/** An attraction's theme: the code of the tourism region chosen for it, "" while none is. */
export function themeOf(regions: readonly ReferenceOption[], chosenIds: readonly string[]): string {
  const chosen = chosenIds[0];
  return (chosen && regions.find((region) => region.value === chosen)?.slug) || "";
}
