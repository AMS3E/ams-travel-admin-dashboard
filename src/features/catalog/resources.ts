import type { ImageCategory } from "@/features/catalog/image-category";
import type {
  EnumOption,
  ReferenceKey,
  ResourceDefinition,
  ResourceField,
  ResourceKey,
  ResourceStatus,
  StatusOption,
} from "@/features/catalog/resource";

/**
 * The catalogue, declared once.
 *
 * Field order here is the order an editor sees on the form, so it is arranged
 * the way the work is actually done: what a row *is* first, then its prose,
 * then its picture, then the relationships that place it in the catalogue.
 */

/* --- statuses ------------------------------------------------------------ */

const ACTIVE: StatusOption = {
  value: "ACTIVE",
  label: "Active",
  hint: "visible on the public site",
  tone: "success",
};
const RETIRED: StatusOption = {
  value: "INACTIVE",
  label: "Retired",
  hint: "hidden from the public site",
  tone: "neutral",
};

/** The taxonomy, corridors and badges: an `isActive` flag on the row. */
const ACTIVE_FLAG: ResourceStatus = {
  field: "isActive",
  options: [ACTIVE, RETIRED],
  initial: "ACTIVE",
  live: "ACTIVE",
  retired: "INACTIVE",
};

const PUBLICATION_OPTIONS: readonly StatusOption[] = [
  { value: "DRAFT", label: "Draft", hint: "not on the public site yet", tone: "neutral" },
  { value: "PUBLISHED", label: "Published", hint: "visible on the public site", tone: "success" },
  { value: "ARCHIVED", label: "Archived", hint: "taken off the public site", tone: "neutral" },
];

/** Stays and foods: the status travels in the request body. */
const PUBLICATION: ResourceStatus = {
  field: "status",
  options: PUBLICATION_OPTIONS,
  initial: "DRAFT",
  live: "PUBLISHED",
  retired: "ARCHIVED",
};

/** Destinations: created as drafts, moved only through publish and unpublish. */
const DESTINATION_PUBLICATION: ResourceStatus = { ...PUBLICATION, via: "publish" };

/** Tourism corridors: a draft until published, and back to a draft when unpublished. */
const CORRIDOR_PUBLICATION: ResourceStatus = {
  ...PUBLICATION,
  options: PUBLICATION_OPTIONS.filter((option) => option.value !== "ARCHIVED"),
  retired: "DRAFT",
  via: "publish",
};

/** How a corridor's stored road route stands against its stops. */
const CORRIDOR_ROUTE_STATUSES: readonly EnumOption[] = [
  { value: "NONE", label: "No stops yet" },
  { value: "MISSING", label: "Not calculated" },
  { value: "CURRENT", label: "Ready" },
  { value: "STALE", label: "Out of date" },
];

/**
 * A season on or off the tourist calendar. Its badge periods follow the flag,
 * and only a season on the calendar is kept from overlapping another.
 */
const SEASON_STATUS: ResourceStatus = {
  ...ACTIVE_FLAG,
  options: [
    { ...ACTIVE, hint: "on the calendar — every badge's period for it is live" },
    { ...RETIRED, hint: "off the calendar — its badge periods are retired too" },
  ],
};

/* --- enums --------------------------------------------------------------- */

const options = (values: readonly string[]): readonly EnumOption[] =>
  values.map((value) => ({
    value,
    label: value.charAt(0) + value.slice(1).toLowerCase().replaceAll("_", " "),
  }));

const MEDIA_TYPES = options(["IMAGE", "VIDEO"]);
const STAY_TYPES = options(["HOTEL", "GUESTHOUSE", "HOSTEL", "RESORT", "HOMESTAY", "VILLA", "OTHER"]);
/*
 * The kinds a place to eat can be, in the order the chooser reads them:
 * the two most people are looking for, then the two sold in the street, then
 * the catch-all. A sequence rather than a list of names, so the field is a
 * `scale` and keeps this order instead of sorting A to Z.
 *
 * A bar is a restaurant and a bakery a cafe (see FoodType), which the line
 * under each tile says — there are too few kinds left for that to be worth a
 * heading of its own.
 */
const FOOD_TYPES: readonly EnumOption[] = options(["RESTAURANT", "CAFE", "STREET_FOOD", "MARKET", "OTHER"]).map(
  (option) => (option.value === "CAFE" ? { ...option, label: "Cafe" } : option),
);
const BADGE_CRITERIA: readonly EnumOption[] = [
  { value: "BROWSES", label: "Destinations browsed" },
  { value: "REVIEWS", label: "Reviews written" },
  { value: "STAMPS", label: "Stamps collected" },
  { value: "DESTINATION_STAMPS", label: "Stamps at chosen destinations" },
];
/* Worked out by the API from the criteria; shown, never written. */
const BADGE_TRACKS = options(["BROWSER", "REVIEWER", "ADVENTURE"]);
const BADGE_TIERS = options(["SILVER", "GOLDEN", "PLATINUM"]);
const SEASON_KINDS: readonly EnumOption[] = [
  { value: "HIGH", label: "High season" },
  { value: "GREEN", label: "Green season" },
];
/* --- a stay's house rules, services and ways to pay ------------------------- */

const PETS_POLICIES: readonly EnumOption[] = [
  { value: "NOT_ALLOWED", label: "Pets not allowed" },
  { value: "ON_REQUEST", label: "Pets on request" },
  { value: "ALLOWED", label: "Pets welcome" },
];
const SMOKING_POLICIES: readonly EnumOption[] = [
  { value: "NO_SMOKING", label: "No smoking anywhere" },
  { value: "DESIGNATED_AREAS", label: "In designated areas only" },
  { value: "ALLOWED", label: "Smoking allowed" },
];
const BREAKFAST_OPTIONS: readonly EnumOption[] = [
  { value: "NONE", label: "No breakfast" },
  { value: "INCLUDED", label: "Included in the room price" },
  { value: "EXTRA_CHARGE", label: "Served, at extra cost" },
];
const PARKING_OPTIONS: readonly EnumOption[] = [
  { value: "NONE", label: "No parking" },
  { value: "FREE", label: "Free parking" },
  { value: "PAID", label: "Paid parking" },
];

/** The API's `StayVocabularies`, checked against the Java file by a test. */
export const BREAKFAST_TYPES: readonly EnumOption[] = [
  { value: "khmer", label: "Khmer" },
  { value: "asian", label: "Asian" },
  { value: "continental", label: "Continental" },
  { value: "american", label: "American" },
  { value: "buffet", label: "Buffet" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "halal", label: "Halal" },
];
export const PAYMENT_METHODS: readonly EnumOption[] = [
  { value: "cash", label: "Cash" },
  { value: "khqr", label: "KHQR (Bakong)" },
  { value: "aba-pay", label: "ABA Pay" },
  { value: "acleda", label: "ACLEDA" },
  { value: "wing", label: "Wing" },
  { value: "visa", label: "Visa" },
  { value: "mastercard", label: "Mastercard" },
  { value: "unionpay", label: "UnionPay" },
  { value: "jcb", label: "JCB" },
  { value: "amex", label: "American Express" },
  { value: "paypal", label: "PayPal" },
  { value: "bank-transfer", label: "Bank transfer" },
];
export const LANGUAGES: readonly EnumOption[] = [
  { value: "km", label: "Khmer" },
  { value: "en", label: "English" },
  { value: "zh", label: "Chinese" },
  { value: "fr", label: "French" },
  { value: "th", label: "Thai" },
  { value: "vi", label: "Vietnamese" },
  { value: "ko", label: "Korean" },
  { value: "ja", label: "Japanese" },
  { value: "de", label: "German" },
  { value: "ru", label: "Russian" },
  { value: "es", label: "Spanish" },
];

/** Everything a guest checks before booking, beyond the rooms. */
const stayRules: readonly ResourceField[] = [
  { name: "checkInUntil", label: "Latest check-in", kind: "time", section: "House rules", hint: "After this hour nobody can check in. Leave empty if someone is at the desk all night." },
  { name: "checkOutFrom", label: "Earliest check-out", kind: "time", section: "House rules", hint: "Only if guests cannot leave before a certain hour. Usually left empty." },
  { name: "minCheckInAge", label: "Youngest guest who can check in alone", kind: "number", min: 0, max: 99, section: "House rules", hint: "In years, e.g. 18. Leave empty if there is no such rule." },
  { name: "childrenAllowed", label: "Children welcome", kind: "boolean", initial: "true", section: "House rules" },
  { name: "petsPolicy", label: "Pets", kind: "enum", options: PETS_POLICIES, scale: true, section: "House rules" },
  { name: "smokingPolicy", label: "Smoking", kind: "enum", options: SMOKING_POLICIES, scale: true, section: "House rules" },
  { name: "partiesAllowed", label: "Guests may hold parties or events", kind: "boolean", section: "House rules" },
  {
    name: "quietHours",
    label: "Quiet hours",
    kind: "text",
    maxLength: 20,
    section: "House rules",
    hint: "The hours guests must keep the noise down, e.g. 22:00-07:00. Leave empty if there are none.",
    pattern: { source: "^([01]\\d|2[0-3]):[0-5]\\d-([01]\\d|2[0-3]):[0-5]\\d$", message: "Quiet hours look like 22:00-07:00." },
  },
];

const stayServices: readonly ResourceField[] = [
  { name: "breakfastOption", label: "Breakfast", kind: "enum", options: BREAKFAST_OPTIONS, scale: true, section: "Services" },
  {
    name: "breakfastTypes",
    label: "What breakfast is served",
    kind: "enums",
    options: BREAKFAST_TYPES,
    span: 2,
    section: "Services",
    visibleWhen: { field: "breakfastOption", values: ["INCLUDED", "EXTRA_CHARGE"] },
  },
  {
    name: "breakfastPrice",
    label: "Breakfast price, per person",
    kind: "decimal",
    min: 0,
    step: 0.01,
    section: "Services",
    visibleWhen: { field: "breakfastOption", values: ["EXTRA_CHARGE"] },
  },
  { name: "parkingOption", label: "Parking", kind: "enum", options: PARKING_OPTIONS, section: "Services" },
  {
    name: "parkingPrice",
    label: "Parking price, per day",
    kind: "decimal",
    min: 0,
    step: 0.01,
    section: "Services",
    visibleWhen: { field: "parkingOption", values: ["PAID"] },
  },
];

const stayPayments: readonly ResourceField[] = [
  { name: "paymentMethods", label: "Ways to pay", kind: "enums", options: PAYMENT_METHODS, span: 2, section: "Payments", hint: "Travellers from abroad look for cards; most guests here pay with KHQR or cash." },
  { name: "languagesSpoken", label: "Languages the staff speak", kind: "enums", options: LANGUAGES, span: 2, section: "Payments", hint: "So a guest knows they can be helped in their own language." },
];

const stayTrust: readonly ResourceField[] = [
  { name: "telegram", label: "Telegram", kind: "text", maxLength: 100, section: "Contact", hint: "A handle such as @riversidehotel, or a t.me link." },
  { name: "whatsapp", label: "WhatsApp", kind: "text", maxLength: 50, section: "Contact", hint: "The number WhatsApp answers on, with the country code." },
  { name: "facebookUrl", label: "Facebook page", kind: "text", maxLength: 512, section: "Contact" },
];

/* --- food ---------------------------------------------------------------- */

/** What the kitchen cooks — the API's `FoodVocabularies.CUISINES`. */
export const FOOD_CUISINES: readonly EnumOption[] = [
  { value: "khmer", label: "Khmer" },
  { value: "street-food", label: "Street food" },
  { value: "seafood", label: "Seafood" },
  { value: "bbq-grill", label: "BBQ & grill" },
  { value: "noodles", label: "Noodles" },
  { value: "rice-dishes", label: "Rice dishes" },
  { value: "soup", label: "Soup" },
  { value: "chinese", label: "Chinese" },
  { value: "vietnamese", label: "Vietnamese" },
  { value: "thai", label: "Thai" },
  { value: "indian", label: "Indian" },
  { value: "japanese", label: "Japanese" },
  { value: "korean", label: "Korean" },
  { value: "malay-indonesian", label: "Malay & Indonesian" },
  { value: "western", label: "Western" },
  { value: "french", label: "French" },
  { value: "italian", label: "Italian" },
  { value: "mexican", label: "Mexican" },
  { value: "middle-eastern", label: "Middle Eastern" },
  { value: "fusion", label: "Fusion" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "bakery-pastry", label: "Bakery & pastry" },
  { value: "desserts", label: "Desserts" },
  { value: "coffee", label: "Coffee" },
  { value: "juice-smoothies", label: "Juice & smoothies" },
  { value: "cocktails", label: "Cocktails" },
];

/** Which meals of the day it serves — the API's `MEALS`. */
export const FOOD_MEALS: readonly EnumOption[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "brunch", label: "Brunch" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "late-night", label: "Late night" },
  { value: "snacks", label: "Snacks" },
  { value: "coffee-break", label: "Coffee break" },
];

/** What the kitchen can do for a diet — the API's `DIETARY`. */
export const FOOD_DIETARY: readonly EnumOption[] = [
  { value: "vegetarian-options", label: "Vegetarian dishes" },
  { value: "vegan-options", label: "Vegan dishes" },
  { value: "halal", label: "Halal" },
  { value: "no-pork", label: "No pork" },
  { value: "gluten-free", label: "Gluten-free dishes" },
  { value: "nut-free-on-request", label: "Nut-free on request" },
  { value: "less-spicy-on-request", label: "Less spicy on request" },
  { value: "msg-free-on-request", label: "No MSG on request" },
];

/** How a meal is had — the API's `SERVICE_OPTIONS`. */
export const FOOD_SERVICE_OPTIONS: readonly EnumOption[] = [
  { value: "dine-in", label: "Dine in" },
  { value: "takeaway", label: "Takeaway" },
  { value: "delivery", label: "Delivery" },
  { value: "table-service", label: "Table service" },
  { value: "counter-order", label: "Order at the counter" },
  { value: "self-service", label: "Self service" },
  { value: "buffet", label: "Buffet" },
  { value: "catering", label: "Catering" },
  { value: "private-dining", label: "Private dining" },
];

/** Who it suits — the API's `GOOD_FOR`. */
export const FOOD_GOOD_FOR: readonly EnumOption[] = [
  { value: "families", label: "Families" },
  { value: "groups", label: "Groups" },
  { value: "couples", label: "Couples" },
  { value: "solo", label: "Eating alone" },
  { value: "business", label: "Business" },
  { value: "quick-bite", label: "A quick bite" },
  { value: "long-lunch", label: "A long lunch" },
  { value: "sunset", label: "Sunset" },
  { value: "late-night", label: "Late night" },
  { value: "vegetarians", label: "Vegetarians" },
  { value: "special-occasion", label: "A special occasion" },
  { value: "trying-khmer-food", label: "Trying Khmer food" },
];

/** Who brings it — the API's `DELIVERY_PARTNERS`. */
export const FOOD_DELIVERY_PARTNERS: readonly EnumOption[] = [
  { value: "foodpanda", label: "foodpanda" },
  { value: "nham24", label: "Nham24" },
  { value: "grab", label: "Grab" },
  { value: "muuve", label: "Muuve" },
  { value: "own-delivery", label: "Their own delivery" },
];

/**
 * What a place to eat has — the API's `FoodAmenities`, labelled `Group · Name`
 * as a stay's are, and checked against the Java file by a test.
 */
const FOOD_AMENITY_GROUPS: readonly (readonly [string, readonly (readonly [string, string])[]])[] = [
  ["Seating", [["air-conditioned", "Air conditioning"], ["outdoor-seating", "Outdoor seating"], ["rooftop", "Rooftop"],
    ["riverside", "Riverside"], ["garden", "Garden"], ["street-side", "Street-side tables"],
    ["floor-seating", "Floor seating"], ["private-room", "Private room"]]],
  ["While you eat", [["wifi", "Wi-Fi"], ["toilets", "Toilets"], ["power-sockets", "Power sockets"],
    ["live-music", "Live music"], ["tv-sport", "TV for sport"], ["non-smoking", "Non-smoking"],
    ["smoking-area", "Smoking area"], ["pet-friendly", "Pets welcome"]]],
  ["Family", [["high-chairs", "High chairs"], ["kids-menu", "Children's menu"], ["play-area", "Play area"],
    ["baby-changing", "Baby changing"]]],
  ["Access", [["step-free", "Step-free entrance"], ["accessible-toilet", "Accessible toilet"], ["ground-floor", "Ground floor"]]],
  ["Getting there", [["car-parking", "Car parking"], ["motorbike-parking", "Motorbike parking"], ["tuk-tuk-stand", "Tuk-tuk stand"]]],
  ["Good to know", [["picture-menu", "Menu with photos"], ["halal-kitchen", "Halal kitchen"],
    ["free-drinking-water", "Free drinking water"], ["takeaway-boxes", "Takeaway boxes"], ["open-kitchen", "Open kitchen"]]],
];

