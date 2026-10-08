/**
 * What the Menu step works out from a dish's values, kept pure so the rules are
 * tested without a browser: how a dish reads on a card, the courses a menu is
 * ordered by, the Khmer classics a listing can start from, and what the whole
 * menu comes to.
 *
 * A dish is its registry form values — strings for numbers, as every form in
 * the dashboard holds them — so a dish made here saves through the same path
 * and the same checks as any other row.
 */

import type { FormValues } from "@/features/catalog/resource";
import { COURSES_BY_KIND, DISH_LABELS, MENU_COURSES } from "@/features/catalog/resources";

/** How hot it is, said the way a diner would ask. */
export const SPICE_WORDS = ["Not spicy", "Mild", "Hot", "Khmer hot"] as const;

export function spiceLabel(level: unknown): string {
  const n = typeof level === "string" ? Number.parseInt(level, 10) : typeof level === "number" ? level : 0;
  return SPICE_WORDS[Number.isFinite(n) && n >= 0 && n < SPICE_WORDS.length ? n : 0];
}

export function courseLabel(course: unknown): string {
  return MENU_COURSES.find((option) => option.value === course)?.label ?? "Main";
}

export function labelName(slug: string): string {
  return DISH_LABELS.find((option) => option.value === slug)?.label ?? slug;
}

/** The order a menu is read in: the courses as the registry lists them. */
export const COURSE_ORDER: readonly string[] = MENU_COURSES.map((option) => option.value);

function count(values: FormValues, name: string): number {
  const raw = values[name];
  const parsed = typeof raw === "string" ? Number.parseInt(raw, 10) : typeof raw === "number" ? raw : 0;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function price(values: FormValues): number | null {
  const raw = values.price;
  if (typeof raw !== "string" || !raw.trim()) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

const labelsOf = (values: FormValues): readonly string[] => (Array.isArray(values.labels) ? values.labels : []);

/** "Main · One bowl · Feeds 2 · Mild" — the line under a dish's name. */
export function dishLine(values: FormValues): string {
  /* The host's own heading leads; the API's course only where no heading has been given yet. */
  const parts = [sectionOf(values) || courseLabel(values.course)];
  const portion = typeof values.portion === "string" ? values.portion.trim() : "";
  if (portion) parts.push(portion);
  const serves = count(values, "serves");
  if (serves > 1) parts.push(`Feeds ${serves}`);
  if (count(values, "spiceLevel") > 0) parts.push(spiceLabel(values.spiceLevel));
  return parts.join(" · ");
}

/** What a diner is warned about, from the labels: "Contains pork · Contains nuts". */
export function warningLine(values: FormValues): string {
  return labelsOf(values)
    .filter((slug) => slug.startsWith("contains-") || slug === "raw")
    .map(labelName)
    .join(" · ");
}

/** What a diner is offered, from the labels: "Vegetarian · Halal". */
export function suitsLine(values: FormValues): string {
  return labelsOf(values)
    .filter((slug) => !slug.startsWith("contains-") && slug !== "raw")
    .map(labelName)
    .join(" · ");
}

/** A dish's heading on the menu, in the host's own words; "" under none. */
export function sectionOf(values: FormValues): string {
  return typeof values.section === "string" ? values.section.trim() : "";
}

/**
 * The menu as the host prints it: each heading in the order it first appears
 * down the menu, `extra` headings that hold nothing yet after them, and the
 * dishes under no heading last.
 */
export function bySection(
  dishes: readonly { readonly values: FormValues }[],
  extra: readonly string[] = [],
): readonly { readonly section: string; readonly dishes: readonly { readonly values: FormValues }[] }[] {
  const order: string[] = [];
  const seen = (name: string) => {
    if (name && !order.includes(name)) order.push(name);
  };
  for (const dish of dishes) seen(sectionOf(dish.values));
  for (const name of extra) seen(name.trim());
  const groups = order.map((section) => ({ section, dishes: dishes.filter((dish) => sectionOf(dish.values) === section) }));
  const loose = dishes.filter((dish) => !sectionOf(dish.values));
  return loose.length ? [...groups, { section: "", dishes: loose }] : groups;
}

export interface MenuSummary {
  /** Dishes written, on the menu or off it. */
  readonly dishes: number;
  /** How many sections they cover. */
  readonly sections: number;
  readonly signature: number;
  /** The cheapest dish on the menu with a price. */
  readonly fromPrice: number | null;
  readonly onMenu: number;
}

export function menuSummary(dishes: readonly FormValues[]): MenuSummary {
  const serving = dishes.filter((dish) => dish.status !== "INACTIVE");
  const prices = serving.map(price).filter((value): value is number => value !== null);
  return {
    dishes: dishes.length,
    sections: new Set(dishes.map(sectionOf).filter(Boolean)).size,
    signature: dishes.filter((dish) => dish.isSignature === true).length,
    fromPrice: prices.length ? Math.min(...prices) : null,
    onMenu: serving.length,
  };
}

/**
 * The headings this kind of place reads down: a coffee shop leads with Coffee,
 * a bar with Drinks, a restaurant with its courses. Anything else follows, in
 * the registry's order, so a heading is never lost.
 */

/** What one thing on each kind of menu is called, and an example to type over. */
export interface MenuWords {
  readonly one: string;
  readonly many: string;
  /** The headings a menu is divided into: a restaurant's courses, a cafe's sections. */
  readonly sections: string;
  readonly example: string;
  readonly exampleKm: string;
  readonly exampleSaid: string;
}

const DISHES: MenuWords = {
  one: "dish",
  many: "dishes",
  sections: "Courses",
  example: "Fish amok",
  exampleKm: "អាម៉ុកត្រី",
  exampleSaid: "amok trey",
};

export const MENU_WORDS: Readonly<Record<string, MenuWords>> = {
  RESTAURANT: DISHES,
  CAFE: { one: "item", many: "items", sections: "Sections", example: "Iced Khmer coffee", exampleKm: "កាហ្វេទឹកកក", exampleSaid: "kafe teuk kork" },
  STREET_FOOD: { ...DISHES, sections: "Sections", example: "Grilled pork with rice", exampleKm: "បាយសាច់ជ្រូក", exampleSaid: "bai sach chrouk" },
  MARKET: { ...DISHES, sections: "Sections", example: "Num banh chok", exampleKm: "នំបញ្ចុក", exampleSaid: "num banh chok" },
  OTHER: { one: "item", many: "items", sections: "Sections", example: "House special", exampleKm: "", exampleSaid: "" },
};

export function menuWords(foodType: string): MenuWords {
  return MENU_WORDS[foodType] ?? DISHES;
}

/** What a blank dish on this kind of menu starts as: a cafe's first heading is Coffee. */
export function firstCourse(foodType: string): string {
  return COURSES_BY_KIND[foodType]?.[0] ?? "MAIN";
}

