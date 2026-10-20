import { AMENITY_ICON_OPTIONS } from "@/features/catalog/amenity-icons";
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
  { derived: true, name: "checkInUntil", label: "Latest check-in", kind: "time", section: "House rules", hint: "After this hour nobody can check in. Leave empty if someone is at the desk all night." },
  { derived: true, name: "checkOutFrom", label: "Earliest check-out", kind: "time", section: "House rules", hint: "Only if guests cannot leave before a certain hour. Usually left empty." },
  { derived: true, name: "minCheckInAge", label: "Youngest guest who can check in alone", kind: "number", min: 0, max: 99, section: "House rules", hint: "In years, e.g. 18. Leave empty if there is no such rule." },
  { derived: true, name: "childrenAllowed", label: "Children welcome", kind: "boolean", initial: "true", section: "House rules" },
  { derived: true, name: "petsPolicy", label: "Pets", kind: "enum", options: PETS_POLICIES, scale: true, section: "House rules" },
  { derived: true, name: "smokingPolicy", label: "Smoking", kind: "enum", options: SMOKING_POLICIES, scale: true, section: "House rules" },
  { derived: true, name: "partiesAllowed", label: "Guests may hold parties or events", kind: "boolean", section: "House rules" },
  {
    derived: true,
    name: "quietHours",
    label: "Quiet hours",
    kind: "text",
    maxLength: 20,
    section: "House rules",
    hint: "The hours guests must keep the noise down, e.g. 22:00-07:00. Leave empty if there are none.",
    pattern: { source: "^([01]\\d|2[0-3]):[0-5]\\d-([01]\\d|2[0-3]):[0-5]\\d$", message: "Quiet hours look like 22:00-07:00." },
  },
];