export const FOOD_AMENITIES: readonly EnumOption[] = FOOD_AMENITY_GROUPS.flatMap(([group, entries]) =>
  entries.map(([value, label]) => ({ value, label: `${group} · ${label}` })),
);

/**
 * What each kind of place is asked about. A cafe is offered coffee and pastries
 * rather than curries, and a street stall is not asked about private dining:
 * the lists below narrow what the form offers once the type is chosen, and a
 * kind that names nothing here is offered everything.
 *
 * Only the form narrows. The API keeps one vocabulary, so a listing that
 * changes type keeps what it had and can take it away.
 */
export const CUISINES_BY_KIND: Readonly<Record<string, readonly string[]>> = {
  RESTAURANT: ["khmer", "seafood", "bbq-grill", "noodles", "rice-dishes", "soup", "chinese", "vietnamese", "thai", "indian", "japanese", "korean", "malay-indonesian", "western", "french", "italian", "mexican", "middle-eastern", "fusion", "vegetarian", "desserts", "cocktails", "coffee"],
  CAFE: ["coffee", "juice-smoothies", "desserts", "bakery-pastry", "western", "vegetarian", "fusion", "khmer", "french"],
  STREET_FOOD: ["khmer", "street-food", "noodles", "rice-dishes", "bbq-grill", "seafood", "soup", "desserts",
    "juice-smoothies", "vegetarian"],
  MARKET: ["khmer", "street-food", "noodles", "rice-dishes", "seafood", "soup", "desserts", "juice-smoothies",
    "vegetarian"],
};

export const MEALS_BY_KIND: Readonly<Record<string, readonly string[]>> = {
  RESTAURANT: ["breakfast", "brunch", "lunch", "dinner", "late-night", "snacks"],
  CAFE: ["breakfast", "brunch", "lunch", "snacks", "coffee-break"],
  STREET_FOOD: ["breakfast", "lunch", "dinner", "late-night", "snacks"],
  MARKET: ["breakfast", "lunch", "snacks"],
};

export const SERVICE_BY_KIND: Readonly<Record<string, readonly string[]>> = {
  RESTAURANT: ["dine-in", "table-service", "takeaway", "delivery", "buffet", "catering", "private-dining", "counter-order"],
  CAFE: ["dine-in", "counter-order", "takeaway", "delivery", "self-service", "catering"],
  STREET_FOOD: ["takeaway", "counter-order", "dine-in", "delivery"],
  MARKET: ["counter-order", "takeaway", "dine-in", "self-service"],
};

export const GOOD_FOR_BY_KIND: Readonly<Record<string, readonly string[]>> = {
  RESTAURANT: ["families", "groups", "couples", "business", "long-lunch", "special-occasion", "sunset", "trying-khmer-food", "vegetarians", "late-night", "solo"],
  CAFE: ["solo", "couples", "business", "quick-bite", "groups", "vegetarians", "families"],
  STREET_FOOD: ["quick-bite", "solo", "late-night", "trying-khmer-food", "groups", "families"],
  MARKET: ["quick-bite", "families", "trying-khmer-food", "solo"],
};

export const FACILITIES_BY_KIND: Readonly<Record<string, readonly string[]>> = {
  RESTAURANT: ["air-conditioned", "outdoor-seating", "rooftop", "riverside", "garden", "street-side", "floor-seating", "private-room", "wifi", "toilets", "live-music", "tv-sport", "non-smoking", "smoking-area", "pet-friendly", "high-chairs", "kids-menu", "play-area", "baby-changing", "step-free", "accessible-toilet", "ground-floor", "car-parking", "motorbike-parking", "tuk-tuk-stand", "picture-menu", "halal-kitchen", "free-drinking-water", "takeaway-boxes", "open-kitchen"],
  CAFE: ["air-conditioned", "outdoor-seating", "rooftop", "riverside", "garden", "street-side", "wifi", "toilets", "power-sockets", "live-music", "non-smoking", "smoking-area", "pet-friendly", "high-chairs", "step-free", "ground-floor", "car-parking", "motorbike-parking", "picture-menu", "free-drinking-water", "takeaway-boxes", "open-kitchen", "halal-kitchen"],
  STREET_FOOD: ["outdoor-seating", "street-side", "floor-seating", "toilets", "motorbike-parking", "tuk-tuk-stand",
    "picture-menu", "halal-kitchen", "free-drinking-water", "takeaway-boxes", "open-kitchen"],
  MARKET: ["outdoor-seating", "street-side", "floor-seating", "toilets", "car-parking", "motorbike-parking",
    "tuk-tuk-stand", "step-free", "ground-floor", "picture-menu", "halal-kitchen", "free-drinking-water",
    "takeaway-boxes", "open-kitchen"],
};

export const DIETARY_BY_KIND: Readonly<Record<string, readonly string[]>> = {
  CAFE: ["vegetarian-options", "vegan-options", "halal", "no-pork", "gluten-free", "nut-free-on-request"],
};

/**
 * What one person spends, said the way each kind of place is bought from:
 * nobody buys a meal in a cafe or a plate in a bar. Read through
 * FOOD_FIELD_LABELS, with everything else each kind is called.
 */
export const AVERAGE_PRICE_LABEL: Readonly<Record<string, string>> = {
  RESTAURANT: "A meal usually costs",
  CAFE: "A coffee and a cake usually cost",
  STREET_FOOD: "A plate usually costs",
  MARKET: "A plate usually costs",
  OTHER: "A visit usually costs",
};

/*
 * "Where it appears", per kind of place: the categories, tags and kinds of trip
 * a place to eat is filed under — by slug, since they are rows. A cafe is not
 * offered Temples or Helicopter; "Other" is offered everything food-related,
 * and still none of the sightseeing words a destination uses.
 */
const foodRows = (table: Readonly<Record<string, readonly string[]>>): Readonly<Record<string, readonly string[]>> => ({
  ...table,
  OTHER: [...new Set(Object.values(table).flat())],
});

export const CATEGORIES_BY_KIND = foodRows({
  RESTAURANT: ["traditional-food", "seafood", "fine-dining", "michelin", "cooking-class", "sunset", "sky-bar"],
  CAFE: ["coffee", "sunset", "art-gallery", "traditional-food"],
  STREET_FOOD: ["street-food", "night-market", "traditional-food", "seafood"],
  MARKET: ["night-market", "street-food", "traditional-food", "seafood", "shopping"],
});

export const TAGS_BY_KIND = foodRows({
  RESTAURANT: ["food", "local-food", "fish-amok", "khmer-curry", "num-banh-chok", "pepper-rice-wine", "luxury", "five-stars", "private", "exclusive", "sunset", "music", "nightlife"],
  CAFE: ["cafe", "local-food", "palm-sugar", "sunset", "music"],
  STREET_FOOD: ["food", "local-food", "num-banh-chok", "fish-amok", "khmer-curry", "nightlife"],
  MARKET: ["food", "local-food", "palm-sugar", "pepper-rice-wine", "shopping", "num-banh-chok"],
});

export const FOOD_INTERESTS_BY_KIND = foodRows({
  RESTAURANT: ["restaurants", "traditional-food", "drinks", "skybar"],
  CAFE: ["drinks", "traditional-food"],
  STREET_FOOD: ["streetfood", "traditional-food", "markets"],
  MARKET: ["markets", "streetfood", "traditional-food"],
});

/**
 * The examples under the first fields, per kind: what a cafe's name and its
 * one line might be, and where a stall's address is. A kind named nowhere
 * keeps the field's own hint.
 */
export const FOOD_FIELD_HINTS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  name: {
    RESTAURANT: "For example: Riverside Khmer Kitchen, or Lotus Rooftop Bar.",
    CAFE: "For example: Mekong Morning Coffee, or Sunrise Bakery.",
    STREET_FOOD: "What people call it, for example: Auntie Srey's noodle cart.",
    MARKET: "For example: Phsar Chas Night Market.",
  },
  description: {
    RESTAURANT: "The story: who cooks, since when, and the first three dishes to order.",
    CAFE: "The story: where the beans come from, what comes out of the oven, what people order, and the best seat.",
    STREET_FOOD: "The story: who cooks, how long the stall has been there, and what to order.",
    MARKET: "What it is like: the stalls worth finding, and the best time to come.",
  },
  address: {
    RESTAURANT: "Street, number and area, e.g. No. 12, Sisowath Quay, Phnom Penh.",
    CAFE: "Street, number and area, e.g. No. 8, Street 240, Phnom Penh.",
    STREET_FOOD: "Where it stands, e.g. corner of Street 13 and 178, opposite the pagoda.",
    MARKET: "The street or landmark, e.g. Street 108, by the riverside.",
  },
  cuisines: {
    RESTAURANT: "What the kitchen is known for. Two or three beat a list of ten — a traveller searches by these.",
    CAFE: "Beyond the coffee: what else people come in for.",
    STREET_FOOD: "The one or two things the stall is known for.",
    MARKET: "What the food stalls cook between them.",
  },
  dietary: {
    RESTAURANT: "Only what the kitchen can promise on any day, not what it could do if asked nicely.",
    CAFE: "Only what the board can promise on any day — oat milk counts as vegan only if it is always there.",
    STREET_FOOD: "Only what the cook can promise on any day.",
    MARKET: "Only what several stalls can promise on any day.",
  },
  menuLanguages: {
    RESTAURANT: "So a traveller knows whether they can read the menu before they sit down.",
    CAFE: "So a traveller knows whether they can read the board before they queue.",
    STREET_FOOD: "So a traveller knows whether they can read the sign, or should point.",
    MARKET: "So a traveller knows whether they can read the stalls' signs, or should point.",
  },
  priceRange: {
    RESTAURANT: "$ is a Khmer canteen, $$$$ is fine dining.",
    CAFE: "$ is a roadside iced coffee, $$$$ a specialty roaster.",
    STREET_FOOD: "Most stalls are $.",
    MARKET: "Most markets are $; a food hall may be $$.",
  },
  averageMealPrice: {
    RESTAURANT: "What one person spends on an ordinary meal — the figure a traveller budgets by.",
    CAFE: "What one person spends sitting down with a coffee and something to eat.",
    STREET_FOOD: "What one person pays for a plate at the stall.",
    MARKET: "What one person pays for a plate at one of the food stalls.",
  },
  priceFrom: {
    RESTAURANT: "The lowest a diner pays for one dish. Once the menu has prices, this follows the cheapest dish by itself.",
    CAFE: "The lowest price on the board. Once the menu has prices, this follows the cheapest item by itself.",
    STREET_FOOD: "The lowest a plate costs. Once the menu has prices, this follows the cheapest dish by itself.",
    MARKET: "The lowest a plate costs at the stalls. Once the menu has prices, this follows the cheapest dish by itself.",
  },
  openingHours: {
    RESTAURANT: "For example 11:00-22:00. Leave a day empty when the restaurant is closed.",
    CAFE: "For example 06:30-18:00. Leave a day empty when the cafe is closed.",
    STREET_FOOD: "When the stall is out, for example 05:30-10:00. Leave a day empty when it does not come out.",
    MARKET: "For example 17:00-23:00 for a night market. Leave a day empty when the market does not open.",
  },
  phone: {
    RESTAURANT: "The number that takes table bookings.",
    CAFE: "The number that takes orders.",
    STREET_FOOD: "The cook's number, if they take orders by phone.",
    MARKET: "The market office, if it has one.",
  },
  facebookUrl: {
    RESTAURANT: "Where the restaurant posts today's dishes.",
    CAFE: "Where the cafe posts today's cakes and events.",
    STREET_FOOD: "Where the stall says whether it is out today.",
    MARKET: "Where the market posts its events.",
  },
  categoryIds: {
    RESTAURANT: "Only the categories a restaurant is filed under are offered. What the kitchen cooks comes in the next step.",
    CAFE: "Only the categories a cafe is filed under are offered. Its coffee and drinks comes in the next step.",
    STREET_FOOD: "Only the categories a stall is filed under are offered. What it cooks comes in the next step.",
    MARKET: "Only the categories a market is filed under are offered. What its stalls cook comes in the next step.",
  },
  tagIds: {
    RESTAURANT: "Only the words travellers search by for a restaurant.",
    CAFE: "Only the words travellers search by for a cafe.",
    STREET_FOOD: "Only the words travellers search by for a stall.",
    MARKET: "Only the words travellers search by for a market.",
  },
  interestIds: {
    RESTAURANT: "A traveller browsing one of these meets the restaurant on its page. Tick every one that fits.",
    CAFE: "A traveller browsing one of these meets the cafe on its page. Tick every one that fits.",
    STREET_FOOD: "A traveller browsing one of these meets the stall on its page. Tick every one that fits.",
    MARKET: "A traveller browsing one of these meets the market on its page. Tick every one that fits.",
  },
  isLocalSpecialty: {
    RESTAURANT: "Crab with Kampot pepper in Kep, fish amok by the river — the website marks the restaurant with it.",
    CAFE: "Mondulkiri coffee, palm-sugar drinks — the website marks the cafe with it.",
    STREET_FOOD: "Num banh chok, Battambang rice noodles — the website marks the stall with it.",
    MARKET: "The crab market's crab, the pepper market's pepper — the website marks the market with it.",
  },
};

/**
 * What each field is called for each kind of place, so a restaurant's form
 * reads as a restaurant's and a bar's as a bar's. A kind left out keeps the
 * field's own label — "Other" mostly does. Applied by `forKind` below.
 */
export const FOOD_FIELD_LABELS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  name: {
    RESTAURANT: "Restaurant name", CAFE: "Cafe name", STREET_FOOD: "Stall name", MARKET: "Market name",
  },
  description: {
    RESTAURANT: "The restaurant's story", CAFE: "The cafe's story", STREET_FOOD: "The stall's story",
    MARKET: "What the market is like",
  },
  address: {
    RESTAURANT: "Restaurant address", CAFE: "Cafe address", STREET_FOOD: "Where the stall stands", MARKET: "Market address",
  },
  cuisines: {
    RESTAURANT: "Cuisines the kitchen cooks", CAFE: "What it is known for", STREET_FOOD: "What kind of food",
    MARKET: "What the stalls cook",
  },
  mealsServed: {
    RESTAURANT: "Meals the kitchen serves", CAFE: "People come for", STREET_FOOD: "When it sells",
    MARKET: "When the food stalls sell",
  },
  dietary: {
    RESTAURANT: "Diets the kitchen can cook for", CAFE: "Diets the board suits", STREET_FOOD: "Diets the stall can cook for",
    MARKET: "Diets the stalls can cook for",
  },
  alcohol: {
    RESTAURANT: "Alcohol with the meal", CAFE: "Alcohol at the cafe", STREET_FOOD: "Beer at the stall",
    MARKET: "Alcohol at the market",
  },
  menuLanguages: {
    RESTAURANT: "The menu is written in", CAFE: "The board is written in", STREET_FOOD: "The stall's sign is written in",
    MARKET: "Stall signs are written in",
  },
  amenities: {
    RESTAURANT: "What the restaurant has", CAFE: "What the cafe has", STREET_FOOD: "What the stall has",
    MARKET: "What the market has",
  },
  serviceOptions: {
    RESTAURANT: "Ways to eat here", CAFE: "Ways to order", STREET_FOOD: "Ways to eat from the stall",
    MARKET: "Ways to eat at the market",
  },
  goodFor: {
    RESTAURANT: "Who the restaurant suits", CAFE: "Who the cafe suits", STREET_FOOD: "Who the stall suits",
    MARKET: "Who the market suits",
  },
  parkingOption: {
    RESTAURANT: "Parking for diners", CAFE: "Parking for customers", STREET_FOOD: "Parking near the stall",
    MARKET: "Parking at the market",
  },
  reservations: { RESTAURANT: "Do diners need to book a table?" },
  deliveryPartners: {
    RESTAURANT: "Apps that deliver from the restaurant", CAFE: "Apps that deliver from the cafe",
    STREET_FOOD: "Apps that deliver from the stall", MARKET: "Apps that deliver from the stalls",
  },
  priceRange: {
    RESTAURANT: "How expensive the restaurant feels", CAFE: "How expensive the cafe feels",
    STREET_FOOD: "How expensive the stall feels", MARKET: "How expensive the market feels",
  },
  averageMealPrice: AVERAGE_PRICE_LABEL,
  priceFrom: {
    RESTAURANT: "Cheapest dish or drink", CAFE: "Cheapest drink or bake", STREET_FOOD: "Cheapest plate", MARKET: "Cheapest plate",
  },
  paymentMethods: {
    RESTAURANT: "Ways to pay the bill", CAFE: "Ways to pay at the counter", STREET_FOOD: "Ways to pay at the stall",
    MARKET: "Ways to pay the stalls",
  },
  languagesSpoken: {
    RESTAURANT: "Languages the waiters speak", CAFE: "Languages the baristas speak", STREET_FOOD: "Languages the cook speaks",
    MARKET: "Languages the stall holders speak",
  },
  openingHours: { STREET_FOOD: "Selling hours", MARKET: "Market days and hours" },
  phone: {
    RESTAURANT: "Phone for bookings", CAFE: "Phone for orders", STREET_FOOD: "Phone for orders", MARKET: "Market office phone",
  },
  isLocalSpecialty: {
    RESTAURANT: "Cooks a dish this area is known for", CAFE: "Serves a drink this area is known for",
    STREET_FOOD: "Sells a dish this area is known for", MARKET: "Sells what this area is known for",
  },
};

