import { canCreateResource } from "@/features/auth/permissions";
import { byName } from "@/features/catalog/resources";

/**
 * What "Create Destination" asks first: the main type of what is being added —
 * an attraction, a place to eat, a place to stay. Only the main
 * type is chosen here; the form that opens asks the rest in its own words (a
 * stay's first step is its kind of stay, a food listing's its kind of place).
 * Only what this account may create is offered, A to Z.
 */

export type CreateKindKey = "destinations" | "stays" | "foods";

export interface CreateKind {
  readonly key: CreateKindKey;
  readonly title: string;
  readonly description: string;
  readonly href: string;
}

/** Marks a form opened from the chooser, so its Back goes back to it. */
const FROM = "from=create";

const KINDS: readonly CreateKind[] = [
  {
    key: "destinations",
    title: "Attraction",
    description: "A temple, a beach, a waterfall, a museum, a village — a place worth the trip.",
    href: `/destinations/new?${FROM}`,
  },
  {
    key: "foods",
    title: "Food",
    description: "A restaurant, a cafe, a street-food stall, a market, a bakery or a bar.",
    href: `/foods/new?${FROM}`,
  },
  {
    key: "stays",
    title: "Stay",
    description: "A hotel, a guesthouse, a hostel, a resort, a homestay or a villa.",
    href: `/stays/new?${FROM}`,
  },
];

export function createKinds(roles: readonly string[]): readonly CreateKind[] {
  return KINDS.filter((kind) => canCreateResource(roles, kind.key)).toSorted((a, b) => byName(a.title, b.title));
}