/* No longer asked: breakfast and parking are chips in the facilities list, as the app shows them. Kept as they are on a record. */
const stayServices: readonly ResourceField[] = [
  { derived: true, name: "breakfastOption", label: "Breakfast", kind: "enum", options: BREAKFAST_OPTIONS, scale: true, section: "Services" },
  {
    derived: true,
    name: "breakfastTypes",
    label: "What breakfast is served",
    kind: "enums",
    options: BREAKFAST_TYPES,
    span: 2,
    section: "Services",
    visibleWhen: { field: "breakfastOption", values: ["INCLUDED", "EXTRA_CHARGE"] },
  },
  {
    derived: true,
    name: "breakfastPrice",
    label: "Breakfast price, per person",
    kind: "decimal",
    min: 0,
    step: 0.01,
    section: "Services",
    visibleWhen: { field: "breakfastOption", values: ["EXTRA_CHARGE"] },
  },
  { derived: true, name: "parkingOption", label: "Parking", kind: "enum", options: PARKING_OPTIONS, section: "Services" },
  {
    derived: true,
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
  { derived: true, name: "paymentMethods", label: "Ways to pay", kind: "enums", options: PAYMENT_METHODS, span: 2, section: "Payments", hint: "Travellers from abroad look for cards; most guests here pay with KHQR or cash." },
  { derived: true, name: "languagesSpoken", label: "Languages the staff speak", kind: "enums", options: LANGUAGES, span: 2, section: "Payments", hint: "So a guest knows they can be helped in their own language." },
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
 * nobody buys a meal in a cafe or a plate in a bar.
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

/** A kitchen with no bar serves beer at most; a bar pours everything. */
export const ALCOHOL_BY_KIND: Readonly<Record<string, readonly string[]>> = {
  CAFE: ["NONE", "BEER_WINE", "BRING_YOUR_OWN"],
  STREET_FOOD: ["NONE", "BEER_WINE", "BRING_YOUR_OWN"],
  MARKET: ["NONE", "BEER_WINE"],
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

/** The headings a stay's and a room's amenities are picked under, in the order the Amenities page lists them. */
const AMENITY_GROUPS: readonly EnumOption[] = [
  "Internet", "Parking & transport", "Wellbeing", "Food & drink", "Bathroom", "Comfort",
  "Space & outdoors", "Tech & work", "Safety & access", "Services", "Family & pets", "Accessibility",
].map((group) => ({ value: group, label: group }));

/** Where an amenity is offered — the API's `AmenityLevel`. */
const AMENITY_LEVELS: readonly EnumOption[] = [
  { value: "PROPERTY", label: "At the property" },
  { value: "ROOM", label: "In the room" },
  { value: "BOTH", label: "Both" },
];

/** The breakfasts each kind serves: a homestay cooks Khmer or Asian, not a buffet. */
export const BREAKFAST_BY_KIND: Readonly<Record<string, readonly string[]>> = {
  GUESTHOUSE: ["khmer", "asian", "continental", "american", "vegetarian", "vegan", "halal"],
  HOSTEL: ["khmer", "asian", "continental", "american", "vegetarian", "vegan"],
  HOMESTAY: ["khmer", "asian", "vegetarian"],
  VILLA: ["khmer", "asian", "continental", "american", "vegetarian", "vegan", "halal"],
};

/** Star ratings are official, and only hotels, guesthouses and resorts get one. */
const STAR_RATED = ["HOTEL", "GUESTHOUSE", "RESORT", "OTHER"];

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
 * Where the app puts a region's or a province's marker on its Map screen: a
 * centre, asked as two numbers that go together. The API keeps the current
 * centre when neither is sent and refuses one without the other; every seeded
 * province starts on its capital town.
 *
 * `blankUnless`: the row's flag that says an editor set the centre. A region's
 * answer carries the middle of its places until then, and sending that back
 * would fix it; so the boxes start empty and the API goes on following the
 * places. `whenEmpty` says so under the box.
 */
const centre = (noun: string, follows: { readonly blankUnless?: string; readonly whenEmpty?: string } = {}): readonly ResourceField[] => [
  {
    name: "latitude",
    label: "Latitude",
    kind: "decimal",
    min: -90,
    max: 90,
    step: 0.000001,
    section: "Map",
    pairedWith: "longitude",
    blankUnless: follows.blankUnless,
    hint: `Both or neither: the marker the app puts on the ${noun}. Decimal degrees, north positive.${follows.whenEmpty ? ` ${follows.whenEmpty}` : ""}`,
  },
  {
    name: "longitude",
    label: "Longitude",
    kind: "decimal",
    min: -180,
    max: 180,
    step: 0.000001,
    section: "Map",
    pairedWith: "latitude",
    blankUnless: follows.blankUnless,
    hint: "Decimal degrees, east positive. Cambodia lies between 102 and 108.",
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

/** The same two price fields, with the hint written for the kind of listing. The from-price is never asked: the API sets it from the cheapest room or dish. */
const priceFor = (hint: string): readonly ResourceField[] =>
  pricing.map((field) => (field.name === "priceFrom" ? { ...field, hint } : field));

const pricing: readonly ResourceField[] = [
  {
    derived: true,
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
  /* The address sits beside the province, under the map. */
  if (field.name === "address") return { ...field, span: 1 };
  return field.name === "longitude" ? { ...field, required: true } : field;
});

/**
 * Where a stay or a food listing shows in Explore: the interests of its own
 * shelf (Stays, Food), each of whose pages lists it next to the destinations.
 * The one matching its type is chosen for it, when such an interest exists.
 */
const shelfInterests = (group: "Stays" | "Food", noun: string): ResourceField => ({
  name: "interestIds",
  /* The type IS the interest: the taxonomy's shelf, which the app browses by. The API's own kind follows from the first one (see kindOf). */
  label: "Type",
  kind: "refs",
  ref: "interests",
  span: 2,
  required: true,
  section: "Classification",
  optionGroup: group,
  hint: `What travellers browse by: a traveller looking for one of these finds this ${noun} on its page. Tick every one that fits.`,
});

const STAY_INTERESTS = shelfInterests("Stays", "stay");
const FOOD_INTERESTS = shelfInterests("Food", "place");


const listingName: ResourceField = { ...name(), maxLength: 255, span: 2 };
const listingSlug: ResourceField = { ...slug, maxLength: 150 };
/* The quote at the top of a listing's page on the app, and who said it: the same on every kind of listing. */
const listingSlogan: ResourceField = {
  name: "slogan",
  label: "Slogan",
  kind: "text",
  maxLength: 300,
  span: 2,
  hint: "One line someone said about it. The app quotes it at the top of the page, e.g. “Angkor Wat, the crown jewel of Cambodia, emanates history and awe in equal measure.”",
};
const listingSloganBy: ResourceField = {
  name: "sloganBy",
  label: "Said by",
  kind: "text",
  maxLength: 120,
  hint: "Optional. Who said it, e.g. Gail Gutradt, shown under the quote. Leave it empty for a slogan of its own.",
};
/* The province a stay or a food listing is in: filled from its pin, never what finds it. */
const pinProvince: ResourceField = ref("provinceId", "Province", "provinces", {
  section: "Placement",
  hint: "Filled in from the map pin, for you to check. Travellers find this listing by its pin, not by the province.",
});
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
    /* As the All Destinations table reads: the place under the name, no column of its own. */
    columns: [
      { name: "name", label: "Name", detail: { text: "address", ref: { field: "provinceId", resource: "provinces" } } },
      { name: "createdBy", label: "Created by", kind: "ref", ref: "users", secondary: true },
      { name: "verified", label: "Verified", kind: "verified", secondary: true },
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
      listingSlogan,
      listingSloganBy,
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
      /* Its address sits beside its province, under the map. */
      ...location.map((field): ResourceField => (field.name === "address" ? { ...field, span: 1 } : field)),
    ] satisfies readonly ResourceField[],
  },

  "destination-media": {
    key: "destination-media",
    label: "Destination photo",
    labelPlural: "Media Library",
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
      { name: "name", label: "Name", detail: { text: "address", ref: { field: "provinceId", resource: "provinces" } } },
      { name: "ownerUserId", label: "Created by", kind: "ref", ref: "users", secondary: true },
      { name: "verified", label: "Verified", kind: "verified", secondary: true },
      { name: "type", label: "Type", kind: "enum", options: STAY_TYPES, secondary: true },
      { name: "status", label: "Status", kind: "status" },
    ],
    /*
     * Ordered the way a property is described, and the way a guest reads one:
     * what it is, where it is, what it offers, what it looks like, what it
     * costs and how to reach it. The same words for every kind of property.
     */
    fields: [
      listingName,
      /* Never asked: it follows the first Type ticked (see kindOf). The names stay for the API's lists. */
      { name: "type", label: "Kind (API)", kind: "enum", options: STAY_TYPES, derived: true },
      {
        name: "starRating",
        label: "Star rating",
        kind: "number",
        min: 1,
        max: 5,
        hint: "One to five, for a hotel or resort with an official rating. Leave it empty otherwise.",
        visibleWhen: { field: "type", values: STAR_RATED },
      },
      listingShortDescription,
      {
        ...description,
        label: "About",
        rich: true,
        hint: "The full story: who runs it, what the rooms and the place are like, what is nearby. The app shows its first lines on the page and all of it under Read more.",
      },
      listingSlogan,
      listingSloganBy,
      STAY_INTERESTS,
      ref("ownerUserId", "Owner account", "users", {
        section: "Placement",
        hint: "The account this stay is listed for — the partner, or the contributor who looks after it. Leave it empty when your own team does; whoever writes their own is filled in for them.",
      }),
      pinProvince,
      ...pinnedLocation,
      /* No longer asked. Kept as it is on a record: the API writes the list from every save. */
      { name: "specialties", label: "Specialties", kind: "enums", options: [], derived: true },
      {
        name: "amenities",
        label: "Facilities",
        kind: "enums",
        options: [],
        /* The amenities taxonomy, as offered at the property. */
        ref: "amenities",
        offeredAt: "PROPERTY",
        span: 2,
        section: "Facilities",
        hint: "Everything a guest can use. Guests filter stays by these, so tick only what is really there. The list itself is kept under Taxonomy › Amenities.",
      },
      { ...cover("stay"), derived: true },
      ...priceFor("The lowest a guest pays for one night. Once the rooms have prices, this follows the cheapest room by itself.").map((field): ResourceField => (field.name === "currency" ? { ...field, derived: true } : field)),
      {
        derived: true, name: "checkInFrom",
        label: "Earliest check-in",
        kind: "time",
        section: "Prices & policies",
        hint: "The time the first guest can arrive, e.g. 14:00 (2 pm).",
      },
      { derived: true, name: "checkOutUntil", label: "Latest check-out", kind: "time", section: "Prices & policies", hint: "The time rooms must be free by, e.g. 12:00 (midday)." },
      ...contact(512),
      ...stayTrust,
      ...stayServices.map((field): ResourceField =>
        field.name === "breakfastTypes" ? { ...field, optionsFor: { field: "type", keep: BREAKFAST_BY_KIND } } : field,
      ),
      ...stayRules,
      ...stayPayments,
      /* The policies in the host's own words, as Markdown; the app shows it under Stay policies. The one-box-per-rule fields above are kept, never asked. */
      {
        name: "policies",
        label: "Stay policies",
        kind: "textarea",
        rich: true,
        span: 2,
        section: "House rules",
        hint: "Check-in and check-out times, children, pets, smoking, how guests can pay — in your own words. Headings and lists come through.",
      },
    ] satisfies readonly ResourceField[],
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
      { name: "name", label: "Name", detail: { text: "address", ref: { field: "provinceId", resource: "provinces" } } },
      { name: "createdBy", label: "Created by", kind: "ref", ref: "users", secondary: true },
      { name: "verified", label: "Verified", kind: "verified", secondary: true },
      { name: "type", label: "Type", kind: "enum", options: FOOD_TYPES, secondary: true },
      { name: "status", label: "Status", kind: "status" },
    ],
    /*
     * One place that sells food, asked the same short set of questions — what
     * it is, where it is and what it costs — in the same
     * words whatever kind of place it is.
     */
    fields: [
      listingName,
      /* The end of the listing's web address, as on an attraction. */
      listingSlug,
      /* Never asked: it follows the first Type ticked (see kindOf). The names stay for the API's lists. */
      { name: "type", label: "Kind (API)", kind: "enum", options: FOOD_TYPES, derived: true },
      listingShortDescription,
      {
        ...description,
        label: "About",
        rich: true,
        hint: "The full story: what it serves, what it is like inside, when to come. The app shows its first lines on the page and all of it under Read more.",
      },
      listingSlogan,
      listingSloganBy,
      FOOD_INTERESTS,
      ref("ownerUserId", "Owner account", "users", {
        section: "Placement",
        hint: "The account this listing is listed for — the partner, or the contributor who looks after it. Leave it empty when your own team does; whoever writes their own is filled in for them.",
      }),
      pinProvince,
      ...pinnedLocation,
      { ...cover("food"), derived: true },
      /* No longer asked. Kept as it is on a record: the API writes the list from every save. */
      { name: "specialties", label: "Specialties", kind: "enums", options: [], derived: true },
      {
        name: "priceRange",
        label: "Price range",
        kind: "enum",
        options: PRICE_RANGES,
        scale: true,
        section: "Prices & policies",
        hint: "$ is a street stall, $$$$ is fine dining.",
      },
      {
        derived: true,
        name: "averageMealPrice",
        label: "A meal usually costs",
        kind: "decimal",
        min: 0,
        step: 0.01,
        section: "Prices & policies",
        hint: "What one person spends on an ordinary visit — the figure a traveller budgets by.",
      },
      ...priceFor("The lowest a visitor pays for one item. Set by the API, never asked here.").map((field): ResourceField => (field.name === "currency" ? { ...field, derived: true } : field)),
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
      /* "Known for a local speciality" is no longer asked; the API keeps a record's value when it is not sent. */
    ] satisfies readonly ResourceField[],
  },

  "food-menu-items": {
    key: "food-menu-items",
    label: "Dish",
    labelPlural: "Menu dishes",
    group: "Listings",
    description:
      "The dishes each food listing serves — what a dish is in both languages, what is in it, how spicy it is and what it costs. The listing form no longer asks for them; the API keeps what was written.",
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
      { derived: true, name: "pronunciation", label: "How to say it", kind: "text", maxLength: 150, section: "Dish", hint: "Written the way it sounds: “amok trey”." },
      /* The course is the API's fixed heading; it is kept filled but no longer chosen. The host's own heading is the category. */
      { name: "course", label: "Course", kind: "enum", options: MENU_COURSES, scale: true, required: true, initial: "MAIN", section: "Dish" },
      { name: "description", label: "Describe the dish", kind: "textarea", span: 2, section: "Dish", hint: "How it is cooked and what comes with it." },
      { name: "price", label: "Price", kind: "decimal", min: 0, step: 0.01, section: "Price & portion" },
      { derived: true, name: "portion", label: "What the price buys", kind: "text", maxLength: 60, section: "Price & portion", hint: "“One bowl”, “300 g”, “Serves 2”." },
      { derived: true, name: "serves", label: "How many people it feeds", kind: "number", min: 1, max: 20, initial: "1", section: "Price & portion", hint: "1 for a single plate; 2 or more for a dish meant to share." },
      { derived: true, name: "spiceLevel", label: "How spicy", kind: "number", min: 0, max: 3, initial: "0", section: "Price & portion", hint: "0 not spicy, 1 mild, 2 hot, 3 Khmer hot." },
      { derived: true, name: "labels", label: "Diet and allergens", kind: "enums", options: DISH_LABELS, span: 2, section: "Diet" },
      { derived: true, name: "isSignature", label: "The dish they are known for", kind: "boolean", section: "Diet" },
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
      /* The paragraph on the room's page: Markdown, like a listing's About. */
      { name: "description", label: "About this room", kind: "textarea", rich: true, span: 2, section: "Room", hint: "What the room is like and what makes it the one to choose. The room's page shows all of it." },
      { derived: true, name: "highlight", label: "Highlight", kind: "text", maxLength: 150, section: "Room", hint: "One line that makes this room stand out, e.g. Corner room with the sunset over the Mekong." },
      { name: "roomType", label: "Room type", kind: "enum", options: ROOM_TYPES, required: true, initial: "DOUBLE", section: "Room" },
      { derived: true, name: "roomCount", label: "How many rooms like this", kind: "number", min: 1, max: 500, initial: "1", section: "Room", hint: "Ten identical doubles are one room here, with 10 in this box." },
      ...ROOM_BEDS.map(
        (bed): ResourceField => ({ name: bed.name, label: bed.label, kind: "number", min: 0, max: 20, initial: "0", section: "Beds" }),
      ),
      { name: "maxAdults", label: "Adults", kind: "number", min: 1, max: 40, initial: "2", required: true, section: "Guests" },
      { name: "maxChildren", label: "Children", kind: "number", min: 0, max: 20, initial: "0", section: "Guests" },
      { derived: true, name: "sizeSqm", label: "Size (m²)", kind: "decimal", min: 1, max: 9999, step: 0.5, section: "Room details" },
      { derived: true, name: "bedrooms", label: "Bedrooms", kind: "number", min: 0, max: 20, initial: "1", section: "Layout" },
      { derived: true, name: "livingRooms", label: "Living rooms", kind: "number", min: 0, max: 10, initial: "0", section: "Layout" },
      { derived: true, name: "bathroomCount", label: "Bathrooms", kind: "number", min: 0, max: 20, initial: "1", section: "Layout" },
      { derived: true, name: "floor", label: "Floor", kind: "number", min: -2, max: 200, section: "Layout", hint: "Ground floor is 0, first floor up is 1. Leave empty when these rooms are on different floors." },
      { derived: true, name: "liftAccess", label: "A lift reaches it", kind: "boolean", section: "Layout" },
      { derived: true, name: "housekeeping", label: "Cleaning", kind: "enum", options: ROOM_HOUSEKEEPING, scale: true, section: "Layout" },
      { derived: true, name: "view", label: "View", kind: "enum", options: ROOM_VIEWS, section: "Room details" },
      { derived: true, name: "bathroom", label: "Bathroom", kind: "enum", options: ROOM_BATHROOMS, initial: "PRIVATE", section: "Room details" },
      { derived: true, name: "smokingAllowed", label: "Smoking allowed", kind: "boolean", section: "Room details" },
      { derived: true, name: "hasWindow", label: "Has a window", kind: "boolean", initial: "true", section: "Room details" },
      { derived: true, name: "extraBeds", label: "Extra beds you can add", kind: "number", min: 0, max: 4, initial: "0", section: "Guests" },
      {
        derived: true, name: "extraBedPrice",
        label: "Extra bed, per night",
        kind: "decimal",
        min: 0,
        step: 0.01,
        section: "Guests",
        visibleWhen: { field: "extraBeds", values: ["1", "2", "3", "4"] },
      },
      { derived: true, name: "cots", label: "Cots you can add", kind: "number", min: 0, max: 4, initial: "0", section: "Guests" },
      {
        derived: true, name: "cotPrice",
        label: "Cot, per night",
        kind: "decimal",
        min: 0,
        step: 0.01,
        section: "Guests",
        visibleWhen: { field: "cots", values: ["1", "2", "3", "4"] },
        hint: "Leave empty when a cot is free.",
      },
      { derived: true, name: "childrenFreeUnderAge", label: "Children stay free under age", kind: "number", min: 0, max: 17, section: "Guests", hint: "In the beds already there. Empty when every child is charged." },
      { name: "amenities", label: "Facilities", kind: "enums", options: [], ref: "amenities", offeredAt: "ROOM", span: 2, section: "Facilities" },
      { name: "pricePerNight", label: "Price per night", kind: "decimal", min: 0, step: 0.01, section: "Price & policy" },
      { name: "weekendPrice", label: "Weekend price", kind: "decimal", min: 0, step: 0.01, section: "Price & policy", hint: "What a Friday or Saturday night costs. Leave it empty when the price is the same all week." },
      { name: "breakfastIncluded", label: "Breakfast included", kind: "boolean", section: "Price & policy" },
      { derived: true, name: "highSeasonPrice", label: "High-season price (Nov–Apr)", kind: "decimal", min: 0, step: 0.01, section: "Price & policy", hint: "Leave empty when the price is the same all year." },
      { derived: true, name: "taxesIncluded", label: "Taxes included in the price", kind: "boolean", initial: "true", section: "Price & policy" },
      { derived: true, name: "minNights", label: "Shortest stay (nights)", kind: "number", min: 1, max: 60, initial: "1", section: "Price & policy", hint: "1 means a guest can book a single night." },
      { derived: true, name: "weeklyPrice", label: "Price per week", kind: "decimal", min: 0, step: 0.01, section: "Price & policy", hint: "Leave empty when there is no weekly rate." },
      { derived: true, name: "monthlyPrice", label: "Price per month", kind: "decimal", min: 0, step: 0.01, section: "Price & policy", hint: "Leave empty when there is no monthly rate." },
      { derived: true, name: "paymentTerms", label: "Payment", kind: "enum", options: ROOM_PAYMENT_TERMS, scale: true, initial: "PAY_AT_PROPERTY", section: "Price & policy" },
      {
        derived: true, name: "depositPercent",
        label: "Deposit (% of the stay)",
        kind: "number",
        min: 1,
        max: 100,
        section: "Price & policy",
        visibleWhen: { field: "paymentTerms", values: ["DEPOSIT"] },
      },
      {
        derived: true, name: "freeCancellationDays",
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
      { ...cover("region", "Cover picture"), hint: "Its card on Explore and the banner of its page in the app. A wide photograph of the region's best-known place reads best." },
      {
        name: "mapKey",
        urlField: "mapUrl",
        label: "Map picture",
        kind: "image",
        imageCategory: "region",
        span: 2,
        section: "Media",
        hint: "The Map panel on its page in the app: one picture where the interactive map of its places used to be. A map of the region with its places marked reads best.",
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
        hint: "The tags its page offers as filters, in the order it shows them, and the only ones its attractions are offered. A tag is a plain label with nothing under it.",
      },
      {
        name: "amsRecommended",
        label: "Recommended by AMS Travel",
        kind: "boolean",
        boxed: true,
        span: 2,
        section: "Recommendation",
        hint: "Shows the AMS Travel badge on its card on Explore and at the top of its page in the app.",
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
    ],
  },

  "corridor-media": {
    key: "corridor-media",
    label: "Corridor photo",
    labelPlural: "Corridor media",
    group: "Catalogue",
    description: "The photographs shown on a tourism corridor's page in the app, one of them its cover.",
    titleField: "caption",
    searchFields: ["caption"],
    orderField: "sortOrder",
    columns: [
      { name: "mediaUrl", label: "Media", kind: "image" },
      { name: "ownerId", label: "Tourism corridor", kind: "ref", ref: "corridors" },
      { name: "caption", label: "Caption", secondary: true },
      { name: "sortOrder", label: "#", kind: "number", secondary: true },
      { name: "isCover", label: "Cover", kind: "boolean", secondary: true },
    ],
    fields: mediaFields(ref("ownerId", "Tourism corridor", "corridors", { required: true }), "corridor"),
  },

  provinces: {
    key: "provinces",
    label: "Province",
    labelPlural: "Provinces",
    group: "Places",
    description: "Cambodia's provinces. A destination is placed by its province; the app lists them with a cover and puts each on its map by its centre.",
    titleField: "name",
    searchFields: ["name", "slug"],
    status: ACTIVE_FLAG,
    columns: [
      { name: "name", label: "Name" },
      { name: "placeCount", label: "Places", kind: "number", secondary: true },
      { name: "createdBy", label: "Created by", kind: "ref", ref: "users", secondary: true },
      { name: "status", label: "Status", kind: "status" },
    ],
    /* Its name, its picture and its centre: no zone, the API makes its address, and the country is always Cambodia. */
    fields: [
      { ...name(), hint: "For example: Kampot." },
      { ...cover("province", "Cover picture"), hint: "Its card on the app's list of provinces and the top of its page. A wide photograph of its best-known place reads best." },
      ...centre("province"),
    ],
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
    /* Compact, with a live preview beside it: name, group, its place in the group, picture. */
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
      { ...description, hint: "Optional. The line under its name on its page." },
      { ...cover("interest", "Cover picture"), hint: "Its picture on its shelf and at the top of its page. A clear photograph of the activity reads best." },
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

  amenities: {
    key: "amenities",
    label: "Amenity",
    labelPlural: "Amenities",
    group: "Taxonomy",
    description:
      "What a stay offers — a pool, free Wi-Fi, a hairdryer — at the property, in the room, or both. The stay form's Facilities and a room's Amenities read this one list.",
    titleField: "name",
    searchFields: ["name", "slug", "groupName"],
    groupBy: { field: "groupName", order: AMENITY_GROUPS.map((option) => option.value) },
    /* Numbered within the group: the pickers and the apps list them in this order. */
    orderField: "sortOrder",
    status: ACTIVE_FLAG,
    columns: [
      { name: "name", label: "Name" },
      { name: "groupName", label: "Group", secondary: true },
      { name: "level", label: "Offered", kind: "enum", options: AMENITY_LEVELS },
      { name: "iconKey", label: "Icon", secondary: true },
      { name: "sortOrder", label: "#", kind: "number", secondary: true },
      { name: "status", label: "Status", kind: "status" },
    ],
    fields: [
      { ...name(), span: 2, hint: "For example: Rooftop pool. Renaming keeps the link name, so saved stays keep their tick." },
      {
        name: "groupName",
        label: "Group",
        kind: "enum",
        options: AMENITY_GROUPS,
        required: true,
        span: 2,
        hint: "The heading it is picked under.",
      },
      {
        name: "level",
        label: "Offered",
        kind: "enum",
        options: AMENITY_LEVELS,
        scale: true,
        required: true,
        initial: "PROPERTY",
        span: 2,
        hint: "At the property: every guest can use it, whatever room they book. In the room: it differs room by room. Both: the hotel has it, and a room can say so too.",
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
        kind: "enum",
        options: AMENITY_ICON_OPTIONS,
        span: 2,
        hint: "The small picture beside its name on the apps. None draws a tick.",
      },
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
      if (column.detail?.ref) keys.add(column.detail.ref.resource);
    }
  }
  if (include !== "columns") {
    for (const field of definition.fields) {
      if (field.ref) keys.add(field.ref);
    }
  }

  return [...keys];
}