type KindWords = Readonly<Record<string, Readonly<Record<string, string>>>>;

/** A field in its kind's own words — the label and the examples — from a listing's two tables. */
const inKindWords = (labels: KindWords, hints: KindWords, kindField = "type") => (field: ResourceField): ResourceField => ({
  ...field,
  ...(labels[field.name] ? { labelFor: { field: kindField, labels: labels[field.name] } } : {}),
  ...(hints[field.name] ? { hintFor: { field: kindField, hints: hints[field.name] } } : {}),
});

/*
 * --- an attraction's theme ---------------------------------------------------
 *
 * The code of the tourism region an attraction is listed on. Chosen as the
 * region in Where it appears, never as a theme: the form writes the code for
 * the API and the website's page (see `themeOf`).
 */
export const DESTINATION_THEMES: readonly EnumOption[] = [
  { value: "ANCIENT-CAPITALS", label: "Ancient Capitals & Khmer Civilization" },
  { value: "NORTHEASTERN", label: "Northeastern Civilization" },
  { value: "MEKONG-TONLE-SAP", label: "Mekong & Tonle Sap Civilization" },
  { value: "MOUNTAIN-WATERFALL", label: "Mountain & Waterfall Region" },
  { value: "COASTAL-ISLAND", label: "Coastal & Island Region" },
  { value: "URBAN-LIFESTYLE", label: "Urban Lifestyle & Nightlife" },
  { value: "KHMER-CULINARY", label: "Khmer Culinary Region" },
  { value: "ECO-COMMUNITY", label: "Eco-Community Tourism" },
  { value: "LUXURY-TOURISM", label: "Luxury Tourism" },
];

/**
 * What only one kind of place has — the API's `FoodSpecialties`, in its order,
 * checked against the Java file by a test. Labelled `Group · Name` like the
 * facilities, so the grouped picker shows each kind's headings.
 */
const FOOD_SPECIALTY_GROUPS: readonly (readonly [string, readonly (readonly [string, readonly (readonly [string, string])[]])[]])[] = [
  ["CAFE", [
    ["Coffee", [["khmer-iced-coffee", "Khmer iced coffee"], ["espresso", "Espresso"], ["cappuccino-latte", "Cappuccino & latte"],
      ["pour-over", "Pour-over & drip"], ["cold-brew", "Cold brew"]]],
    ["Other drinks", [["tea", "Tea"], ["matcha", "Matcha"], ["smoothies", "Smoothies"], ["fresh-juice", "Fresh juice"],
      ["fresh-coconut", "Fresh coconut"]]],
    ["Beans", [["mondulkiri-beans", "Mondulkiri beans"], ["ratanakiri-beans", "Ratanakiri beans"],
      ["imported-beans", "Imported beans"], ["roasted-in-house", "Roasted in-house"]]],
    ["Milk", [["condensed-milk", "Condensed milk"], ["fresh-milk", "Fresh milk"], ["oat-milk", "Oat milk"],
      ["soy-milk", "Soy milk"], ["almond-milk", "Almond milk"]]],
    /* A bakery is a cafe that bakes, so its three groups end the cafe's list. */
    ["Baked here", [["bread", "Bread"], ["baguettes", "Baguettes"], ["pastries", "Pastries"], ["cakes", "Cakes"],
      ["khmer-sweets", "Khmer sweets"], ["cookies", "Cookies"], ["savoury-pies", "Savoury pies"]]],
    ["Orders", [["cakes-to-order", "Cakes made to order"], ["whole-cakes", "Whole cakes to take away"], ["party-trays", "Party trays"]]],
    ["Freshness", [["baked-every-morning", "Baked every morning"], ["baked-twice-a-day", "Baked twice a day"]]],
  ]],
  ["STREET_FOOD", [
    ["Cooked on", [["charcoal-grill", "Charcoal grill"], ["wok", "Wok"], ["steamer", "Steamer"], ["broth-pot", "Pot of broth"],
      ["griddle", "Griddle"], ["deep-fryer", "Deep fryer"]]],
    ["Sold from", [["cart", "A cart"], ["stall", "A stall"], ["motorbike-cart", "A motorbike cart"], ["night-market-pitch", "A night-market pitch"]]],
    ["Selling times", [["mornings-only", "Mornings only"], ["evenings-only", "Evenings only"], ["all-day", "All day"]]],
  ]],
  ["MARKET", [
    ["Kind of market", [["day-market", "Day market"], ["night-market", "Night market"], ["wet-market", "Wet market"],
      ["food-hall", "Food hall"], ["floating-market", "Floating market"]]],
    ["Also sells", [["fresh-produce", "Fresh produce"], ["souvenirs", "Souvenirs"], ["clothes", "Clothes"], ["crafts", "Crafts"],
      ["spices", "Spices"]]],
    ["Size", [["under-20-stalls", "Under 20 food stalls"], ["20-to-50-stalls", "20 to 50 food stalls"], ["over-50-stalls", "Over 50 food stalls"]]],
  ]],
  ["RESTAURANT", [
    ["How it is served", [["family-style", "Family style — dishes to share"], ["a-la-carte", "À la carte"], ["set-menu", "Set menu"],
      ["tasting-menu", "Tasting menu"], ["cook-at-table", "Cook at the table — hot pot or tabletop grill"]]],
    ["Cooking", [["wood-fired", "Wood-fired"], ["chefs-table", "Chef's table"], ["khmer-home-cooking", "Khmer home cooking"],
      ["royal-khmer-recipes", "Royal Khmer recipes"], ["live-seafood", "Choose your fish or seafood from the tank"],
      ["own-garden", "Grows its own herbs and vegetables"]]],
    ["Groups & events", [["banquets", "Weddings and banquets"], ["group-set-menus", "Set menus for groups"],
      ["birthday-parties", "Birthday parties"], ["cooking-classes", "Cooking classes"]]],
    /* A bar is a restaurant that pours, so its groups end the restaurant's list. */
    ["Drinks", [["draught-beer", "Draught beer"], ["craft-beer", "Craft beer"], ["signature-cocktails", "Signature cocktails"],
      ["wine", "Wine"], ["spirits", "Spirits"], ["khmer-rice-wine", "Khmer rice wine"], ["mocktails", "Mocktails"]]],
    ["Nights", [["happy-hour", "Happy hour"], ["live-band", "Live band"], ["dj-nights", "DJ nights"],
      ["sports-screenings", "Sports on screen"], ["quiz-night", "Quiz night"]]],
    ["Dress code", [["dress-casual", "Casual"], ["dress-smart-casual", "Smart casual"], ["dress-formal", "Formal"],
      ["over-18-only", "18 and over only"], ["smart-dress", "A dress code is kept at the door"]]],
  ]],
];

export const FOOD_SPECIALTIES: readonly EnumOption[] = FOOD_SPECIALTY_GROUPS.flatMap(([, groups]) =>
  groups.flatMap(([group, entries]) => entries.map(([value, label]) => ({ value, label: `${group} · ${label}` }))),
);

/** Each kind's own slugs; "Other" has none of its own. */
export const SPECIALTIES_BY_KIND: Readonly<Record<string, readonly string[]>> = Object.fromEntries(
  FOOD_SPECIALTY_GROUPS.map(([kind, groups]) => [kind, groups.flatMap(([, entries]) => entries.map(([value]) => value))]),
);

/** What the field is called for each kind: it holds what only that kind has. */
export const SPECIALTY_LABEL: Readonly<Record<string, string>> = {
  CAFE: "Your coffee, drinks, beans, milk and what you bake",
  STREET_FOOD: "How and where you cook",
  MARKET: "What kind of market it is",
  RESTAURANT: "How you serve, cook, host and pour",
};

/** A kitchen with no bar serves beer at most; a bar pours everything. */
export const ALCOHOL_BY_KIND: Readonly<Record<string, readonly string[]>> = {
  CAFE: ["NONE", "BEER_WINE", "BRING_YOUR_OWN"],
  STREET_FOOD: ["NONE", "BEER_WINE", "BRING_YOUR_OWN"],
  MARKET: ["NONE", "BEER_WINE"],
};

/** The headings a menu of each kind is printed under. */
export const COURSES_BY_KIND: Readonly<Record<string, readonly string[]>> = {
  CAFE: ["COFFEE", "DRINK", "SNACK", "DESSERT", "SALAD", "SET_MENU"],
  STREET_FOOD: ["NOODLES", "RICE", "GRILL", "SOUP", "SNACK", "DESSERT", "DRINK"],
  MARKET: ["NOODLES", "RICE", "SOUP", "SEAFOOD", "GRILL", "SNACK", "DESSERT", "DRINK"],
};

/** Whether a drink comes with the meal — the API's `AlcoholOption`. */
export const ALCOHOL_OPTIONS: readonly EnumOption[] = [
  { value: "NONE", label: "No alcohol" },
  { value: "BEER_WINE", label: "Beer and wine" },
  { value: "FULL_BAR", label: "Full bar" },
  { value: "BRING_YOUR_OWN", label: "Bring your own" },
];

/** Where a diner leaves the motorbike — the API's `FoodParking`. */
export const FOOD_PARKING: readonly EnumOption[] = [
  { value: "FREE", label: "Free parking" },
  { value: "PAID", label: "Paid parking" },
  { value: "STREET", label: "On the street" },
  { value: "NONE", label: "No parking" },
];

/** Whether a table has to be booked — the API's `ReservationPolicy`. */
export const RESERVATION_POLICIES: readonly EnumOption[] = [
  { value: "NOT_NEEDED", label: "Walk in" },
  { value: "RECOMMENDED", label: "Booking recommended" },
  { value: "REQUIRED", label: "Booking required" },
];

/* --- the menu ------------------------------------------------------------ */

/** Where a dish sits on the menu — the API's `MenuCourse`. */
export const MENU_COURSES: readonly EnumOption[] = [
  { value: "STARTER", label: "Starter" },
  { value: "SOUP", label: "Soup" },
  { value: "SALAD", label: "Salad" },
  { value: "NOODLES", label: "Noodles" },
  { value: "RICE", label: "Rice" },
  { value: "CURRY", label: "Curry" },
  { value: "GRILL", label: "Grill" },
  { value: "SEAFOOD", label: "Seafood" },
  { value: "MAIN", label: "Main" },
  { value: "SIDE", label: "Side" },
  { value: "SNACK", label: "Snack" },
  { value: "DESSERT", label: "Dessert" },
  { value: "DRINK", label: "Drink" },
  { value: "COFFEE", label: "Coffee" },
  { value: "SET_MENU", label: "Set menu" },
];

/** What is in a dish — the API's `DISH_LABELS`. */
export const DISH_LABELS: readonly EnumOption[] = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "halal", label: "Halal" },
  { value: "gluten-free", label: "Gluten-free" },
  { value: "raw", label: "Served raw" },
  { value: "contains-pork", label: "Contains pork" },
  { value: "contains-nuts", label: "Contains nuts" },
  { value: "contains-shellfish", label: "Contains shellfish" },
  { value: "contains-dairy", label: "Contains dairy" },
];

/** A dish on the menu or off it; the API's `isAvailable`. */
const DISH_AVAILABILITY: ResourceStatus = {
  field: "isActive",
  options: [
    { value: "ACTIVE", label: "On the menu", hint: "travellers can see it", tone: "success" },
    { value: "INACTIVE", label: "Off the menu", hint: "kept here, hidden from travellers", tone: "neutral" },
  ],
  initial: "ACTIVE",
  live: "ACTIVE",
  retired: "INACTIVE",
};

/* --- rooms --------------------------------------------------------------- */

/** A room's kind, the way travellers search for one — the API's `RoomType`. */
export const ROOM_TYPES: readonly EnumOption[] = [
  { value: "SINGLE", label: "Single" },
  { value: "DOUBLE", label: "Double" },
  { value: "TWIN", label: "Twin" },
  { value: "TWIN_DOUBLE", label: "Double or twin" },
  { value: "TRIPLE", label: "Triple" },
  { value: "QUADRUPLE", label: "Quadruple" },
  { value: "FAMILY", label: "Family" },
  { value: "SUITE", label: "Suite" },
  { value: "STUDIO", label: "Studio" },
  { value: "APARTMENT", label: "Apartment" },
  { value: "BUNGALOW", label: "Bungalow" },
  { value: "VILLA", label: "Villa" },
  { value: "DORM_BED", label: "Bed in a dorm" },
  { value: "DORM_ROOM", label: "Whole dorm room" },
];

/** What a room looks out on — the API's `RoomView`. */
export const ROOM_VIEWS: readonly EnumOption[] = [
  { value: "CITY", label: "City view" },
  { value: "STREET", label: "Street view" },
  { value: "GARDEN", label: "Garden view" },
  { value: "COURTYARD", label: "Courtyard view" },
  { value: "POOL", label: "Pool view" },
  { value: "RIVER", label: "River view" },
  { value: "LAKE", label: "Lake view" },
  { value: "SEA", label: "Sea view" },
  { value: "MOUNTAIN", label: "Mountain view" },
  { value: "RICE_FIELD", label: "Rice-field view" },
  { value: "TEMPLE", label: "Temple view" },
];

export const ROOM_BATHROOMS: readonly EnumOption[] = [
  { value: "PRIVATE", label: "Private bathroom" },
  { value: "SHARED", label: "Shared bathroom" },
];

/**
 * What a room has — the API's `RoomAmenities`, beside the property's own
 * list above. Labelled `Group · Name`, as the stay's are, and checked against
 * the Java file by a test.
 */
const ROOM_AMENITY_GROUPS: readonly (readonly [string, readonly (readonly [string, string])[]])[] = [
  ["Comfort", [["air-conditioning", "Air conditioning"], ["fan", "Fan"], ["heating", "Heating"],
    ["mosquito-net", "Mosquito net"], ["blackout-curtains", "Blackout curtains"], ["soundproofing", "Soundproofing"],
    ["privacy-curtain", "Privacy curtain on the bed"], ["reading-light", "Reading light by the bed"]]],
  ["Bathroom", [["hot-water", "Hot water"], ["shower", "Shower"], ["rain-shower", "Rain shower"], ["bathtub", "Bathtub"],
    ["bidet", "Bidet"], ["hairdryer", "Hairdryer"], ["toiletries", "Free toiletries"], ["towels", "Towels"],
    ["slippers", "Slippers"], ["bathrobes", "Bathrobes"]]],
  ["Food & drink", [["kettle", "Kettle"], ["coffee-machine", "Coffee machine"], ["minibar", "Minibar"],
    ["fridge", "Fridge"], ["kitchenette", "Kitchenette"], ["kitchen", "Full kitchen"], ["microwave", "Microwave"],
    ["water-bottles", "Free drinking water"]]],
  ["Tech & work", [["wifi", "Wi-Fi"], ["tv", "TV"], ["streaming", "Streaming service"], ["desk", "Desk"],
    ["usb-sockets", "USB sockets"], ["phone", "Telephone"]]],
  ["Space & outdoors", [["balcony", "Balcony"], ["terrace", "Terrace"], ["private-pool", "Private pool"],
    ["seating-area", "Seating area"], ["wardrobe", "Wardrobe"], ["iron", "Iron"], ["clothes-rack", "Clothes rack"]]],
  ["Safety & access", [["safe", "Safe"], ["lockers", "Lockers"], ["smoke-alarm", "Smoke alarm"], ["step-free", "Step-free access"],
    ["accessible-bathroom", "Accessible bathroom"], ["ground-floor", "Ground floor"]]],
  ["Family", [["cot-available", "Cot on request"], ["extra-bed-available", "Extra bed on request"]]],
];

