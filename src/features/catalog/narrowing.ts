/**
 * A list of choices narrowed by another field: an attraction's categories,
 * tags and interests are those of its theme's tourism region. Pure, so the
 * rule is tested without a form.
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
  /* A source is named by its id, or by its slug — a theme is a region's code. */
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
 * An attraction's tourism regions, which it is listed on: its theme's region,
 * and each region one of its categories belongs to — a waterfall is listed on
 * both regions that have Waterfall. Ids in the regions' own order.
 *
 * @param theme the theme, a region's code (its option's slug)
 */
export function derivedRegions(
  regions: readonly ReferenceOption[],
  theme: string | undefined,
  categoryIds: readonly string[],
): string[] {
  const chosen = new Set(categoryIds);
  return regions
    .filter(
      (region) =>
        (theme !== undefined && region.slug === theme) ||
        (region.links?.categoryIds ?? []).some((id) => chosen.has(id)),
    )
    .map((region) => region.value);
}
