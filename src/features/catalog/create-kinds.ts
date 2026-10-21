import { canCreateResource } from "@/features/auth/permissions";
import { byName } from "@/features/catalog/resources";

/**
 * What "Create Destination" asks first: the main type of what is being added —
 * an attraction, a place to eat, a place to stay, an activity. Only the main
 * type is chosen here; the form that opens asks the rest in its own words (a
 * stay's first step is its kind of stay, a food listing's its kind of place).
 * Only what this account may create is offered: the attraction site first, the rest A to Z.
 */

export type CreateKindKey = "destinations" | "stays" | "foods" | "activities";

export interface CreateKind {
  readonly key: CreateKindKey;
  readonly title: string;
  readonly description: string;
  readonly href: string;
}

/** A kind's name and line, in the reader's language (`forms.create.kinds`). */
export type CreateKindWords = (key: CreateKindKey) => { readonly title: string; readonly description: string };

/** Marks a form opened from the chooser, so its Back goes back to it. */
const FROM = "from=create";

const KINDS: readonly { readonly key: CreateKindKey; readonly href: string }[] = [
  { key: "destinations", href: `/destinations/new?${FROM}` },
  { key: "foods", href: `/foods/new?${FROM}` },
  { key: "activities", href: `/activities/new?${FROM}` },
  { key: "stays", href: `/stays/new?${FROM}` },
];

export function createKinds(roles: readonly string[], words: CreateKindWords): readonly CreateKind[] {
  return KINDS.filter((kind) => canCreateResource(roles, kind.key))
    .map((kind) => ({ ...kind, ...words(kind.key) }))
    .toSorted((a, b) => Number(b.key === "destinations") - Number(a.key === "destinations") || byName(a.title, b.title));
}