export const ROOM_AMENITIES: readonly EnumOption[] = ROOM_AMENITY_GROUPS.flatMap(([group, entries]) =>
  entries.map(([value, label]) => ({ value, label: `${group} · ${label}` })),
);

/** The bed counts a room holds, in the order a room card lists them — the API's columns. */
export const ROOM_BEDS: readonly {
  readonly name: string;
  readonly label: string;
  readonly plural: string;
  readonly size: string;
  readonly sleeps: number;
}[] = [
  { name: "singleBeds", label: "Single bed", plural: "single beds", size: "90–130 cm wide", sleeps: 1 },
  { name: "doubleBeds", label: "Double bed", plural: "double beds", size: "131–150 cm wide", sleeps: 2 },
  { name: "queenBeds", label: "Queen bed", plural: "queen beds", size: "151–180 cm wide", sleeps: 2 },
  { name: "kingBeds", label: "King bed", plural: "king beds", size: "181–210 cm wide", sleeps: 2 },
  { name: "bunkBeds", label: "Bunk bed", plural: "bunk beds", size: "Two beds, one above the other", sleeps: 2 },
  { name: "sofaBeds", label: "Sofa bed", plural: "sofa beds", size: "Folds out for one", sleeps: 1 },
  { name: "futonBeds", label: "Futon mat", plural: "futon mats", size: "On the floor, for one", sleeps: 1 },
];

/** How often the room is cleaned during a stay — the API's `RoomHousekeeping`. */
export const ROOM_HOUSEKEEPING: readonly EnumOption[] = [
  { value: "DAILY", label: "Cleaned daily" },
  { value: "ON_REQUEST", label: "Cleaned on request" },
  { value: "WEEKLY", label: "Cleaned weekly" },
  { value: "NONE", label: "Not cleaned during the stay" },
];

/** When the guest pays — the API's `RoomPaymentTerms`. */
export const ROOM_PAYMENT_TERMS: readonly EnumOption[] = [
  { value: "PAY_AT_PROPERTY", label: "Pay at the property" },
  { value: "DEPOSIT", label: "Deposit to book" },
  { value: "PREPAYMENT", label: "Pay in advance" },
];

/** A room on sale or taken off it; the API's `isActive`. */
const ROOM_SALE: ResourceStatus = {
  field: "isActive",
  options: [
    { value: "ACTIVE", label: "Bookable", hint: "guests can see and book it", tone: "success" },
    { value: "INACTIVE", label: "Hidden", hint: "kept here, not shown to guests", tone: "neutral" },
  ],
  initial: "ACTIVE",
  live: "ACTIVE",
  retired: "INACTIVE",
};

const PRICE_RANGES: readonly EnumOption[] = ["$", "$$", "$$$", "$$$$"].map((value) => ({
  value,
  label: value,
}));

/* --- field builders ------------------------------------------------------ */

const name = (label = "Name"): ResourceField => ({
  name: "name",
  label,
  kind: "text",
  required: true,
});

/**
 * A slug as the API takes it: lower-case letters and digits in words joined by
 * single hyphens. Kept as text, not a RegExp: a definition travels from a
 * server page to a client form, and only plain values survive that.
 */
export const SLUG_PATTERN = "^[a-z0-9]+(?:-[a-z0-9]+)*$";

const slug: ResourceField = {
  name: "slug",
  label: "Link name",
  kind: "text",
  blank: "null",
  hint: "The end of this listing's web address, e.g. ams.travel/foods/mekong-grill. Leave it empty and we make one from the name.",
  pattern: {
    source: SLUG_PATTERN,
    message: "Use lower-case letters and numbers joined by hyphens, e.g. angkor-wat — or leave it empty.",
  },
};

const description: ResourceField = {
  name: "description",
  label: "Description",
  kind: "textarea",
  span: 2,
};

const shortDescription: ResourceField = {
  name: "shortDescription",
  label: "Short description",
  kind: "textarea",
  span: 2,
  hint: "One or two sentences. This is the text on every card across the website.",
};

const iconKey: ResourceField = {
  name: "iconKey",
  label: "Icon",
  kind: "text",
  hint: "An icon name, e.g. `compass` — not an upload.",
};

const sortOrder: ResourceField = {
  name: "sortOrder",
  label: "Sort order",
  kind: "number",
  hint: "Lower numbers come first.",
};

const cover = (imageCategory: ImageCategory, label = "Cover image"): ResourceField => ({
  name: "coverKey",
  urlField: "coverUrl",
  label,
  kind: "image",
  imageCategory,
  span: 2,
  section: "Media",
});

const ref = (
  field: string,
  label: string,
  target: ReferenceKey,
  extra: Partial<ResourceField> = {},
): ResourceField => ({ name: field, label, kind: "ref", ref: target, ...extra });

/** A year a period, a reign or a timeline moment is dated by. */
const year = (field: string, label: string, section: string): ResourceField => ({
  name: field,
  label,
  kind: "number",
  section,
  hint: "A year, e.g. 1113. Below zero is BCE.",
});

/** A region is either geography the provinces sit in, or a theme Discover browses by. */
const REGION_KINDS = options(["ZONE", "TOURISM"]);

/** The shelf whose interests are chosen on a tourism corridor, and list corridors rather than places. */
export const CORRIDOR_INTEREST_GROUP = "Tourism Corridors";

/** The groups the website's Interests tab is divided into, in the order it shows them. */
const INTEREST_GROUPS: readonly EnumOption[] = [
  "Attraction Sites",
  "Stays",
  "Food",
  "Water",
  "Activities & Experiences",
  CORRIDOR_INTEREST_GROUP,
].map((value) => ({ value, label: value }));

/**
 * What a stay offers, as the API's `StayAmenities` lists it.
 *
 * Amenities are a fixed list rather than free text, because typed ones cannot
 * be filtered on: "Wi-Fi", "wifi" and "Free WiFi" are three strings and one
 * facility. The group is only how a guest scans them — the slug is what a row
 * stores — so it is shown in the label. A test reads the Java file to prove
 * the two lists have not drifted.
 */
const STAY_AMENITY_GROUPS: readonly (readonly [string, readonly (readonly [string, string])[]])[] = [
  ["Internet", [["wifi", "Wi-Fi"], ["wifi-free", "Free Wi-Fi"], ["workspace", "Workspace"]]],
  ["Parking & transport", [["parking", "Parking"], ["parking-free", "Free parking"],
    ["airport-shuttle", "Airport shuttle"], ["car-hire", "Car hire"]]],
  ["Wellbeing", [["pool", "Swimming pool"], ["spa", "Spa"], ["gym", "Gym"], ["garden", "Garden"],
    ["terrace", "Terrace"]]],
  ["Food & drink", [["breakfast", "Breakfast"], ["restaurant", "Restaurant"], ["bar", "Bar"],
    ["room-service", "Room service"], ["kitchen", "Kitchen"]]],
  ["Room", [["air-conditioning", "Air conditioning"], ["heating", "Heating"],
    ["private-bathroom", "Private bathroom"], ["balcony", "Balcony"], ["tv", "TV"], ["safe", "Safe"]]],
  ["Services", [["front-desk-24h", "24-hour front desk"], ["laundry", "Laundry"],
    ["housekeeping", "Housekeeping"], ["luggage-storage", "Luggage storage"], ["tours", "Tour desk"]]],
  ["Family & pets", [["family-rooms", "Family rooms"], ["cot", "Cot"], ["pets-allowed", "Pets allowed"]]],
  ["Accessibility", [["step-free-access", "Step-free access"], ["lift", "Lift"],
    ["accessible-bathroom", "Accessible bathroom"]]],
];

export const STAY_AMENITIES: readonly EnumOption[] = STAY_AMENITY_GROUPS.flatMap(([group, entries]) =>
  entries.map(([value, label]) => ({ value, label: `${group} · ${label}` })),
);

/*
 * --- each kind of stay, its own ------------------------------------------------
 *
 * The mirror of the food tables: what only a hotel, a hostel or a homestay has
 * (the API's `StaySpecialties`, checked against the Java file by a test), the
 * facilities and breakfasts each kind is offered, and every field in its words.
 * Only the form narrows — the API keeps one vocabulary, so a changed type loses nothing.
 */
const STAY_SPECIALTY_GROUPS: readonly (readonly [string, readonly (readonly [string, readonly (readonly [string, string])[]])[]])[] = [
  ["HOTEL", [
    ["Kind of hotel", [["boutique-hotel", "Boutique hotel"], ["business-hotel", "Business hotel"], ["heritage-building", "In a heritage building"], ["riverfront-hotel", "On the riverfront"], ["airport-hotel", "Near the airport"]]],
    ["At the front desk", [["concierge", "Concierge"], ["porter", "Porter for the luggage"], ["express-check-in", "Express check-in"], ["currency-exchange", "Currency exchange"], ["sim-cards", "SIM cards sold"], ["visa-help", "Help with visas"]]],
    ["Meetings & events", [["meeting-rooms", "Meeting rooms"], ["business-centre", "Business centre"], ["event-hall", "Wedding and event hall"], ["executive-lounge", "Executive lounge"]]],
  ]],
  ["GUESTHOUSE", [
    ["The house", [["family-run", "Family-run"], ["hosts-on-site", "The owners live on site"], ["guest-kitchen", "A kitchen guests can use"], ["common-room", "Common room"], ["rooftop-terrace", "Rooftop terrace"]]],
    ["The hosts can arrange", [["tuk-tuk-drivers", "Tuk-tuks and drivers"], ["bus-boat-tickets", "Bus and boat tickets"], ["bicycle-hire", "Bicycle hire"], ["motorbike-hire", "Motorbike hire"], ["visa-extensions", "Visa extensions"]]],
    ["Kind of guesthouse", [["budget-guesthouse", "Budget"], ["colonial-house", "In an old colonial house"], ["garden-bungalows", "Bungalows in a garden"]]],
  ]],
  ["HOSTEL", [
    ["Beds", [["mixed-dorms", "Mixed dorms"], ["female-dorms", "Female-only dorms"], ["pod-beds", "Pod beds with curtains"], ["private-rooms-too", "Private rooms as well"]]],
    ["Social life", [["party-hostel", "Party hostel"], ["quiet-hostel", "Quiet hostel"], ["shared-dinners", "Shared dinners"], ["pub-crawls", "Pub crawls"], ["free-walking-tours", "Free walking tours"]]],
    ["For backpackers", [["hostel-kitchen", "A kitchen guests can use"], ["travel-desk", "Bus, boat and visa desk"], ["book-exchange", "Book exchange"], ["coworking-corner", "Co-working corner"]]],
  ]],
  ["RESORT", [
    ["Setting", [["beachfront", "On the beach"], ["private-island", "On its own island"], ["jungle-setting", "In the jungle"], ["riverside-setting", "By the river"], ["hills-setting", "In the hills"]]],
    ["Meal plans", [["all-inclusive", "All-inclusive"], ["full-board", "Full board"], ["half-board", "Half board"]]],
    ["Activities", [["kids-club", "Kids' club"], ["water-sports", "Water sports"], ["diving", "Diving and snorkelling"], ["kayaks", "Kayaks"], ["yoga", "Yoga classes"], ["nature-walks", "Guided nature walks"]]],
    ["Getting there", [["boat-transfer", "Boat transfer"], ["resort-shuttle", "Shuttle from town"]]],
  ]],
  ["HOMESTAY", [
    ["The home", [["stilt-house", "Traditional Khmer stilt house"], ["village-setting", "In a village"], ["rice-field-view", "View over the rice fields"], ["meals-with-family", "Meals with the family"]]],
    ["Join in", [["cook-with-hosts", "Cook with the hosts"], ["farm-work", "Help on the farm"], ["village-crafts", "Village crafts — weaving, pottery"], ["fishing-trips", "Fishing with the family"], ["ox-cart-rides", "Ox-cart rides"], ["village-walks", "Village walks"]]],
    ["Community", [["community-tourism", "Community-based tourism"], ["money-to-village", "Money goes to the village"]]],
  ]],
  ["VILLA", [
    ["The villa", [["whole-villa", "The whole villa is yours"], ["villa-pool", "Private pool"], ["villa-garden", "Private garden"], ["villa-bbq", "Barbecue"], ["villa-kitchen", "Full kitchen"]]],
    ["Staff", [["housekeeper", "Housekeeper"], ["private-chef", "Private chef"], ["driver", "Driver"], ["night-guard", "Night guard"]]],
    ["Where the villa is", [["villa-beach", "By the beach"], ["villa-countryside", "In the countryside"], ["villa-town", "In town"]]],
  ]],
];

export const STAY_SPECIALTIES: readonly EnumOption[] = STAY_SPECIALTY_GROUPS.flatMap(([, kindGroups]) =>
  kindGroups.flatMap(([group, entries]) => entries.map(([value, label]) => ({ value, label: `${group} · ${label}` }))),
);

/** Each kind's own slugs; "Other" has none of its own. */
export const STAY_SPECIALTIES_BY_KIND: Readonly<Record<string, readonly string[]>> = Object.fromEntries(
  STAY_SPECIALTY_GROUPS.map(([kind, kindGroups]) => [kind, kindGroups.flatMap(([, entries]) => entries.map(([value]) => value))]),
);

/** What the field is called for each kind of stay: it holds what only that kind has. */
export const STAY_SPECIALTY_LABEL: Readonly<Record<string, string>> = {
  HOTEL: "What kind of hotel, its desk and its events",
  GUESTHOUSE: "Your house, and what the hosts arrange",
  HOSTEL: "Your beds and your social life",
  RESORT: "Its setting, meal plans and activities",
  HOMESTAY: "Your home, and what guests join in",
  VILLA: "The villa, its staff and where it is"
};

/** The facilities each kind of stay is offered: a homestay is not asked about its gym or its lift. */
export const STAY_FACILITIES_BY_KIND: Readonly<Record<string, readonly string[]>> = {
  HOTEL: ["wifi", "wifi-free", "workspace", "parking", "parking-free", "airport-shuttle", "car-hire", "pool", "spa", "gym", "garden", "terrace", "breakfast", "restaurant", "bar", "room-service", "air-conditioning", "heating", "private-bathroom", "balcony", "tv", "safe", "front-desk-24h", "laundry", "housekeeping", "luggage-storage", "tours", "family-rooms", "cot", "pets-allowed", "step-free-access", "lift", "accessible-bathroom"],
  GUESTHOUSE: ["wifi", "wifi-free", "workspace", "parking", "parking-free", "airport-shuttle", "car-hire", "pool", "garden", "terrace", "breakfast", "restaurant", "bar", "kitchen", "air-conditioning", "private-bathroom", "balcony", "tv", "safe", "front-desk-24h", "laundry", "housekeeping", "luggage-storage", "tours", "family-rooms", "cot", "pets-allowed", "step-free-access", "lift", "accessible-bathroom"],
  HOSTEL: ["wifi", "wifi-free", "workspace", "parking", "parking-free", "airport-shuttle", "pool", "garden", "terrace", "breakfast", "restaurant", "bar", "kitchen", "air-conditioning", "private-bathroom", "front-desk-24h", "laundry", "luggage-storage", "tours", "step-free-access", "lift", "accessible-bathroom"],
  RESORT: ["wifi", "wifi-free", "workspace", "parking", "parking-free", "airport-shuttle", "car-hire", "pool", "spa", "gym", "garden", "terrace", "breakfast", "restaurant", "bar", "room-service", "air-conditioning", "private-bathroom", "balcony", "tv", "safe", "front-desk-24h", "laundry", "housekeeping", "luggage-storage", "tours", "family-rooms", "cot", "pets-allowed", "step-free-access", "lift", "accessible-bathroom"],
  HOMESTAY: ["wifi", "wifi-free", "parking", "parking-free", "garden", "terrace", "breakfast", "kitchen", "air-conditioning", "private-bathroom", "balcony", "tv", "laundry", "luggage-storage", "tours", "family-rooms", "cot", "pets-allowed", "step-free-access"],
  VILLA: ["wifi", "wifi-free", "workspace", "parking", "parking-free", "airport-shuttle", "car-hire", "pool", "garden", "terrace", "breakfast", "kitchen", "air-conditioning", "private-bathroom", "balcony", "tv", "safe", "laundry", "housekeeping", "luggage-storage", "cot", "pets-allowed", "step-free-access", "accessible-bathroom"],
};

/** The breakfasts each kind serves: a homestay cooks Khmer or Asian, not a buffet. */
export const BREAKFAST_BY_KIND: Readonly<Record<string, readonly string[]>> = {
  GUESTHOUSE: ["khmer", "asian", "continental", "american", "vegetarian", "vegan", "halal"],
  HOSTEL: ["khmer", "asian", "continental", "american", "vegetarian", "vegan"],
  HOMESTAY: ["khmer", "asian", "vegetarian"],
  VILLA: ["khmer", "asian", "continental", "american", "vegetarian", "vegan", "halal"],
};

