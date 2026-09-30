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
  const parts = [courseLabel(values.course)];
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

export interface MenuSummary {
  /** Dishes written, on the menu or off it. */
  readonly dishes: number;
  /** How many courses they cover. */
  readonly courses: number;
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
    courses: new Set(dishes.map((dish) => (typeof dish.course === "string" ? dish.course : "MAIN"))).size,
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
export function courseOrder(foodType?: string): readonly string[] {
  const own = foodType ? COURSES_BY_KIND[foodType] ?? [] : [];
  return [...own, ...COURSE_ORDER.filter((course) => !own.includes(course))];
}

/** The dishes grouped under their course headings, in the order that kind of place reads. */
export function byCourse(dishes: readonly { readonly values: FormValues }[], foodType?: string): readonly {
  readonly course: string;
  readonly label: string;
  readonly dishes: readonly { readonly values: FormValues }[];
}[] {
  return courseOrder(foodType).flatMap((course) => {
    const under = dishes.filter((dish) => (typeof dish.values.course === "string" ? dish.values.course : "MAIN") === course);
    return under.length ? [{ course, label: courseLabel(course), dishes: under }] : [];
  });
}

/** What a traveller looks for on a dish, as a short checklist. */
export function dishChecklist(values: FormValues): readonly { readonly label: string; readonly done: boolean }[] {
  const photos = Array.isArray(values.photoKeys) ? values.photoKeys.length : 0;
  const filled = (name: string) => typeof values[name] === "string" && (values[name] as string).trim().length > 0;
  return [
    { label: "Price", done: price(values) !== null },
    { label: "Name in Khmer", done: filled("localName") },
    { label: "How to say it", done: filled("pronunciation") },
    { label: "Description", done: filled("description") },
    { label: "Photo", done: photos > 0 },
    { label: "Diet and allergens", done: labelsOf(values).length > 0 },
  ];
}

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

export interface DishTemplate {
  readonly id: string;
  readonly title: string;
  readonly values: Readonly<FormValues>;
}

const dish = (
  id: string,
  name: string,
  localName: string,
  pronunciation: string,
  course: string,
  extra: FormValues = {},
): DishTemplate => ({
  id,
  title: name,
  values: { name, localName, pronunciation, course, ...extra },
});

/**
 * The dishes a place of each kind starts from — Cambodia's own, with the Khmer
 * name and how it sounds already written, because that is the part a listing
 * usually leaves out and a traveller most needs at the counter.
 */
export const DISH_TEMPLATES: Readonly<Record<string, readonly DishTemplate[]>> = {
  RESTAURANT: [
    /* A starter or two, to share while the kitchen cooks. */
    dish("fresh-spring-rolls", "Fresh spring rolls", "", "", "STARTER", { portion: "Four rolls" }),
    dish("fried-spring-rolls", "Fried spring rolls", "", "", "STARTER", { portion: "Four rolls" }),
    dish("fish-cakes", "Fish cakes", "", "", "STARTER"),
    dish("prawn-crackers", "Prawn crackers", "", "", "STARTER", { labels: ["contains-shellfish"] }),
    /* Soups, which come to the middle of the table. */
    dish("samlor-korko", "Samlor korko", "", "", "SOUP", { description: "The everyday Khmer vegetable stew, thickened with roasted rice.", serves: "2" }),
    dish("samlor-machu", "Samlor machu — sour soup", "", "", "SOUP", { serves: "2" }),
    dish("tom-yum", "Tom yum", "", "", "SOUP", { serves: "2", spiceLevel: "2" }),
    dish("chicken-ginger-soup", "Chicken and ginger soup", "", "", "SOUP", { serves: "2" }),
    /* Salads, eaten with the rest rather than before it. */
    dish("green-mango-salad", "Green mango salad", "", "", "SALAD", { spiceLevel: "1" }),
    dish("banana-blossom-salad", "Banana blossom salad", "", "", "SALAD"),
    dish("beef-salad", "Khmer beef salad", "", "", "SALAD", { spiceLevel: "1" }),
    /* Noodles. */
    dish("kuy-teav-restaurant", "Kuy teav noodle soup", "គុយទាវ", "kuy teav", "NOODLES", { portion: "One bowl" }),
    dish("num-banh-chok-restaurant", "Num banh chok", "នំបញ្ចុក", "num banh chok", "NOODLES", {
      description: "Rice noodles under a green fish gravy, with raw vegetables and herbs.",
    }),
    dish("lort-cha", "Lort cha", "", "", "NOODLES", { description: "Short rice noodles fried with beef and bean sprouts, a fried egg on top." }),
    dish("fried-noodles", "Fried noodles", "", "", "NOODLES"),
    /* Rice, and what comes on it. */
    dish("bai-cha", "Fried rice", "បាយឆា", "bai cha", "RICE", { portion: "One plate" }),
    dish("bai-sach-chrouk-restaurant", "Grilled pork with rice", "បាយសាច់ជ្រូក", "bai sach chrouk", "RICE", {
      description: "Cambodia's breakfast: pork grilled over coals, rice, pickles and a bowl of broth.",
      labels: ["contains-pork"],
      isSignature: true,
    }),
    dish("chicken-rice", "Chicken rice", "", "", "RICE", { portion: "One plate" }),
    dish("steamed-rice", "Steamed rice", "", "", "RICE", { portion: "One bowl", labels: ["vegan"] }),
    /* Curries. */
    dish("khmer-curry", "Khmer red curry", "ការីខ្មែរ", "kari khmer", "CURRY", {
      description: "Coconut curry with sweet potato and lemongrass, mild rather than hot.",
      spiceLevel: "1",
      serves: "2",
    }),
    dish("saraman-curry", "Saraman curry", "", "", "CURRY", { description: "A slow beef curry with peanuts, richer and sweeter than the red one.", serves: "2", labels: ["contains-nuts"] }),
    /* Off the grill. */
    dish("grilled-chicken", "Grilled chicken", "", "", "GRILL", { portion: "Half a chicken" }),
    dish("grilled-fish-restaurant", "Grilled fish", "ត្រីអាំង", "trey ang", "GRILL", { serves: "2" }),
    dish("grilled-squid", "Grilled squid", "", "", "GRILL", { labels: ["contains-shellfish"] }),
    dish("skewers-restaurant", "Grilled skewers", "ចង្កាក់អាំង", "chak ang", "GRILL", { portion: "Per skewer" }),
    /* Seafood, for a table by the water. */
    dish("kampot-pepper-crab", "Kampot pepper crab", "", "", "SEAFOOD", { description: "Crab fried with green Kampot peppercorns, still on the stalk.", serves: "2", labels: ["contains-shellfish"] }),
    dish("fried-squid", "Fried squid", "", "", "SEAFOOD", { labels: ["contains-shellfish"] }),
    dish("steamed-fish", "Steamed fish", "", "", "SEAFOOD", { serves: "2" }),
    /* The dishes a first-time visitor asks for by name. */
    dish("fish-amok", "Fish amok", "អាម៉ុកត្រី", "amok trey", "MAIN", {
      description: "Fish steamed in banana leaf with coconut, lemongrass and noni leaf.",
      portion: "One bowl",
      spiceLevel: "1",
      isSignature: true,
    }),
    dish("lok-lak", "Beef lok lak", "ឡុកឡាក់", "lok lak", "MAIN", {
      description: "Peppered beef over rice and salad, with a lime and pepper dip.",
      portion: "With rice",
      spiceLevel: "1",
    }),
    dish("chicken-cashew", "Chicken with cashew nuts", "", "", "MAIN", { labels: ["contains-nuts"] }),
    dish("morning-glory", "Stir-fried morning glory", "", "", "MAIN", { labels: ["vegetarian"] }),
    /* Sides. */
    dish("prahok-ktis", "Prahok ktis", "", "", "SIDE", { description: "Fermented fish and minced pork in coconut cream, with raw vegetables to dip.", labels: ["contains-pork"] }),
    dish("pickles", "Pickled vegetables", "", "", "SIDE", { labels: ["vegan"] }),
    dish("fresh-herbs", "Fresh herbs and salad", "", "", "SIDE", { labels: ["vegan"] }),
    /* Puddings. */
    dish("chek-khtis-restaurant", "Banana in coconut cream", "ចេកខ្ទិះ", "chek khtis", "DESSERT", { labels: ["vegan"] }),
    dish("sticky-rice-mango", "Sticky rice with mango", "", "", "DESSERT", { labels: ["vegan"] }),
    dish("pumpkin-custard", "Pumpkin custard", "", "", "DESSERT", { labels: ["vegetarian"] }),
    /* What is poured with it — a bar listed as a restaurant writes its list here. */
    dish("angkor-beer", "Angkor draught", "ស្រាបៀរអង្គរ", "sra bier Angkor", "DRINK", { portion: "Glass" }),
    dish("sombai", "Sombai rice liqueur", "សុំបាយ", "sombai", "DRINK", { portion: "Shot" }),
    dish("sugarcane-restaurant", "Sugarcane juice", "ទឹកអំពៅ", "teuk ampov", "DRINK", { labels: ["vegan"] }),
    dish("coconut-restaurant", "Fresh coconut", "ទឹកដូង", "teuk doung", "DRINK", { labels: ["vegan"] }),
    dish("iced-coffee-restaurant", "Iced Khmer coffee", "កាហ្វេទឹកកក", "kafe teuk kork", "COFFEE", {
      description: "Strong dark roast over ice with condensed milk.",
      labels: ["vegetarian", "contains-dairy"],
      isSignature: true,
    }),
    dish("soft-drink", "Soft drinks", "", "", "DRINK", { labels: ["vegan"] }),
  
  ],
  CAFE: [
    /* Coffee, in the order a board reads. */
    dish("iced-coffee", "Iced Khmer coffee", "កាហ្វេទឹកកក", "kafe teuk kork", "COFFEE", {
      description: "Strong dark roast over ice with condensed milk.",
      labels: ["vegetarian", "contains-dairy"],
      isSignature: true,
    }),
    dish("black-coffee", "Black coffee", "កាហ្វេខ្មៅ", "kafe khmao", "COFFEE", { labels: ["vegan"] }),
    dish("hot-coffee", "Hot coffee", "កាហ្វេក្តៅ", "kafe kdao", "COFFEE", { labels: ["vegan"] }),
    dish("milk-coffee", "Coffee with milk", "កាហ្វេទឹកដោះគោ", "kafe teuk dah ko", "COFFEE", {
      description: "Hot or iced, with condensed or fresh milk.",
      labels: ["vegetarian", "contains-dairy"],
    }),
    dish("espresso", "Espresso", "", "", "COFFEE", { portion: "Single shot", labels: ["vegan"] }),
    dish("double-espresso", "Double Espresso", "", "", "COFFEE", { portion: "Double shot", labels: ["vegan"] }),
    dish("americano", "Americano", "", "", "COFFEE", { labels: ["vegan"] }),
    dish("iced-americano", "Iced Americano", "", "", "COFFEE", { labels: ["vegan"] }),
    dish("cappuccino", "Cappuccino", "", "", "COFFEE", { labels: ["vegetarian", "contains-dairy"] }),
    dish("latte", "Cafe Latte", "", "", "COFFEE", { labels: ["vegetarian", "contains-dairy"] }),
    dish("iced-latte", "Iced Latte", "", "", "COFFEE", { labels: ["vegetarian", "contains-dairy"] }),
    dish("vanilla-latte", "Vanilla Latte", "", "", "COFFEE", { labels: ["vegetarian", "contains-dairy"] }),
    dish("caramel-latte", "Caramel Latte", "", "", "COFFEE", { labels: ["vegetarian", "contains-dairy"] }),
    dish("hazelnut-latte", "Hazelnut Latte", "", "", "COFFEE", { labels: ["vegetarian", "contains-dairy", "contains-nuts"] }),
    dish("mocha", "Mocha", "", "", "COFFEE", { labels: ["vegetarian", "contains-dairy"] }),
    dish("iced-mocha", "Iced Mocha", "", "", "COFFEE", { labels: ["vegetarian", "contains-dairy"] }),
    dish("caramel-macchiato", "Caramel Macchiato", "", "", "COFFEE", { labels: ["vegetarian", "contains-dairy"] }),
    dish("flat-white", "Flat White", "", "", "COFFEE", { labels: ["vegetarian", "contains-dairy"] }),
    dish("cold-brew", "Cold Brew", "", "", "COFFEE", { labels: ["vegan"] }),
    dish("nitro-cold-brew", "Nitro Cold Brew", "", "", "COFFEE", { labels: ["vegan"] }),
    dish("affogato", "Affogato", "", "", "COFFEE", { labels: ["vegetarian", "contains-dairy"] }),
    dish("vietnamese-coffee", "Vietnamese Coffee", "", "", "COFFEE", { labels: ["vegetarian", "contains-dairy"] }),
    dish("coconut-coffee", "Coconut Coffee", "", "", "COFFEE", { labels: ["vegetarian"] }),
    dish("salted-caramel-coffee", "Salted Caramel Coffee", "", "", "COFFEE", { labels: ["vegetarian", "contains-dairy"] }),
    /* Everything else poured: matcha, chocolate, milk teas, iced teas, smoothies, frappes, sodas and juices. */
    dish("matcha-latte", "Matcha Latte", "", "", "DRINK", { labels: ["vegetarian", "contains-dairy"] }),
    dish("iced-matcha-latte", "Iced Matcha Latte", "", "", "DRINK", { labels: ["vegetarian", "contains-dairy"] }),
    dish("strawberry-matcha-latte", "Strawberry Matcha Latte", "", "", "DRINK", { labels: ["vegetarian", "contains-dairy"] }),
    dish("chocolate-latte", "Chocolate Latte", "", "", "DRINK", { labels: ["vegetarian", "contains-dairy"] }),
    dish("hot-chocolate", "Hot Chocolate", "", "", "DRINK", { labels: ["vegetarian", "contains-dairy"] }),
    dish("thai-milk-tea", "Thai Milk Tea", "", "", "DRINK", { labels: ["vegetarian", "contains-dairy"] }),
    dish("green-milk-tea", "Green Milk Tea", "", "", "DRINK", { labels: ["vegetarian", "contains-dairy"] }),
    dish("brown-sugar-milk-tea", "Brown Sugar Milk Tea", "", "", "DRINK", { labels: ["vegetarian", "contains-dairy"] }),
    dish("taro-milk-tea", "Taro Milk Tea", "", "", "DRINK", { labels: ["vegetarian", "contains-dairy"] }),
    dish("strawberry-milk", "Strawberry Milk", "", "", "DRINK", { labels: ["vegetarian", "contains-dairy"] }),
    dish("lemon-tea", "Lemon Iced Tea", "តែក្រូចឆ្មា", "tae krauch chhma", "DRINK", { labels: ["vegan"] }),
    dish("peach-iced-tea", "Peach Iced Tea", "", "", "DRINK", { labels: ["vegan"] }),
    dish("passion-fruit-tea", "Passion Fruit Tea", "", "", "DRINK", { labels: ["vegan"] }),
    dish("lychee-tea", "Lychee Tea", "", "", "DRINK", { labels: ["vegan"] }),
    dish("green-tea", "Green Tea", "", "", "DRINK", { labels: ["vegan"] }),
    dish("honey-lemon-tea", "Honey Lemon Tea", "", "", "DRINK", { labels: ["vegetarian"] }),
    dish("mango-smoothie", "Mango Smoothie", "", "", "DRINK", { labels: ["vegetarian"] }),
    dish("strawberry-smoothie", "Strawberry Smoothie", "", "", "DRINK", { labels: ["vegetarian"] }),
    dish("banana-smoothie", "Banana Smoothie", "", "", "DRINK", { labels: ["vegetarian"] }),
    dish("avocado-smoothie", "Avocado Smoothie", "", "", "DRINK", { labels: ["vegetarian", "contains-dairy"] }),
    dish("passion-fruit-smoothie", "Passion Fruit Smoothie", "", "", "DRINK", { labels: ["vegetarian"] }),
    dish("chocolate-frappe", "Chocolate Frappe", "", "", "DRINK", { labels: ["vegetarian", "contains-dairy"] }),
    dish("caramel-frappe", "Caramel Frappe", "", "", "DRINK", { labels: ["vegetarian", "contains-dairy"] }),
    dish("mocha-frappe", "Mocha Frappe", "", "", "DRINK", { labels: ["vegetarian", "contains-dairy"] }),
    dish("matcha-frappe", "Matcha Frappe", "", "", "DRINK", { labels: ["vegetarian", "contains-dairy"] }),
    dish("passion-fruit-soda", "Passion Fruit Soda", "", "", "DRINK", { labels: ["vegan"] }),
    dish("blueberry-soda", "Blueberry Soda", "", "", "DRINK", { labels: ["vegan"] }),
    dish("strawberry-soda", "Strawberry Soda", "", "", "DRINK", { labels: ["vegan"] }),
    dish("orange-juice", "Fresh Orange Juice", "ទឹកក្រូច", "teuk krauch", "DRINK", { labels: ["vegan"] }),
    dish("watermelon-juice", "Watermelon Juice", "", "", "DRINK", { labels: ["vegan"] }),
    /* Cambodia's own, which no imported drinks list names. */
    dish("iced-tea", "Iced tea", "តែទឹកកក", "tae teuk kork", "DRINK", { labels: ["vegan"] }),
    dish("hot-tea", "Hot tea", "តែក្តៅ", "tae kdao", "DRINK", { labels: ["vegan"] }),
    dish("shake", "Fruit shake", "ទឹកក្រឡុក", "teuk kralok", "DRINK", {
      description: "Mango, banana or dragon fruit, blended with ice.",
      labels: ["vegetarian"],
    }),
    dish("sugarcane", "Sugarcane juice", "ទឹកអំពៅ", "teuk ampov", "DRINK", { labels: ["vegan"] }),
    dish("coconut", "Fresh coconut", "ទឹកដូង", "teuk doung", "DRINK", { labels: ["vegan"] }),
    /* Eaten at the table: the sandwich, and the bakes a cafe that bakes puts out. */
    dish("num-pang", "Num pang sandwich", "នំបុ័ង", "num pang", "SNACK", {
      description: "Baguette with pate, pickled vegetables and herbs.",
      labels: ["contains-pork"],
    }),
    /* A bakery is a cafe that bakes: its counter is on the same board. */
    dish("croissant", "Croissant", "នំក្រូសង់", "num croissant", "SNACK", { labels: ["vegetarian", "contains-dairy"] }),
    dish("num-pang-bakery", "Baguette", "នំបុ័ងបារាំង", "num pang barang", "SNACK", { labels: ["vegetarian"] }),
    dish("chek-khtis", "Banana in coconut cream", "ចេកខ្ទិះ", "chek khtis", "DESSERT", { labels: ["vegan"] }),
  
  ],
  STREET_FOOD: [
    dish("bai-sach-chrouk", "Grilled pork with rice", "បាយសាច់ជ្រូក", "bai sach chrouk", "RICE", {
      description: "Cambodia's breakfast: pork grilled over coals, rice, pickles and a bowl of broth.",
      labels: ["contains-pork"],
      isSignature: true,
    }),
    dish("kuy-teav", "Kuy teav noodle soup", "គុយទាវ", "kuy teav", "NOODLES", { portion: "One bowl" }),
    dish("num-banh-chok", "Num banh chok", "នំបញ្ចុក", "num banh chok", "NOODLES", {
      description: "Rice noodles under a green fish gravy, with raw vegetables and herbs.",
    }),
    dish("skewers", "Grilled skewers", "ចង្កាក់អាំង", "chak ang", "GRILL", { portion: "Per skewer" }),
  ],
  MARKET: [
    dish("num-banh-chok-market", "Num banh chok", "នំបញ្ចុក", "num banh chok", "NOODLES", { portion: "One bowl" }),
    dish("kuy-teav-market", "Kuy teav noodle soup", "គុយទាវ", "kuy teav", "NOODLES", { portion: "One bowl" }),
    dish("fruit-shake", "Fruit shake", "ទឹកក្រឡុក", "teuk kralok", "DRINK", { labels: ["vegetarian"] }),
    dish("grilled-fish", "Grilled fish", "ត្រីអាំង", "trey ang", "GRILL", { serves: "2" }),
  ],
  OTHER: [
    dish("house-dish", "House dish", "", "", "MAIN", {}),
    dish("iced-coffee-other", "Iced Khmer coffee", "កាហ្វេទឹកកក", "kafe teuk kork", "COFFEE", { labels: ["contains-dairy"] }),
  ],
};

/** A template laid over a fresh dish's values. */
export function fromDishTemplate(fresh: FormValues, chosen: DishTemplate): FormValues {
  const values: FormValues = { ...fresh };
  for (const [name, value] of Object.entries(chosen.values)) {
    values[name] = typeof value === "number" ? String(value) : value;
  }
  return values;
}

/** A dish priced far above what the listing says a meal costs, as a question rather than an error. */
export function priceWarning(values: FormValues, averageMealPrice: unknown): string | null {
  const dishPrice = price(values);
  const average = typeof averageMealPrice === "string" && averageMealPrice.trim() ? Number(averageMealPrice) : null;
  if (dishPrice === null || average === null || !Number.isFinite(average) || average <= 0) return null;
  if (dishPrice > average * 3) {
    return `This dish costs more than three times what you said a meal here costs (${average}). Check the price.`;
  }
  return null;
}