/** Star ratings are official, and only hotels, guesthouses and resorts get one. */
const STAR_RATED = ["HOTEL", "GUESTHOUSE", "RESORT", "OTHER"];

/**
 * What each stay field is called for each kind, so a hotel's form reads as a
 * hotel's and a homestay's as a homestay's. A kind left out keeps the field's
 * own label — "Other" mostly does.
 */
export const STAY_FIELD_LABELS: KindWords = {
  name: {
    HOTEL: "Hotel name",
    GUESTHOUSE: "Guesthouse name",
    HOSTEL: "Hostel name",
    RESORT: "Resort name",
    HOMESTAY: "Homestay name",
    VILLA: "Villa name",
  },
  starRating: {
    HOTEL: "Official star rating",
    GUESTHOUSE: "Official star rating",
    RESORT: "Official star rating",
  },
  description: {
    HOTEL: "The hotel's story",
    GUESTHOUSE: "The guesthouse and its hosts",
    HOSTEL: "What the hostel is like",
    RESORT: "A day at the resort",
    HOMESTAY: "Life with the family",
    VILLA: "A stay at the villa",
  },
  interestIds: {
    HOTEL: "Trips the hotel suits",
    GUESTHOUSE: "Trips the guesthouse suits",
    HOSTEL: "Trips the hostel suits",
    RESORT: "Trips the resort suits",
    HOMESTAY: "Trips the homestay suits",
    VILLA: "Trips the villa suits",
  },
  address: {
    HOTEL: "Hotel address",
    GUESTHOUSE: "Guesthouse address",
    HOSTEL: "Hostel address",
    RESORT: "Resort address",
    HOMESTAY: "Village and address",
    VILLA: "Villa address",
  },
  phone: {
    HOTEL: "Front desk phone",
    GUESTHOUSE: "The hosts' phone",
    HOSTEL: "Reception phone",
    RESORT: "Reservations phone",
    HOMESTAY: "The family's phone",
    VILLA: "Villa manager's phone",
  },
  amenities: {
    HOTEL: "What the hotel has",
    GUESTHOUSE: "What the guesthouse has",
    HOSTEL: "What the hostel has",
    RESORT: "What the resort has",
    HOMESTAY: "What the home has",
    VILLA: "What the villa has",
  },
  breakfastOption: {
    HOTEL: "Breakfast at the hotel",
    GUESTHOUSE: "Breakfast at the guesthouse",
    HOSTEL: "Breakfast at the hostel",
    RESORT: "Breakfast at the resort",
    HOMESTAY: "Breakfast with the family",
    VILLA: "Breakfast in the villa",
  },
  breakfastTypes: {
    HOTEL: "What the hotel serves for breakfast",
    GUESTHOUSE: "What the hosts serve for breakfast",
    HOSTEL: "What the hostel serves for breakfast",
    RESORT: "What the resort serves for breakfast",
    HOMESTAY: "What the family cooks for breakfast",
    VILLA: "What is cooked for breakfast",
  },
  parkingOption: {
    HOTEL: "Hotel parking",
    GUESTHOUSE: "Guesthouse parking",
    HOSTEL: "Hostel parking",
    RESORT: "Resort parking",
    HOMESTAY: "Parking at the house",
    VILLA: "Parking at the villa",
  },
  priceFrom: {
    HOTEL: "Cheapest room, per night",
    GUESTHOUSE: "Cheapest room, per night",
    HOSTEL: "Cheapest bed, per night",
    RESORT: "Cheapest room or villa, per night",
    HOMESTAY: "One night in the home",
    VILLA: "The villa, per night",
  },
  checkInFrom: {
    HOMESTAY: "Earliest arrival",
    VILLA: "Earliest arrival",
  },
  checkInUntil: {
    HOMESTAY: "Latest arrival",
    VILLA: "Latest arrival",
    HOSTEL: "Latest check-in at reception",
  },
  checkOutFrom: {
    HOMESTAY: "Earliest departure",
    VILLA: "Earliest departure",
  },
  checkOutUntil: {
    HOMESTAY: "Latest departure",
    VILLA: "Latest departure",
  },
  minCheckInAge: {
    HOTEL: "Youngest guest who can check in alone",
    GUESTHOUSE: "Youngest guest who can stay alone",
    HOSTEL: "Youngest guest in the dorms",
    RESORT: "Youngest guest who can check in alone",
    HOMESTAY: "Youngest guest who can stay alone",
    VILLA: "Youngest guest who can book",
  },
  childrenAllowed: {
    HOSTEL: "Children welcome (in private rooms)",
    HOMESTAY: "Children welcome in the home",
    VILLA: "Children welcome at the villa",
  },
  partiesAllowed: {
    HOSTEL: "Guests may hold their own parties",
    HOMESTAY: "Guests may hold parties in the home",
    VILLA: "Guests may hold parties at the villa",
  },
  quietHours: {
    GUESTHOUSE: "When the house is quiet",
    HOSTEL: "Quiet hours in the dorms",
    HOMESTAY: "When the family sleeps",
    VILLA: "Quiet hours for the neighbours",
  },
  paymentMethods: {
    HOTEL: "Ways to pay the hotel",
    GUESTHOUSE: "Ways to pay the hosts",
    HOSTEL: "Ways to pay at reception",
    RESORT: "Ways to pay the resort",
    HOMESTAY: "Ways to pay the family",
    VILLA: "Ways to pay for the villa",
  },
  languagesSpoken: {
    HOTEL: "Languages the front desk speaks",
    GUESTHOUSE: "Languages the hosts speak",
    HOSTEL: "Languages reception speaks",
    RESORT: "Languages the resort staff speak",
    HOMESTAY: "Languages the family speaks",
    VILLA: "Languages the villa manager speaks",
  },
};

/** The examples under the stay fields, per kind. */
export const STAY_FIELD_HINTS: KindWords = {
  name: {
    HOTEL: "For example: Riverside Palace Hotel.",
    GUESTHOUSE: "For example: Srey's Garden Guesthouse.",
    HOSTEL: "For example: Lucky Backpackers Hostel.",
    RESORT: "For example: Saracen Bay Beach Resort.",
    HOMESTAY: "For example: Mr Sok's Family Homestay, Chi Phat.",
    VILLA: "For example: Villa Lotus Kep.",
  },
  description: {
    HOTEL: "The story: what the hotel is known for, the best rooms, and what is close by.",
    GUESTHOUSE: "Who runs it, what the house is like, and what the hosts help with.",
    HOSTEL: "The crowd it draws, the dorms and the common spaces, and what happens in the evening.",
    RESORT: "The setting, what a day there looks like, and how guests get there.",
    HOMESTAY: "The family, the house, the village, and what guests do with them each day.",
    VILLA: "How many it sleeps, what comes with it, and what the area is like.",
  },
  address: {
    HOTEL: "Street, number and area, e.g. No. 12, Sisowath Quay, Phnom Penh.",
    GUESTHOUSE: "Street and village, e.g. Street 19, Wat Bo village, Siem Reap.",
    HOSTEL: "Street, number and area, e.g. No. 8, Street 172, Phnom Penh.",
    RESORT: "The beach, island or area, e.g. Saracen Bay, Koh Rong Samloem.",
    HOMESTAY: "Village, commune and province, e.g. Chi Phat village, Chi Phat commune, Koh Kong.",
    VILLA: "Road and area, e.g. Kep Beach road, Kep.",
  },
  starRating: {
    HOTEL: "The Ministry of Tourism's official rating, 1 to 5. Leave it empty if the hotel is not rated.",
    GUESTHOUSE: "Only if the guesthouse has an official rating. Most do not — leave it empty.",
    RESORT: "The Ministry of Tourism's official rating, 1 to 5. Leave it empty if the resort is not rated.",
  },
  amenities: {
    HOTEL: "Everything a hotel guest can use. Guests filter hotels by these, so tick only what is really there.",
    GUESTHOUSE: "Everything a guest can use in the house. Guests filter by these, so tick only what is really there.",
    HOSTEL: "Everything a backpacker can use. Only a hostel’s facilities are offered.",
    RESORT: "Everything a resort guest can use without leaving. Guests filter resorts by these.",
    HOMESTAY: "What the home really has. A shared bathroom and a fan are fine when guests know.",
    VILLA: "Everything that comes with the villa. Guests filter villas by these.",
  },
  priceFrom: {
    HOTEL: "One night in the cheapest room. Once the rooms have prices, this follows the cheapest room by itself.",
    GUESTHOUSE: "One night in the cheapest room, fan rooms included. Once the rooms have prices, this follows the cheapest by itself.",
    HOSTEL: "One bed for one night in the cheapest dorm. Once the dorms have prices, this follows the cheapest bed by itself.",
    RESORT: "One night in the cheapest room or bungalow. Once they have prices, this follows the cheapest by itself.",
    HOMESTAY: "One night in the home. Say in the description whether dinner with the family is included.",
    VILLA: "One night for the whole villa, not per person. Once the villa has a price, this follows it by itself.",
  },
  phone: {
    HOTEL: "The front desk, which answers day and night.",
    GUESTHOUSE: "The number the hosts answer.",
    HOSTEL: "Reception, for late arrivals.",
    RESORT: "Reservations, and the boat transfer.",
    HOMESTAY: "The family, or the community office that books for them.",
    VILLA: "The manager who hands over the keys.",
  },
  facebookUrl: {
    HOTEL: "The hotel's page, where it posts offers.",
    GUESTHOUSE: "The guesthouse's page, where guests leave reviews.",
    HOSTEL: "The hostel's page, where it posts tonight's events.",
    RESORT: "The resort's page, where it posts the boat times.",
    HOMESTAY: "The homestay's or the community's page.",
    VILLA: "The villa's page, with more photos.",
  },
  quietHours: {
    GUESTHOUSE: "When guests must keep the noise down, e.g. 22:00-07:00. Leave empty if there are none.",
    HOSTEL: "When the dorms go quiet, e.g. 23:00-07:00 — the rooftop can stay open later.",
    HOMESTAY: "When the family goes to bed and gets up, e.g. 21:00-05:00.",
    VILLA: "When the pool and music must go quiet for the neighbours, e.g. 22:00-08:00.",
  },
};

/** A stay field in its kind's own words (see STAY_FIELD_LABELS and STAY_FIELD_HINTS). */
const forStayKind = inKindWords(STAY_FIELD_LABELS, STAY_FIELD_HINTS);

/** A food field in its kind's own words (see FOOD_FIELD_LABELS and FOOD_FIELD_HINTS). */
const forFoodKind = inKindWords(FOOD_FIELD_LABELS, FOOD_FIELD_HINTS);

const classification: readonly ResourceField[] = [
  { name: "categoryIds", label: "Categories", kind: "refs", ref: "categories", span: 2, section: "Classification" },
  { name: "tagIds", label: "Tags", kind: "refs", ref: "tags", span: 2, section: "Classification" },
  { name: "interestIds", label: "Interests", kind: "refs", ref: "interests", span: 2, section: "Classification" },
];

/** The interest shelves an attraction can stand on; Stays and Food are a stay's and a food listing's, Tourism Corridors a corridor's. */
const ATTRACTION_INTEREST_GROUPS = ["Attraction Sites", "Water", "Activities & Experiences"] as const;

/**
 * An attraction's categories and tags are its tourism region's own: Ancient
 * Capitals & Khmer Civilization offers its temples, museums and ancient
 * roads, and UNESCO — not the whole catalogue. Its interests are not the
 * region's: they are what a traveller comes for, anywhere in the country, so
 * a temple known for its sunset can stand under Viewpoint.
 */
const regionClassification: readonly ResourceField[] = classification.map((field) =>
  field.name === "interestIds"
    ? {
        ...field,
        optionGroup: ATTRACTION_INTEREST_GROUPS,
        hint: "What a traveller comes for. It is listed under each one on the Interests tab and on its province's page, whatever its region.",
      }
    : { ...field, narrowedBy: { field: "tourismRegionIds", links: field.name } },
);

/**
 * Ancient Capitals & Khmer Civilization's tags Century, King, Architecture
 * Style, Religion and Historical Period each ask which, once ticked: the
 * centuries, the kings… Unticked, the answer goes with the tag.
 */
const askedByTag = (slug: string) => ({ field: "tagIds", values: [slug], bySlug: "tags" }) as const;

const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;

/** The 1st to the 21st century, oldest first. */
export const CENTURIES: readonly EnumOption[] = Array.from({ length: 21 }, (_, index) => ({
  value: String(index + 1),
  label: `${ordinal(index + 1)} century`,
}));

/** The tag each heritage answer belongs to, by the tag's slug. */
export const HERITAGE_TAGS: Readonly<Record<string, string>> = {
  centuries: "century",
  monarchIds: "king",
  architectureStyleIds: "architecture-style",
  religionIds: "religion",
  historicalPeriodIds: "historical-period",
};

/** Which centuries, kings, styles, religions and periods — in the order of its tags. */
const ancientSiteFilters: Readonly<Record<string, ResourceField>> = {
  centuries: {
    name: "centuries",
    label: "Centuries",
    kind: "enums",
    options: CENTURIES,
    scale: true,
    numeric: true,
    visibleWhen: askedByTag(HERITAGE_TAGS.centuries),
    span: 2,
    section: "Classification",
    hint: "When it was built or in use. The reigns of its kings and the years on its timeline are added on the website too.",
  },
  monarchIds: {
    name: "monarchIds",
    label: "Kings",
    kind: "refs",
    ref: "monarchs",
    ties: { path: "/destination-monarchs", by: "destinationId", list: "monarchs", key: "monarchId", keep: ["description"] },
    visibleWhen: askedByTag(HERITAGE_TAGS.monarchIds),
    span: 2,
    section: "Classification",
    hint: "The kings who built it or shaped it. What each one did is written under History & heritage, once it is saved.",
  },
  architectureStyleIds: {
    name: "architectureStyleIds",
    label: "Architecture styles",
    kind: "refs",
    ref: "architecture-styles",
    visibleWhen: askedByTag(HERITAGE_TAGS.architectureStyleIds),
    span: 2,
    section: "Classification",
    hint: "The style it was built in, such as Bayon or Angkor Wat.",
  },
  religionIds: {
    name: "religionIds",
    label: "Religions",
    kind: "refs",
    ref: "religions",
    visibleWhen: askedByTag(HERITAGE_TAGS.religionIds),
    span: 2,
    section: "Classification",
    hint: "The faith it was built for, such as Hinduism or Buddhism.",
  },
  historicalPeriodIds: {
    name: "historicalPeriodIds",
    label: "Historical periods",
    kind: "refs",
    ref: "historical-periods",
    visibleWhen: askedByTag(HERITAGE_TAGS.historicalPeriodIds),
    span: 2,
    section: "Classification",
    hint: "The era it belongs to. The periods on its timeline are added on the website too.",
  },
};

const location: readonly ResourceField[] = [
  { name: "address", label: "Address", kind: "text", span: 2, section: "Location" },
  {
    name: "latitude",
    label: "Latitude",
    kind: "decimal",
    min: -90,
    max: 90,
    step: 0.000001,
    section: "Location",
  },
  {
    name: "longitude",
    label: "Longitude",
    kind: "decimal",
    min: -180,
    max: 180,
    step: 0.000001,
    section: "Location",
  },
];

/**
 * The tourism regions a category or a tag belongs to. Each region keeps its own
 * list (`categoryIds`, `tagIds`), which its Discover page and the destination
 * form follow, so this field is read from the regions and saved onto them.
 */
const regionsOf = (noun: string, field: "categoryIds" | "tagIds" | "interestIds"): ResourceField => ({
  name: "tourismRegionIds",
  label: "Tourism regions",
  kind: "refs",
  ref: "tourism-regions",
  required: true,
  span: 2,
  inverse: { resource: "regions", field },
  hint: `The regions this ${noun} belongs to. It is offered only on their pages and to the destinations in them.`,
});

/** The same two price fields, with the hint written for the kind of listing. */
const priceFor = (hint: string): readonly ResourceField[] =>
  pricing.map((field) => (field.name === "priceFrom" ? { ...field, hint } : field));

const pricing: readonly ResourceField[] = [
  {
    name: "priceFrom",
    label: "Price from",
    kind: "decimal",
    min: 0,
    step: 0.01,
    section: "Prices & policies",
    hint: "The lowest a visitor pays: one night for a stay, one dish for a place to eat. Once the rooms or dishes have prices, this follows the cheapest one by itself.",
  },
  {
    name: "currency",
    label: "Currency",
    kind: "text",
    initial: "USD",
    section: "Prices & policies",
    hint: "Three letters, e.g. USD or KHR.",
  },
];

/*
 * A listing's text as its API columns take it: a destination, a stay and a
 * food share these limits, so the form counts against the same numbers.
 */
/**
 * A stay or a food listing is a place in its own right, found by its map pin:
 * the website lists it on the page of every destination within 50 km. So the
 * pin is required, and there is no destination to choose.
 */
const pinnedLocation: readonly ResourceField[] = location.map((field) => {
  if (field.name === "latitude") {
    return {
      ...field,
      required: true,
      hint: "Travellers see it on the page of every destination within 50 km of the pin.",
    };
  }
  return field.name === "longitude" ? { ...field, required: true } : field;
});

/**
 * Where a stay or a food listing shows in Explore: the interests of its own
 * shelf (Stays, Food), each of whose pages lists it next to the destinations.
 * The one matching its type is chosen for it, when such an interest exists.
 */
const shelfInterests = (
  group: "Stays" | "Food",
  noun: string,
  labels: Readonly<Record<string, readonly string[]>>,
): ResourceField => ({
  name: "interestIds",
  label: "Kinds of trip it suits",
  kind: "refs",
  ref: "interests",
  span: 2,
  section: "Classification",
  optionGroup: group,
  presetBy: { field: "type", labels },
  hint: `A traveller browsing for one of these sees this ${noun} on its page. Tick every one that fits.`,
});

const STAY_INTERESTS = shelfInterests("Stays", "stay", {
  HOTEL: ["Hotel", "Hotels"],
  GUESTHOUSE: ["Guesthouse", "Guesthouses", "Guest house", "Guest houses"],
  HOSTEL: ["Hostel", "Hostels"],
  RESORT: ["Resort", "Resorts"],
  HOMESTAY: ["Homestay", "Homestays"],
  VILLA: ["Villa", "Villas"],
});


const listingName: ResourceField = { ...name(), maxLength: 255, span: 2 };
const listingSlug: ResourceField = { ...slug, maxLength: 150 };
/*
 * No longer asked on any listing: the app shows the slogan and the first lines
 * of About instead. Kept as it is on a record, since the API writes the column
 * from every save (see `derived`).
 */
const listingShortDescription: ResourceField = { ...shortDescription, maxLength: 500, derived: true };
const contact = (websiteLength: number): readonly ResourceField[] => [
  { name: "phone", label: "Phone", kind: "text", section: "Contact", maxLength: 50 },
  { name: "contactEmail", label: "E-mail", kind: "text", section: "Contact", maxLength: 255 },
  { name: "website", label: "Website", kind: "text", section: "Contact", maxLength: websiteLength },
];

/** The photo sets hung off a destination or a food listing. */
const mediaFields = (
  owner: ResourceField,
  imageCategory: ImageCategory,
): readonly ResourceField[] => [
  owner,
  {
    name: "mediaKey",
    urlField: "mediaUrl",
    label: "File",
    kind: "image",
    imageCategory,
    required: true,
    span: 2,
  },
  { name: "mediaType", label: "Type", kind: "enum", options: MEDIA_TYPES, required: true, initial: "IMAGE" },
  sortOrder,
  {
    name: "caption",
    label: "Caption",
    kind: "text",
    span: 2,
    hint: "Describe the photograph for anyone who cannot see it.",
  },
  { name: "isCover", label: "Use as the cover", kind: "boolean" },
];

/* --- the registry -------------------------------------------------------- */

/*
 * --- A to Z -------------------------------------------------------------------
 *
 * Every list of names in the dashboard reads A to Z: a field's choices, the
 * chips of a picker, the options of a reference, the rows of a table. A list
 * that is a scale or a sequence — $ to $$, breakfast to dinner — is marked
 * `scale` and keeps its order. "Other" is always last.
 */
/** A catch-all choice, which goes after the named ones wherever they are sorted. */
function isOther(option: { readonly value: string; readonly label: string }): boolean {
  return option.value === "OTHER" || /^other$/i.test(option.label.trim());
}

const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true });

/** Compares two names A to Z, ignoring case and accents. */
export function byName(a: string, b: string): number {
  return collator.compare(a.trim(), b.trim());
}

/**
 * A list of choices A to Z, with "Other" last. A label written `Group · Name`
 * sorts by its group and then its name, so grouped pickers read A to Z twice.
 */
export function alphabetical<T extends { readonly value: string; readonly label: string }>(options: readonly T[]): T[] {
  return [...options].sort((a, b) => Number(isOther(a)) - Number(isOther(b)) || byName(a.label, b.label));
}

/** A field with its choices A to Z, unless they are a scale. */
function inAtoZ(field: ResourceField): ResourceField {
  return field.options && !field.scale ? { ...field, options: alphabetical(field.options) } : field;
}

const DEFINED: Readonly<Record<ResourceKey, ResourceDefinition>> = {
  destinations: {
    key: "destinations",
    label: "Destination",
    labelPlural: "Destinations",
    group: "Catalogue",
    description:
      "Every place a visitor can open. The richest record in the catalogue.",
    titleField: "name",
    searchFields: ["name", "slug", "address", "shortDescription"],
    status: DESTINATION_PUBLICATION,
    columns: [
      { name: "name", label: "Name" },
      { name: "address", label: "Address", secondary: true },
      { name: "createdBy", label: "Created by", kind: "ref", ref: "users", secondary: true },
      { name: "approvedBy", label: "Approved by", kind: "approval", secondary: true },
      { name: "verified", label: "Verified", kind: "verified", secondary: true },
      { name: "provinceId", label: "Province", kind: "ref", ref: "provinces", secondary: true },
      { name: "isFeatured", label: "Featured", kind: "boolean", secondary: true },
      { name: "status", label: "Status", kind: "status" },
    ],
    /*
     * The same fields for every attraction. Its tourism region is chosen in
     * Where it appears, and its categories and tags are that region's own.
     */
    fields: [
      listingName,
      listingSlug,
      listingShortDescription,
      {
        ...description,
        label: "About",
        rich: true,
        hint: "The full story. The app shows its first lines on the page and all of it under Read more. Headings, bold, lists and links come through.",
      },
      {
        name: "slogan",
        label: "Slogan",
        kind: "text",
        maxLength: 300,
        span: 2,
        hint: "One line someone said about it. The app quotes it at the top of the page, e.g. “Angkor Wat, the crown jewel of Cambodia, emanates history and awe in equal measure.”",
      },
      {
        name: "sloganBy",
        label: "Said by",
        kind: "text",
        maxLength: 120,
        hint: "Optional. Who said it, e.g. Gail Gutradt, shown under the quote. Leave it empty for a slogan of its own.",
      },
      /* Chosen among its gallery's photos, never asked on its own: the gallery writes it. */
      { ...cover("destination"), derived: true },
      ref("provinceId", "Province", "provinces", {
        required: true,
        section: "Placement",
        hint: "The region follows from the province.",
      }),
      {
        name: "tourismRegionIds",
        label: "Tourism region",
        kind: "refs",
        ref: "tourism-regions",
        required: true,
        single: true,
        tiles: true,
        span: 2,
        section: "Classification",
        hint: "The region the place is best known for. Its categories and tags follow from it, and it is listed on that region's page.",
      },
      /* The region's code, for the API and the website's page: worked out from the choice above, never asked. */
      { name: "theme", label: "Theme", kind: "enum", options: DESTINATION_THEMES, derived: true },
      ...regionClassification,
      ...Object.values(ancientSiteFilters),
      /* Its address sits beside its province, under the map. */
      ...location.map((field): ResourceField => (field.name === "address" ? { ...field, span: 1 } : field)),
      {
        name: "isFeatured",
        label: "Featured",
        kind: "boolean",
        section: "Standing",
        hint: "On: always shown in the homepage's Recommended and Popular lists, first. Off: it gets there only by being browsed.",
      },
    ] satisfies readonly ResourceField[],
  },

  "destination-media": {
    key: "destination-media",
    label: "Destination photo",
    labelPlural: "Destination media",
    group: "Catalogue",
    description: "The photographs and videos shown on a destination page.",
    titleField: "caption",
    searchFields: ["caption"],
    orderField: "sortOrder",
    columns: [
      { name: "mediaUrl", label: "Media", kind: "image" },
      { name: "ownerId", label: "Destination", kind: "ref", ref: "destinations" },
      { name: "caption", label: "Caption", secondary: true },
      { name: "mediaType", label: "Type", secondary: true },
      { name: "sortOrder", label: "#", kind: "number", secondary: true },
      { name: "isCover", label: "Cover", kind: "boolean", secondary: true },
    ],
    fields: mediaFields(
      ref("ownerId", "Destination", "destinations", { required: true }),
      "destination",
    ),
  },

  stays: {
    key: "stays",
    label: "Stay",
    labelPlural: "Stays",
    group: "Listings",
    description:
      "Hotels, resorts, guesthouses and homestays — a partner's own, or listed by the editors. Each shows on the page of every destination within 50 km of its map pin.",
    titleField: "name",
    searchFields: ["name", "address", "shortDescription"],
    status: PUBLICATION,
    columns: [
      { name: "name", label: "Name" },
      { name: "address", label: "Address", secondary: true },
      { name: "ownerUserId", label: "Created by", kind: "ref", ref: "users", secondary: true },
      { name: "approvedBy", label: "Approved by", kind: "approval", secondary: true },
      { name: "type", label: "Type", kind: "enum", options: STAY_TYPES, secondary: true },
      { name: "status", label: "Status", kind: "status" },
    ],
    /*
     * Ordered the way a property is described, and the way a guest reads one:
     * what it is, where it is, what it offers, what it looks like, what it
     * costs and how to reach it. Every field in its kind's words.
     */
    fields: ([
      listingName,
      { name: "type", label: "Property type", kind: "enum", options: STAY_TYPES, required: true, initial: "HOTEL" },
      {
        name: "starRating",
        label: "Star rating",
        kind: "number",
        min: 1,
        max: 5,
        hint: "One to five. Leave empty for a guesthouse or homestay that is not rated.",
        visibleWhen: { field: "type", values: STAR_RATED },
      },
      listingShortDescription,
      { ...description, rich: true },
      STAY_INTERESTS,
      ref("ownerUserId", "Owner account", "users", {
        section: "Placement",
        hint: "The account this stay is listed for — the partner, or the contributor who looks after it. Leave it empty when your own team does; whoever writes their own is filled in for them.",
      }),
      ...pinnedLocation,
      {
        name: "specialties",
        label: "What only this kind of stay has",
        labelFor: { field: "type", labels: STAY_SPECIALTY_LABEL },
        kind: "enums",
        options: STAY_SPECIALTIES,
        /* Written group by group, each group a sequence: kept as written, not A to Z. */
        scale: true,
        optionsFor: { field: "type", keep: STAY_SPECIALTIES_BY_KIND },
        visibleWhen: { field: "type", values: Object.keys(STAY_SPECIALTY_LABEL) },
        span: 2,
        section: "Facilities",
        hint: "Only this kind of stay is asked these. Guests read them on its page.",
      },
      {
        name: "amenities",
        label: "Facilities",
        kind: "enums",
        options: STAY_AMENITIES,
        optionsFor: { field: "type", keep: STAY_FACILITIES_BY_KIND },
        span: 2,
        section: "Facilities",
        hint: "Everything a guest can use. Guests filter stays by these, so tick only what is really there.",
      },
      { ...cover("stay"), derived: true },
      ...priceFor("The lowest a guest pays for one night. Once the rooms have prices, this follows the cheapest room by itself."),
      {
        name: "checkInFrom",
        label: "Earliest check-in",
        kind: "time",
        section: "Prices & policies",
        hint: "The time the first guest can arrive, e.g. 14:00 (2 pm).",
      },
      { name: "checkOutUntil", label: "Latest check-out", kind: "time", section: "Prices & policies", hint: "The time rooms must be free by, e.g. 12:00 (midday)." },
      ...contact(512),
      ...stayTrust,
      ...stayServices.map((field): ResourceField =>
        field.name === "breakfastTypes" ? { ...field, optionsFor: { field: "type", keep: BREAKFAST_BY_KIND } } : field,
      ),
      ...stayRules,
      ...stayPayments,
    ] satisfies readonly ResourceField[]).map(forStayKind),
  },

  "stay-media": {
    key: "stay-media",
    label: "Stay photo",
    labelPlural: "Stay media",
    group: "Listings",
    description: "The photographs shown on a stay's page.",
    titleField: "caption",
    searchFields: ["caption"],
    orderField: "sortOrder",
    columns: [
      { name: "mediaUrl", label: "Media", kind: "image" },
      { name: "ownerId", label: "Stay", kind: "ref", ref: "stays" },
      { name: "caption", label: "Caption", secondary: true },
      { name: "sortOrder", label: "#", kind: "number", secondary: true },
      { name: "isCover", label: "Cover", kind: "boolean", secondary: true },
    ],
    fields: mediaFields(ref("ownerId", "Stay", "stays", { required: true }), "stay"),
  },

  foods: {
    key: "foods",
    label: "Food listing",
    labelPlural: "Foods",
    group: "Listings",
    description:
      "Restaurants, cafes, markets and street food, and the local specialities worth the trip. Each shows on the page of every destination within 50 km of its map pin.",
    titleField: "name",
    searchFields: ["name", "slug", "address", "shortDescription"],
    status: PUBLICATION,
    columns: [
      { name: "name", label: "Name" },
      { name: "address", label: "Address", secondary: true },
      { name: "createdBy", label: "Created by", kind: "ref", ref: "users", secondary: true },
      { name: "approvedBy", label: "Approved by", kind: "approval", secondary: true },
      { name: "type", label: "Type", kind: "enum", options: FOOD_TYPES, secondary: true },
      { name: "isLocalSpecialty", label: "Speciality", kind: "boolean", secondary: true },
      { name: "status", label: "Status", kind: "status" },
    ],
    /*
     * One place that sells food, asked the same short set of questions — what
     * it is, where it is, what is on the menu and what it costs — but asked
     * them in its own kind's words: a cafe is never asked what a meal costs,
     * and each kind is asked the one thing only it has (see FOOD_SPECIALTIES).
     */
    fields: ([
      listingName,
      {
        name: "type",
        label: "Kind of place",
        kind: "enum",
        options: FOOD_TYPES,
        /* Read in the chooser's own order (see FOOD_TYPES), not A to Z. */
        scale: true,
        required: true,
        initial: "RESTAURANT",
        hint: "What a traveller would call it. The rest of the form is written for it: a cafe is asked about its coffee and its bakes, a stall about how it cooks.",
      },
      listingShortDescription,
      { ...description, rich: true },
      ref("ownerUserId", "Owner account", "users", {
        section: "Placement",
        hint: "The account this listing is listed for — the partner, or the contributor who looks after it. Leave it empty when your own team does; whoever writes their own is filled in for them.",
      }),
      ...pinnedLocation,
      { ...cover("food"), derived: true },
      {
        name: "specialties",
        label: "What only this kind of place has",
        labelFor: { field: "type", labels: SPECIALTY_LABEL },
        kind: "enums",
        options: FOOD_SPECIALTIES,
        /* Written group by group, each group a sequence: kept as written, not A to Z. */
        scale: true,
        optionsFor: { field: "type", keep: SPECIALTIES_BY_KIND },
        /* "Other" has no list of its own, so it is never asked, and its step is left out. */
        visibleWhen: { field: "type", values: Object.keys(SPECIALTY_LABEL) },
        span: 2,
        section: "Known for",
        hint: "Only this kind of place is asked these. Travellers read them on its page.",
      },
      {
        name: "priceRange",
        label: "How expensive it feels",
        kind: "enum",
        options: PRICE_RANGES,
        scale: true,
        section: "Prices & policies",
        hint: "$ is a street stall, $$$$ is fine dining.",
      },
      {
        name: "averageMealPrice",
        label: "A meal usually costs",
        kind: "decimal",
        min: 0,
        step: 0.01,
        section: "Prices & policies",
        hint: "What one person spends on an ordinary visit — the figure a traveller budgets by.",
      },
      /* Every named kind says this in its own words; "Other" reads the neutral one. */
      ...priceFor("The lowest a visitor pays for one item. Once the menu has prices, this follows the cheapest by itself."),
      { name: "paymentMethods", label: "Ways to pay", kind: "enums", options: PAYMENT_METHODS, span: 2, section: "Prices & policies" },
      {
        name: "openingHours",
        label: "Opening hours",
        kind: "hours",
        span: 2,
        section: "Prices & policies",
        hint: "For example 07:00-22:00. Leave a day empty when it is closed.",
      },
      ...contact(255),
      { name: "telegram", label: "Telegram", kind: "text", maxLength: 100, section: "Contact", hint: "A handle such as @riversidegrill, or a t.me link." },
      { name: "whatsapp", label: "WhatsApp", kind: "text", maxLength: 50, section: "Contact", hint: "The number WhatsApp answers on, with the country code." },
      { name: "facebookUrl", label: "Facebook page", kind: "text", maxLength: 512, section: "Contact", hint: "Where most places here post today's dishes." },
      { name: "isFeatured", label: "Show this place first", kind: "boolean", section: "Standing", hint: "Featured places lead the lists on the homepage and Explore. Keep it for the few worth crossing town for." },
      { name: "isLocalSpecialty", label: "Known for a local speciality", kind: "boolean", section: "Standing", hint: "A dish this area is known for — the website marks the place with it." },
    ] satisfies readonly ResourceField[]).map(forFoodKind),
  },

  "food-menu-items": {
    key: "food-menu-items",
    label: "Dish",
    labelPlural: "Menu dishes",
    group: "Listings",
    description:
      "The dishes each food listing serves — what a dish is in both languages, what is in it, how spicy it is and what it costs. Written in the listing's own Menu step; the cheapest dish sets its “From” price.",
    titleField: "name",
    searchFields: ["name", "localName"],
    orderField: "sortOrder",
    status: DISH_AVAILABILITY,
    columns: [
      { name: "name", label: "Dish" },
      { name: "foodId", label: "Listing", kind: "ref", ref: "foods", secondary: true },
      { name: "course", label: "Course", secondary: true },
      { name: "price", label: "Price", kind: "number", secondary: true },
      { name: "status", label: "Status", kind: "status" },
    ],
    fields: [
      ref("foodId", "Food listing", "foods", { required: true, section: "Dish" }),
      { name: "name", label: "Dish name", kind: "text", required: true, maxLength: 150, section: "Dish" },
      { name: "localName", label: "Name in Khmer", kind: "text", maxLength: 150, section: "Dish", hint: "What a traveller points at to order: អាម៉ុកត្រី." },
      { name: "pronunciation", label: "How to say it", kind: "text", maxLength: 150, section: "Dish", hint: "Written the way it sounds: “amok trey”." },
      { name: "course", label: "Course", kind: "enum", options: MENU_COURSES, scale: true, required: true, initial: "MAIN", section: "Dish" },
      { name: "description", label: "Describe the dish", kind: "textarea", span: 2, section: "Dish", hint: "How it is cooked and what comes with it." },
      { name: "price", label: "Price", kind: "decimal", min: 0, step: 0.01, section: "Price & portion" },
      { name: "portion", label: "What the price buys", kind: "text", maxLength: 60, section: "Price & portion", hint: "“One bowl”, “300 g”, “Serves 2”." },
      { name: "serves", label: "How many people it feeds", kind: "number", min: 1, max: 20, initial: "1", section: "Price & portion", hint: "1 for a single plate; 2 or more for a dish meant to share." },
      { name: "spiceLevel", label: "How spicy", kind: "number", min: 0, max: 3, initial: "0", section: "Price & portion", hint: "0 not spicy, 1 mild, 2 hot, 3 Khmer hot." },
      { name: "labels", label: "Diet and allergens", kind: "enums", options: DISH_LABELS, span: 2, section: "Diet" },
      { name: "isSignature", label: "The dish they are known for", kind: "boolean", section: "Diet" },
      {
        name: "photoKeys",
        label: "Photos",
        kind: "enums",
        options: [],
        span: 2,
        section: "Photos",
        hint: "Chosen from the listing's gallery, in the food form's Menu step.",
      },
      { name: "sortOrder", label: "Order", kind: "number", min: 0, section: "Placement" },
    ],
  },

  "stay-rooms": {
    key: "stay-rooms",
    label: "Room",
    labelPlural: "Stay rooms",
    group: "Listings",
    description:
      "The rooms each stay offers — who a room sleeps, in which beds, what it has and what a night costs. Made in the stay's own Rooms step; the cheapest room on sale is its “From” price.",
    titleField: "name",
    searchFields: ["name"],
    orderField: "sortOrder",
    status: ROOM_SALE,
    columns: [
      { name: "name", label: "Room" },
      { name: "stayId", label: "Stay", kind: "ref", ref: "stays", secondary: true },
      { name: "roomType", label: "Type", secondary: true },
      { name: "pricePerNight", label: "Per night", kind: "number", secondary: true },
      { name: "status", label: "Status", kind: "status" },
    ],
    fields: [
      ref("stayId", "Stay", "stays", { required: true, section: "Room" }),
      { name: "name", label: "Room name", kind: "text", required: true, maxLength: 150, section: "Room" },
      { name: "highlight", label: "Highlight", kind: "text", maxLength: 150, section: "Room", hint: "One line that makes this room stand out, e.g. Corner room with the sunset over the Mekong." },
      { name: "roomType", label: "Room type", kind: "enum", options: ROOM_TYPES, required: true, initial: "DOUBLE", section: "Room" },
      { name: "roomCount", label: "How many rooms like this", kind: "number", min: 1, max: 500, initial: "1", section: "Room", hint: "Ten identical doubles are one room here, with 10 in this box." },
      ...ROOM_BEDS.map(
        (bed): ResourceField => ({ name: bed.name, label: bed.label, kind: "number", min: 0, max: 20, initial: "0", section: "Beds" }),
      ),
      { name: "maxAdults", label: "Adults", kind: "number", min: 1, max: 40, initial: "2", required: true, section: "Guests" },
      { name: "maxChildren", label: "Children", kind: "number", min: 0, max: 20, initial: "0", section: "Guests" },
      { name: "sizeSqm", label: "Size (m²)", kind: "decimal", min: 1, max: 9999, step: 0.5, section: "Room details" },
      { name: "bedrooms", label: "Bedrooms", kind: "number", min: 0, max: 20, initial: "1", section: "Layout" },
      { name: "livingRooms", label: "Living rooms", kind: "number", min: 0, max: 10, initial: "0", section: "Layout" },
      { name: "bathroomCount", label: "Bathrooms", kind: "number", min: 0, max: 20, initial: "1", section: "Layout" },
      { name: "floor", label: "Floor", kind: "number", min: -2, max: 200, section: "Layout", hint: "Ground floor is 0, first floor up is 1. Leave empty when these rooms are on different floors." },
      { name: "liftAccess", label: "A lift reaches it", kind: "boolean", section: "Layout" },
      { name: "housekeeping", label: "Cleaning", kind: "enum", options: ROOM_HOUSEKEEPING, scale: true, section: "Layout" },
      { name: "view", label: "View", kind: "enum", options: ROOM_VIEWS, section: "Room details" },
      { name: "bathroom", label: "Bathroom", kind: "enum", options: ROOM_BATHROOMS, initial: "PRIVATE", section: "Room details" },
      { name: "smokingAllowed", label: "Smoking allowed", kind: "boolean", section: "Room details" },
      { name: "hasWindow", label: "Has a window", kind: "boolean", initial: "true", section: "Room details" },
      { name: "extraBeds", label: "Extra beds you can add", kind: "number", min: 0, max: 4, initial: "0", section: "Guests" },
      {
        name: "extraBedPrice",
        label: "Extra bed, per night",
        kind: "decimal",
        min: 0,
        step: 0.01,
        section: "Guests",
        visibleWhen: { field: "extraBeds", values: ["1", "2", "3", "4"] },
      },
      { name: "cots", label: "Cots you can add", kind: "number", min: 0, max: 4, initial: "0", section: "Guests" },
      {
        name: "cotPrice",
        label: "Cot, per night",
        kind: "decimal",
        min: 0,
        step: 0.01,
        section: "Guests",
        visibleWhen: { field: "cots", values: ["1", "2", "3", "4"] },
        hint: "Leave empty when a cot is free.",
      },
      { name: "childrenFreeUnderAge", label: "Children stay free under age", kind: "number", min: 0, max: 17, section: "Guests", hint: "In the beds already there. Empty when every child is charged." },
      { name: "amenities", label: "Facilities", kind: "enums", options: ROOM_AMENITIES, span: 2, section: "Facilities" },
      { name: "pricePerNight", label: "Price per night", kind: "decimal", min: 0, step: 0.01, section: "Price & policy" },
      { name: "breakfastIncluded", label: "Breakfast included", kind: "boolean", section: "Price & policy" },
      { name: "highSeasonPrice", label: "High-season price (Nov–Apr)", kind: "decimal", min: 0, step: 0.01, section: "Price & policy", hint: "Leave empty when the price is the same all year." },
      { name: "taxesIncluded", label: "Taxes included in the price", kind: "boolean", initial: "true", section: "Price & policy" },
      { name: "minNights", label: "Shortest stay (nights)", kind: "number", min: 1, max: 60, initial: "1", section: "Price & policy", hint: "1 means a guest can book a single night." },
      { name: "weeklyPrice", label: "Price per week", kind: "decimal", min: 0, step: 0.01, section: "Price & policy", hint: "Leave empty when there is no weekly rate." },
      { name: "monthlyPrice", label: "Price per month", kind: "decimal", min: 0, step: 0.01, section: "Price & policy", hint: "Leave empty when there is no monthly rate." },
      { name: "paymentTerms", label: "Payment", kind: "enum", options: ROOM_PAYMENT_TERMS, scale: true, initial: "PAY_AT_PROPERTY", section: "Price & policy" },
      {
        name: "depositPercent",
        label: "Deposit (% of the stay)",
        kind: "number",
        min: 1,
        max: 100,
        section: "Price & policy",
        visibleWhen: { field: "paymentTerms", values: ["DEPOSIT"] },
      },
      {
        name: "freeCancellationDays",
        label: "Free cancellation (days before arrival)",
        kind: "number",
        min: 0,
        max: 90,
        section: "Price & policy",
        hint: "Empty is non-refundable; 0 is free up to the day of arrival.",
      },
      description,
      {
        name: "photoKeys",
        label: "Photos",
        kind: "enums",
        options: [],
        span: 2,
        section: "Photos",
        hint: "Chosen from the stay's gallery, in the stay form's Rooms step.",
      },
      { name: "sortOrder", label: "Order", kind: "number", section: "Room" },
    ],
  },

  "food-media": {
    key: "food-media",
    label: "Food photo",
    labelPlural: "Food media",
    group: "Listings",
    description: "The photographs shown on a food listing.",
    titleField: "caption",
    searchFields: ["caption"],
    orderField: "sortOrder",
    columns: [
      { name: "mediaUrl", label: "Media", kind: "image" },
      { name: "ownerId", label: "Food listing", kind: "ref", ref: "foods" },
      { name: "caption", label: "Caption", secondary: true },
      { name: "sortOrder", label: "#", kind: "number", secondary: true },
      { name: "isCover", label: "Cover", kind: "boolean", secondary: true },
    ],
    fields: mediaFields(ref("ownerId", "Food listing", "foods", { required: true }), "food"),
  },

  regions: {
    key: "regions",
    label: "Tourism Region",
    labelPlural: "Tourism Regions",
    group: "Catalogue",
    description:
      "The regions travellers discover Cambodia by. Each has its own categories and search filters.",
    titleField: "name",
    searchFields: ["name", "code"],
    /* In the curators' order, 1 to 9: Discover, the theme tiles and every region list follow it. */
    orderField: "sortOrder",
    status: ACTIVE_FLAG,
    /* The zones the provinces sit in share the table, but are not tourism regions: they are chosen on a province. */
    rowsWhere: { field: "kind", values: ["TOURISM"] },
    columns: [
      { name: "name", label: "Name" },
      { name: "code", label: "Code", secondary: true },
      { name: "categoryIds", label: "Categories", kind: "refs", ref: "categories" },
      { name: "tagIds", label: "Search filters", kind: "refs", ref: "tags", secondary: true },
      { name: "status", label: "Status", kind: "status" },
    ],
    /*
     * Only what a region has: its words and its own lists. Its code (the
     * attraction theme it is, and its page's address), its kind and its place
     * are never asked: a new one is a tourism region whose code the API makes
     * from its name, and an edit sends them back as they are.
     */
    fields: [
      { name: "kind", label: "Kind", kind: "enum", options: REGION_KINDS, derived: true, initial: "TOURISM" },
      { name: "code", label: "Code", kind: "text", blank: "null", derived: true },
      ref("parentId", "Part of", "regions", { derived: true }),
      { ...name(), hint: "As the website's Discover page names it. A new region's page address is made from it." },
      {
        name: "sortOrder",
        label: "Its number on Discover",
        kind: "number",
        placeAmong: "kind",
        span: 2,
        hint: "Discover, the attraction form's themes and every list of regions show them in this order. The others move to make room.",
      },
      { ...description, label: "Overview", rich: true, hint: "The lines under its name on its Discover page, under Overview." },
      {
        name: "historyIntro",
        label: "History intro",
        kind: "textarea",
        span: 2,
        visibleWhen: { field: "code", values: ["ANCIENT-CAPITALS"] },
        hint: "The line above its historical coverage on its page. The royal capitals themselves are made under History & Heritage → Historical Coverage.",
      },
      {
        name: "categoryIds",
        label: "Categories",
        kind: "refs",
        ref: "categories",
        span: 2,
        section: "Its own lists",
        ordered: true,
        hint: "What its places are sorted by, in the order its page shows them: move one up or down. Its attractions are offered only these."
      },
      {
        name: "tagIds",
        label: "Search filters",
        kind: "refs",
        ref: "tags",
        span: 2,
        section: "Its own lists",
        ordered: true,
        hint: "The tags its page offers as filters, in the order it shows them, and the only ones its attractions are offered. Ancient Capitals' Century, King, Architecture Style, Religion and Historical Period each ask which on the form.",
      },
    ],
  },

  corridors: {
    key: "corridors",
    label: "Tourism Corridor",
    labelPlural: "Tourism Corridors",
    group: "Catalogue",
    description:
      "Day-by-day travel plans through destinations, with the road route between the stops. Its days and stops are planned in the itinerary builder.",
    titleField: "name",
    searchFields: ["name", "slug", "shortDescription"],
    /* In the curators' order: the website and the Tourism Corridors shelf follow it. */
    orderField: "sortOrder",
    status: CORRIDOR_PUBLICATION,
    columns: [
      { name: "name", label: "Name" },
      { name: "createdBy", label: "Created by", kind: "ref", ref: "users", secondary: true },
      { name: "durationDays", label: "Days", kind: "number", secondary: true },
      { name: "stopCount", label: "Stops", kind: "number", secondary: true },
      { name: "routeStatus", label: "Route", kind: "enum", options: CORRIDOR_ROUTE_STATUSES, secondary: true },
      { name: "isFeatured", label: "Featured", kind: "boolean", secondary: true },
      { name: "status", label: "Status", kind: "status" },
    ],
    fields: [
      name(),
      slug,
      { ...shortDescription, maxLength: 500, hint: "One or two sentences for the corridor's card and the top of its page." },
      description,
      cover("corridor"),
      {
        name: "estimatedBudgetMin",
        label: "Budget from",
        kind: "decimal",
        min: 0,
        step: 1,
        section: "Budget per person (US$)",
        hint: "What the trip costs one traveller, at the least.",
      },
      {
        name: "estimatedBudgetMax",
        label: "Budget up to",
        kind: "decimal",
        min: 0,
        step: 1,
        section: "Budget per person (US$)",
      },
      {
        name: "interestIds",
        label: "Kinds of trip it suits",
        kind: "refs",
        ref: "interests",
        span: 2,
        section: "Where it appears",
        optionGroup: CORRIDOR_INTEREST_GROUP,
        hint: "Interests from the Tourism Corridors group. A traveller browsing one of them on Explore finds this corridor on its page.",
      },
      {
        name: "sortOrder",
        label: "Its place in the list",
        kind: "number",
        placeAmong: "*",
        span: 2,
        section: "Standing",
        hint: "The website lists the corridors top to bottom in this order. The others move to make room.",
      },
      {
        name: "isFeatured",
        label: "Featured",
        kind: "boolean",
        section: "Standing",
        hint: "Marked Featured on its card.",
      },
    ],
  },

  provinces: {
    key: "provinces",
    label: "Province",
    labelPlural: "Provinces",
    group: "Places",
    description: "Cambodia's provinces. A destination is placed by its province.",
    titleField: "name",
    searchFields: ["name", "slug"],
    status: ACTIVE_FLAG,
    columns: [
      { name: "name", label: "Name" },
      { name: "createdBy", label: "Created by", kind: "ref", ref: "users", secondary: true },
      { name: "status", label: "Status", kind: "status" },
    ],
    /* Its name alone: no zone, the API makes its address, and the country is always Cambodia. */
    fields: [{ ...name(), hint: "For example: Kampot." }],
  },

  interests: {
    key: "interests",
    label: "Interest",
    labelPlural: "Interests",
    group: "Places",
    description: "What travellers explore by, in six groups: the Explore shelves and each province's page. A Tourism Corridors interest lists corridors.",
    titleField: "name",
    searchFields: ["name", "slug"],
    groupBy: { field: "groupName", order: INTEREST_GROUPS.map((option) => option.value) },
    /* Numbered within the group: the Explore shelves and each province's page follow it. */
    orderField: "sortOrder",
    status: ACTIVE_FLAG,
    columns: [
      { name: "name", label: "Name" },
      { name: "groupName", label: "Group", secondary: true },
      { name: "sortOrder", label: "#", kind: "number", secondary: true },
      { name: "createdBy", label: "Created by", kind: "ref", ref: "users", secondary: true },
      { name: "status", label: "Status", kind: "status" },
    ],
    /* Compact, with a live preview beside it: name, group, its place in the group, icon. */
    preview: "interest",
    fields: [
      { ...name(), span: 2, hint: "For example: Waterfalls." },
      {
        name: "groupName",
        label: "Group",
        kind: "enum",
        options: INTEREST_GROUPS,
        required: true,
        span: 2,
        hint: "Its shelf under Explore › Interests.",
      },
      {
        name: "sortOrder",
        label: "Place in its group",
        kind: "number",
        placeAmong: "groupName",
        spots: true,
        span: 2,
        hint: "Click between two, or use the arrows. The others move to make room.",
      },
      {
        name: "iconKey",
        label: "Icon",
        kind: "text",
        iconPicker: true,
      },
      { ...description, hint: "Optional. The line under its name on its page." },
    ],
  },

  categories: {
    key: "categories",
    label: "Category",
    labelPlural: "Categories",
    group: "Taxonomy",
    description: "What each tourism region's places are sorted by, such as Temples or Beach. An attraction is offered only its region's own.",
    titleField: "name",
    searchFields: ["name", "slug"],
    status: ACTIVE_FLAG,
    columns: [
      { name: "name", label: "Name" },
      { name: "tourismRegionIds", label: "Tourism regions", kind: "refs", ref: "tourism-regions" },
      { name: "createdBy", label: "Created by", kind: "ref", ref: "users", secondary: true },
      { name: "status", label: "Status", kind: "status" },
    ],
    /* Its regions first, and what they already have. Its web name comes from its name; the list is A to Z. */
    fields: [
      { ...regionsOf("category", "categoryIds"), tiles: true, siblings: true },
      { ...name(), hint: "What a traveller browsing the region looks for, e.g. Temples." },
      { ...description, hint: "Optional. A line on what belongs in it." },
    ],
  },

  tags: {
    key: "tags",
    label: "Tag",
    labelPlural: "Tags",
    group: "Taxonomy",
    description: "The search filters each tourism region offers, such as UNESCO or Kayak. An attraction is offered only its region's own.",
    titleField: "name",
    searchFields: ["name", "slug"],
    status: ACTIVE_FLAG,
    columns: [
      { name: "name", label: "Name" },
      { name: "tourismRegionIds", label: "Tourism regions", kind: "refs", ref: "tourism-regions" },
      { name: "createdBy", label: "Created by", kind: "ref", ref: "users", secondary: true },
      { name: "status", label: "Status", kind: "status" },
    ],
    /* Its regions first, and the tags they already have. */
    fields: [
      { ...regionsOf("tag", "tagIds"), tiles: true, siblings: true },
      { ...name(), hint: "The filter a traveller ticks on the region's page, e.g. Kayak." },
      { ...description, hint: "Optional. A line on when it applies." },
    ],
  },

  "badge-definitions": {
    key: "badge-definitions",
    label: "Badge",
    labelPlural: "Badges",
    group: "Gamification",
    description:
      "What a traveller earns for exploring: browsing, reviewing and collecting stamps. The track and tier follow from how a badge is earned; a new badge gets a period for every season.",
    titleField: "name",
    searchFields: ["name", "code", "track", "tier"],
    status: ACTIVE_FLAG,
    columns: [
      { name: "name", label: "Name" },
      { name: "code", label: "Code", secondary: true },
      { name: "track", label: "Track", kind: "enum", options: BADGE_TRACKS, secondary: true },
      { name: "tier", label: "Tier", kind: "enum", options: BADGE_TIERS },
      { name: "criteriaType", label: "Earned by", kind: "enum", options: BADGE_CRITERIA, secondary: true },
      { name: "criteriaValue", label: "Threshold", kind: "number", secondary: true },
      { name: "status", label: "Status", kind: "status" },
    ],
    fields: [
      name(),
      {
        name: "code",
        label: "Code",
        kind: "text",
        required: true,
        blank: "null",
        hint: "A unique code, e.g. `BROWSER_SILVER`.",
      },
      iconKey,
      description,
      {
        name: "criteriaType",
        label: "Earned by",
        kind: "enum",
        options: BADGE_CRITERIA,
        required: true,
        section: "Criteria",
      },
      {
        name: "criteriaValue",
        label: "Threshold",
        kind: "number",
        min: 1,
        required: true,
        section: "Criteria",
        hint: "How many it takes within one badge period.",
      },
    ],
  },

  "badge-periods": {
    key: "badge-periods",
    label: "Badge period",
    labelPlural: "Badge periods",
    group: "Gamification",
    description:
      "The windows badges are earned in, one per badge per season. Progress starts again when a new period begins. Saving a season rewrites its periods, so change the season rather than one of these.",
    titleField: "name",
    searchFields: ["name"],
    status: ACTIVE_FLAG,
    columns: [
      { name: "name", label: "Name" },
      { name: "badgeId", label: "Badge", kind: "ref", ref: "badge-definitions", secondary: true },
      { name: "startDate", label: "Starts" },
      { name: "endDate", label: "Ends" },
      { name: "status", label: "Status", kind: "status" },
    ],
    fields: [
      name("Period name"),
      ref("badgeId", "Badge", "badge-definitions", { required: true }),
      { name: "startDate", label: "Starts on", kind: "date", required: true, hint: "Inclusive." },
      { name: "endDate", label: "Ends on", kind: "date", required: true, hint: "Inclusive." },
    ],
  },

  seasons: {
    key: "seasons",
    label: "Season",
    labelPlural: "Seasons",
    group: "Gamification",
    description:
      "The tourist calendar: when the high and green seasons run. Saving a season updates every badge's period for it to the same name and dates; deleting one retires those periods. Two seasons on the calendar may not overlap.",
    titleField: "name",
    searchFields: ["name"],
    status: SEASON_STATUS,
    columns: [
      { name: "name", label: "Name" },
      { name: "kind", label: "Kind", kind: "enum", options: SEASON_KINDS, secondary: true },
      { name: "startsOn", label: "Starts" },
      { name: "endsOn", label: "Ends" },
      { name: "status", label: "Status", kind: "status" },
    ],
    fields: [
      name("Season name"),
      { name: "kind", label: "Kind", kind: "enum", options: SEASON_KINDS, required: true, initial: "HIGH" },
      {
        name: "startsOn",
        label: "Starts on",
        kind: "date",
        required: true,
        hint: "Inclusive. No two seasons may start on the same day.",
      },
      {
        name: "endsOn",
        label: "Ends on",
        kind: "date",
        required: true,
        hint: "Inclusive — a season owns its closing day.",
      },
    ],
  },

  "historical-periods": {
    key: "historical-periods",
    label: "Historical period",
    labelPlural: "Historical periods",
    group: "Heritage",
    description:
      "The eras destinations and architecture styles are dated against. Deleting one leaves its styles and timeline entries in no period.",
    titleField: "name",
    searchFields: ["name", "description"],
    orderField: "startYear",
    columns: [
      { name: "name", label: "Name" },
      { name: "startYear", label: "From", kind: "number", secondary: true },
      { name: "endYear", label: "To", kind: "number", secondary: true },
    ],
    /* The era's name — with the ones there already — and its years; no picture, which no page shows. */
    fields: [
      { ...name(), siblings: true, hint: "For example: Funan Period." },
      year("startYear", "Starts in", "Dating"),
      year("endYear", "Ends in", "Dating"),
      { ...description, hint: "Optional. What the era is known for." },
    ],
  },

  monarchs: {
    key: "monarchs",
    label: "King",
    labelPlural: "Kings",
    group: "Heritage",
    description: "The kings a destination is tied to — who built it, or whose reign it belongs to.",
    titleField: "name",
    searchFields: ["name", "title", "description"],
    orderField: "reignStartYear",
    columns: [
      { name: "name", label: "Name" },
      { name: "title", label: "Title", secondary: true },
      { name: "reignStartYear", label: "Reign from", kind: "number", secondary: true },
      { name: "reignEndYear", label: "Reign to", kind: "number", secondary: true },
    ],
    /* The king — with the ones there already — his title and reign; no portrait, which no page shows. */
    fields: [
      { ...name(), siblings: true, hint: "For example: Jayavarman VII." },
      { name: "title", label: "Title", kind: "text", hint: "Shown under the name on each site's page, e.g. King." },
      year("reignStartYear", "Reign began", "Reign"),
      year("reignEndYear", "Reign ended", "Reign"),
      { ...description, hint: "Optional. What the reign is remembered for." },
    ],
  },

  "architecture-styles": {
    key: "architecture-styles",
    label: "Architecture style",
    labelPlural: "Architecture styles",
    group: "Heritage",
    description: "The building styles a destination can be attributed to, each within its historical period.",
    titleField: "name",
    searchFields: ["name", "description"],
    columns: [
      { name: "name", label: "Name" },
      { name: "periodId", label: "Period", kind: "ref", ref: "historical-periods", secondary: true },
    ],
    /* Its era first, as cards with their years and the styles each already has; then its name. */
    fields: [
      ref("periodId", "Historical period", "historical-periods", {
        tiles: true,
        siblings: true,
        hint: "The era the style belongs to.",
      }),
      { ...name(), hint: "For example: Bayon Style." },
      { ...description, hint: "Optional. What sets the style apart." },
    ],
  },

  religions: {
    key: "religions",
    label: "Religion",
    labelPlural: "Religions",
    group: "Heritage",
    description: "The religious traditions a destination is associated with.",
    titleField: "name",
    searchFields: ["name", "description"],
    columns: [
      { name: "name", label: "Name" },
      { name: "iconKey", label: "Icon", secondary: true },
    ],
    /* The faith — with the ones there already; no icon, which no page shows. */
    fields: [{ ...name(), siblings: true, hint: "For example: Buddhism." }, { ...description, hint: "Optional." }],
  },

  /*
   * A tourism region's Historical coverage: its royal capitals, numbered top
   * to bottom on its page — Ishanapura, Mahendraparvata … Chaktomuk.
   */
  "region-coverage": {
    key: "region-coverage",
    label: "Capital",
    labelPlural: "Historical coverage",
    group: "Heritage",
    description:
      "The royal capitals a tourism region's page lists under Historical coverage, top to bottom, each with its dates, era and the site it opens.",
    titleField: "title",
    searchFields: ["title", "titleKm", "dateRange"],
    orderField: "sortOrder",
    siblingNoun: "capitals",
    preview: "coverage",
    columns: [
      { name: "sortOrder", label: "#", kind: "number" },
      { name: "title", label: "Name" },
      { name: "dateRange", label: "Dates", secondary: true },
      { name: "historicalPeriodId", label: "Period", kind: "ref", ref: "historical-periods", secondary: true },
      { name: "destinationId", label: "Opens", kind: "ref", ref: "destinations", secondary: true },
      { name: "regionId", label: "Region", kind: "ref", ref: "tourism-regions", secondary: true },
    ],
    /* Its region first, and where in that region's list it goes; then what the page says of it. */
    fields: [
      ref("regionId", "Tourism region", "tourism-regions", {
        required: true,
        tiles: true,
        siblings: true,
        hint: "Whose page lists it. Ancient Capitals & Khmer Civilization lists its royal capitals.",
      }),
      {
        name: "sortOrder",
        label: "Place in the list",
        kind: "number",
        placeAmong: "regionId",
        span: 2,
        hint: "Top to bottom, oldest first. The others move to make room.",
      },
      { name: "title", label: "Name", kind: "text", required: true, maxLength: 150, hint: "For example: Yasodharapura." },
      { name: "titleKm", label: "Name in Khmer", kind: "text", maxLength: 150, hint: "Shown beside it, e.g. យសោធរបុរី." },
      {
        name: "dateRange",
        label: "Dates",
        kind: "text",
        maxLength: 100,
        hint: "As the page shows them: 802 – c. 835 CE, or 1866 CE – present. Write c. before a year that is not certain.",
      },
      ref("historicalPeriodId", "Historical period", "historical-periods", { tiles: true, hint: "The era its chip names." }),
      { ...description, hint: "One or two sentences: who ruled there, and what it is remembered for." },
      ref("destinationId", "View details opens", "ancient-sites", {
        hint: "Optional. The site its View details link opens; leave it empty when the capital has no page of its own.",
      }),
    ],
  },
  "destination-histories": {
    key: "destination-histories",
    label: "Timeline moment",
    labelPlural: "Timeline moments",
    group: "Heritage",
    description:
      "The moments on each destination's timeline — when it was founded, rebuilt or rediscovered. Only an account that may edit the destination may change its timeline.",
    titleField: "title",
    searchFields: ["title", "description", "historicalPeriodName", "sourceReference"],
    orderField: "eventYear",
    columns: [
      { name: "title", label: "Title" },
      { name: "destinationId", label: "Destination", kind: "ref", ref: "destinations" },
      { name: "historicalPeriodId", label: "Period", kind: "ref", ref: "historical-periods", secondary: true },
      { name: "eventYear", label: "Year", kind: "number", secondary: true },
      { name: "sourceReference", label: "Source", secondary: true },
    ],
    /*
     * The site first — an Ancient Capitals site, with the moments its timeline
     * already has — then its era, what happened and the year. No day-exact
     * dates: a temple's history is told in years.
     */
    siblingNoun: "timeline moments",
    fields: [
      ref("destinationId", "Site", "ancient-sites", {
        required: true,
        tiles: true,
        siblings: true,
        hint: "The Ancient Capitals & Khmer Civilization site whose timeline it goes on.",
      }),
      ref("historicalPeriodId", "Historical period", "historical-periods", { tiles: true, hint: "The era it happened in." }),
      { name: "title", label: "What happened", kind: "text", required: true, span: 2, hint: "For example: Built 1113 – 1150 CE." },
      /* One block: a heading over a lone field of the same name says it twice. */
      { ...year("eventYear", "Year", "When"), section: undefined },
      { ...description, hint: "Optional. The story of that moment." },
      {
        name: "sourceReference",
        label: "Source",
        kind: "text",
        span: 2,
        hint: "Where this comes from — a book, an inscription, a link.",
      },
    ],
  },
};

/** The registry, every field's choices A to Z (see `inAtoZ`). */
export const RESOURCES: Readonly<Record<ResourceKey, ResourceDefinition>> = Object.fromEntries(
  Object.entries(DEFINED).map(([key, definition]) => [key, { ...definition, fields: definition.fields.map(inAtoZ) }]),
) as unknown as Record<ResourceKey, ResourceDefinition>;

export const RESOURCE_KEYS = Object.keys(RESOURCES) as readonly ResourceKey[];

export function isResourceKey(value: string): value is ResourceKey {
  return Object.hasOwn(RESOURCES, value);
}

export function getResource(key: ResourceKey): ResourceDefinition {
  return RESOURCES[key];
}

/** The order the sidebar renders its groups in. */
export const RESOURCE_GROUP_ORDER = [
  "Catalogue",
  "Listings",
  "Places",
  "Taxonomy",
  "Heritage",
  "Gamification",
] as const;

/**
 * Which other lists a screen has to load before it can render.
 *
 * A destination list shows region and province *names*, not ids, and its form
 * needs every option in four dropdowns. Both answers come from walking the
 * declaration rather than from a hand-kept list that goes stale.
 */
export function referencedResources(
  definition: ResourceDefinition,
  include: "columns" | "fields" | "both" = "both",
): readonly ReferenceKey[] {
  const keys = new Set<ReferenceKey>();

  if (include !== "fields") {
    for (const column of definition.columns) {
      if (column.ref) keys.add(column.ref);
    }
  }
  if (include !== "columns") {
    for (const field of definition.fields) {
      if (field.ref) keys.add(field.ref);
    }
  }

  return [...keys];
}
