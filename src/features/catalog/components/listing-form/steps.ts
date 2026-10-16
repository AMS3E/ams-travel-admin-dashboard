import {
  FileText,
  ImagePlus,
  ListChecks,
  MapPin,
  Phone,
  Rocket,
  Sparkles,
  Tags,
  ChefHat,
  type LucideIcon,
} from "lucide-react";
import type {
  FieldValue,
  ResourceDefinition,
  ResourceKey,
} from "@/features/catalog/resource";

/**
 * The listing forms — a destination, a stay, a food — as one page of sections,
 * in the order a host would think about them.
 *
 * Each section (a "step" in these names: the form was once walked one at a
 * time) covers one question (what kind of place, where, what it offers, how it
 * looks, what it costs), holds the registry's fields for that question in a
 * few small groups, and carries one tip. The fields themselves still come from
 * the registry: a step only names them, so validation and the request body are
 * unchanged, and a field added to the registry but not placed here still
 * appears, in a "More details" section.
 */

export type ListingKey = "destinations" | "stays" | "foods";

export function isListing(key: ResourceKey): key is ListingKey {
  return key === "destinations" || key === "stays" || key === "foods";
}

/** The photo set each listing hangs off: its gallery rows. */
export const LISTING_GALLERIES: Readonly<Record<ListingKey, ResourceKey>> = {
  destinations: "destination-media",
  stays: "stay-media",
  foods: "food-media",
};

/** A row with a photo set of its own: the three listings, and a tourism corridor. */
export type GalleryOwner = ListingKey | "corridors";

/** Every gallery the photos box fills: the listings' and the corridor's. */
export const GALLERIES: Readonly<Record<GalleryOwner, ResourceKey>> = {
  ...LISTING_GALLERIES,
  corridors: "corridor-media",
};

export interface StepGroup {
  readonly title?: string;
  readonly description?: string;
  readonly fields: readonly string[];
  /**
   * `one`: a single column, every field the full width — a name and its web
   * address, a phone number and an e-mail under each other. Otherwise two
   * equal columns.
   */
  readonly columns?: "one";
  /** The stay's rooms block follows this group. */
  readonly rooms?: true;
}

export interface ListingStep {
  readonly id: string;
  /** The section's heading, and its name in the checklist. */
  readonly title: string;
  /** The section asked as a question. Kept with its words; the one-page form shows the title instead. */
  readonly question: string;
  readonly description: string;
  readonly icon: LucideIcon;
  readonly tip: { readonly title: string; readonly body: string };
  readonly groups: readonly StepGroup[];
  /**
   * The navigator's lines for this section, in page order, each a field to
   * jump to. When absent, the section's checks stand in for them.
   */
  readonly places?: readonly NavPlace[];
  /** The last section: whether it goes live, and what is still missing. */
  readonly review?: boolean;
}

/** One line of the navigator beside the form: a place on the page, and the field it scrolls to. */
export interface NavPlace {
  readonly label: string;
  readonly field: string;
}

/** One line of the checklist — beside the form and in its last section — and the fields it looks at. */
export interface ReadinessCheck {
  readonly label: string;
  readonly fields: readonly string[];
  /**
   * The fields are values the form keeps for itself rather than registry
   * fields — the number of rooms made in the Rooms step — so no step holds
   * them and the check stands although the registry does not declare them.
   */
  readonly virtual?: boolean;
  /** The section the check belongs to, for a virtual check no field leads to. */
  readonly step?: string;
  /** Needs every field, rather than any one of them. */
  readonly all?: boolean;
  /** For a line reworded per kind of place (see FOOD_CHECK_WORDS, STAY_CHECK_WORDS). */
  readonly id?: "price" | "own" | "rooms";
  readonly required?: boolean;
}

/** The quote at the top of the page, with who said it: asked on every kind of listing. */
const SLOGAN_GROUP: StepGroup = { title: "Slogan", description: "A quote the app shows at the top of the page, with who said it if anyone did.", fields: ["slogan", "sloganBy"] };

/** `has`: whether this kind of listing carries a web address (slug). */
const about = (noun: string, has: { readonly slug?: boolean } = {}): ListingStep => ({
  id: "about",
  /* "Details", not "About": the app's word About is the long text's, and the section holds more than it. */
  title: "Details",
  question: `What's this ${noun} called, and what's it like?`,
  description: "A name, and the full story.",
  icon: FileText,
  tip: {
    title: "Write for a first-time visitor",
    body: "Lead with what makes it worth the trip. The app shows the first lines on the page; the rest opens under Read more.",
  },
  groups: [
    /* The name takes the row, its web address under it. */
    { fields: ["name", ...(has.slug ? ["slug"] : [])], columns: "one" },
    SLOGAN_GROUP,
    { fields: ["description"] },
  ],
  /* What the navigator lists under Details: the three things written here, whether or not they are checks. */
  places: [
    { label: "Name", field: "name" },
    { label: "Slogan", field: "slogan" },
    { label: "About", field: "description" },
  ],
});

/**
 * Where it is, for every kind of listing: the link box, the map, and the
 * province and address the pin fills in. `found` says how travellers come
 * across this kind — a stay or a food listing by its pin, not by a page.
 */
const locationStep = (noun: string, found?: string): ListingStep => ({
  id: "location",
  title: "Location",
  question: "Where is it?",
  description: `Paste the ${noun}'s Google Maps link, or find it on the map. Its province and address are filled in from the pin, for you to check.`,
  icon: MapPin,
  tip: {
    title: "Putting the pin on the place",
    body: `${found ? `${found} ` : ""}Copy the ${noun}'s link in Google Maps (Share, then Copy link) and paste it here, or search it by name. Then switch to Satellite and drag the pin onto the entrance. At the place with a phone? Use the crosshair on the map. A pair of coordinates typed into the box works too.`,
  },
  /* One group, no line between: the map first, and under it the province and the address the pin fills in. */
  groups: [{ fields: ["latitude", "longitude", "provinceId", "address"] }],
});

/** Who runs a stay or a food listing and how travellers reach it: the same three groups, every box the full width. */
const contact = (noun: string): ListingStep => ({
  id: "contact",
  title: "Contact",
  question: "Who runs it, and how do travellers get in touch?",
  description: "Who looks after this listing, and the ways to reach it.",
  icon: Phone,
  tip: {
    title: "One number that answers",
    body: "A number that is answered beats three that are not. Put the one travellers should use, and the chat app it is on.",
  },
  groups: [
    { title: "Who runs it", fields: ["ownerUserId"], columns: "one" },
    { title: "Contact details", description: "Shown on the listing so travellers can ask before they go.", fields: ["phone", "contactEmail", "website"], columns: "one" },
    {
      title: "Messaging apps",
      description: `Most travellers in Cambodia ask on Telegram or WhatsApp first; the ${noun}'s page opens a chat.`,
      fields: ["telegram", "whatsapp", "facebookUrl"],
      columns: "one",
    },
  ],
  places: [
    { label: "Who runs it", field: "ownerUserId" },
    { label: "Contact details", field: "phone" },
    { label: "Messaging apps", field: "telegram" },
  ],
});

const photos = (noun: string): ListingStep => ({
  id: "photos",
  title: "Photos",
  question: "Show it at its best",
  description: `Every photo travellers can page through. The cover is the first thing they see of this ${noun} — on cards, in search, and across the top of its page: choose it among them.`,
  icon: ImagePlus,
  tip: {
    title: "What makes a great cover",
    body: "A bright landscape photo of the place itself, with no text, logos or collages. 1600 × 900 pixels or larger stays sharp everywhere.",
  },
  /* No field of its own: the gallery is the section, and the cover is one of its photos. */
  groups: [],
});

const review: ListingStep = {
  id: "review",
  title: "Review",
  question: "Ready to go live?",
  description: "Check what is still missing. Publishing and saving are the buttons at the top.",
  icon: Rocket,
  tip: {
    title: "Nothing here is final",
    body: "A published listing appears on the website straight away. A draft stays in the dashboard until it is published, and either can be changed later.",
  },
  /* No field of its own: the checklist is the section. */
  groups: [],
  review: true,
};

const STEPS: Readonly<Record<ListingKey, readonly ListingStep[]>> = {
  destinations: [
    about("place", { slug: true }),
    /* Photos right after the words: the cover is the first thing a traveller sees. */
    photos("place"),
    locationStep("place"),
    {
      id: "classification",
      title: "Where it appears",
      question: "What kind of place is it?",
      description: "Its tourism region with that region's own categories and tags, then the interests travellers find it under.",
      icon: Tags,
      tip: {
        title: "One region, its own lists",
        body: "Choose the region the place is best known for. Only that region's categories and tags are offered, and the place is listed on its Discover page. Interests are separate: tick what a traveller comes for, whatever the region.",
      },
      groups: [
        { title: "Tourism region", fields: ["tourismRegionIds"] },
        { title: "Categories", fields: ["categoryIds"] },
        /* The region's own tags, with no heading of their own. */
        { fields: ["tagIds"] },
        { title: "Interests", description: "The Interests tab and province pages it is listed under.", fields: ["interestIds"] },
      ],
      places: [
        { label: "Tourism region", field: "tourismRegionIds" },
        { label: "Categories", field: "categoryIds" },
        { label: "Tags", field: "tagIds" },
        { label: "Interests", field: "interestIds" },
      ],
    },
    review,
  ],

  stays: [
    about("stay"),
    photos("stay"),
    locationStep("stay", "Travellers see this stay on the page of every destination within 50 km of its pin — a hotel in Siem Reap on Angkor Wat's page, say."),
    contact("stay"),
    {
      id: "facilities",
      title: "Rooms & facilities",
      question: "What is the property, and what does it offer?",
      description: "The type of property, its facilities and policies, and each kind of room once.",
      icon: Sparkles,
      tip: {
        title: "Only list what is there",
        body: "A guest who chooses a stay for its pool expects to find one. Leave out anything seasonal or on request. Add each kind of room once; copy a room to make the next one like it, and mark one unavailable instead of deleting it.",
      },
      groups: [
        /* The type first — the Stays shelf of the taxonomy — then the stars: the type decides which rooms the stay is offered later. */
        { fields: ["interestIds"] },
        { fields: ["starRating"] },
        /* Breakfast and parking are chips in this list, as the app shows them; the rooms follow the list. */
        { fields: ["amenities"], rooms: true },
        { title: "Stay policies", description: "Check-in and check-out, children, pets, smoking, how guests pay — written out, the way the app shows them.", fields: ["policies"] },
      ],
      places: [
        { label: "Type", field: "interestIds" },
        { label: "Star rating", field: "starRating" },
        { label: "Facilities", field: "amenities" },
        { label: "Rooms", field: "rooms" },
        { label: "Stay policies", field: "policies" },
      ],
    },
    review,
  ],

  foods: [
    {
      ...about("place", { slug: true }),
      tip: {
        title: "Lead with what people come for",
        body: "“Charcoal-grilled river fish, open late” tells a traveller more than “good food and friendly service”. The app shows the first lines on the page; the rest opens under Read more.",
      },
    },
    photos("place"),
    locationStep("place", "Travellers see this place on the page of every destination within 50 km of its pin — a noodle shop in Siem Reap on Angkor Wat's page, say."),
    contact("place"),
    {
      id: "menu",
      title: "Food & drink",
      question: "What does it serve, and what does it cost?",
      description: "The type of place, its price range, how people pay, and when it is open.",
      icon: ChefHat,
      tip: {
        title: "What travellers check first",
        body: "The type and the price range are what the app filters by, and the opening hours save a wasted trip. Today's dishes live on the place's Facebook page, which has its own box under Contact.",
      },
      groups: [
        /* The type first — the Food shelf of the taxonomy. */
        { fields: ["interestIds"] },
        /* The price range alone: the from-price follows the cheapest dish by itself, and the currency stays at its default. */
        { fields: ["priceRange"] },
        { fields: ["paymentMethods"] },
        /* Parked here for now: the hours left the Contact section and have no home of their own yet. */
        { title: "Opening hours", fields: ["openingHours"] },
      ],
      places: [
        { label: "Type", field: "interestIds" },
        { label: "Price range", field: "priceRange" },
        { label: "Ways to pay", field: "paymentMethods" },
        { label: "Opening hours", field: "openingHours" },
      ],
    },
    review,
  ],
};

const CHECKS: Readonly<Record<ListingKey, readonly ReadinessCheck[]>> = {
  destinations: [
    { label: "Tourism region", fields: ["tourismRegionIds"], required: true },
    { label: "Name", fields: ["name"], required: true },
    /* In the navigator it is the row under the map — the province and the address — so it is named for the address. */
    { label: "Address", fields: ["provinceId"], required: true },
    { label: "Cover and gallery", fields: ["coverKey"], step: "photos" },
    { label: "Map pin", fields: ["latitude", "longitude"], all: true },
    { label: "Categories", fields: ["categoryIds"] },
    { label: "Interests", fields: ["interestIds"] },
  ],
  stays: [
    { label: "Type", fields: ["interestIds"], required: true },
    { label: "Name", fields: ["name"], required: true },
    { label: "Map pin", fields: ["latitude", "longitude"], all: true, required: true },
    { label: "Address", fields: ["provinceId"] },
    { label: "Rooms", fields: ["rooms"], virtual: true, step: "facilities", id: "rooms" },
    { label: "Stay policies", fields: ["policies"] },
    { label: "Messaging apps", fields: ["telegram", "whatsapp", "facebookUrl"] },
    { label: "Cover and gallery", fields: ["coverKey"], step: "photos" },
    { label: "Facilities", fields: ["amenities"] },
  ],
  foods: [
    { label: "Type", fields: ["interestIds"], required: true },
    { label: "Name", fields: ["name"], required: true },
    { label: "Map pin", fields: ["latitude", "longitude"], all: true, required: true },
    { label: "Address", fields: ["provinceId"] },
    { label: "Cover and gallery", fields: ["coverKey"], step: "photos" },
    { label: "Opening hours", fields: ["openingHours"] },
    { label: "Messaging apps", fields: ["telegram", "whatsapp", "facebookUrl"] },
    { label: "Price range", fields: ["priceRange"], id: "price" },
    { label: "Ways to pay", fields: ["paymentMethods"] },
  ],
};

/**
 * The steps for this listing, holding only fields the registry declares, with
 * any declared field no step names gathered before the review.
 */
export function listingSteps(definition: ResourceDefinition, kind?: string): readonly ListingStep[] {
  if (!isListing(definition.key)) return [];
  const declared = new Set(definition.fields.map((field) => field.name));
  const placed = new Set<string>();
  /*
   * A field only some kinds are asked, and this kind is not one of them: a
   * star rating is asked of a hotel, not of a homestay.
   */
  const kindField = definition.key === "destinations" ? "theme" : "type";
  const notAsked = (name: string) => {
    const shown = definition.fields.find((field) => field.name === name)?.visibleWhen;
    return Boolean(kind && shown && !shown.bySlug && shown.field === kindField && !shown.values.includes(kind));
  };
  /*
   * A step this kind does not have — one whose every question is for other
   * kinds — is left out, and its fields with it.
   */
  const omitted = (step: ListingStep) => {
    const names = step.groups.flatMap((group) => group.fields);
    return names.length > 0 && names.every(notAsked);
  };
  for (const step of STEPS[definition.key]) {
    if (omitted(step)) step.groups.forEach((group) => group.fields.forEach((name) => placed.add(name)));
  }
  /* The same sections, in the same words, whatever kind of stay or place it is. */
  const steps = STEPS[definition.key].filter((step) => !omitted(step)).map((step) => ({
    ...step,
    groups: step.groups
      .map((group) => ({
        ...group,
        fields: group.fields.filter((name) => {
          if (!declared.has(name)) return false;
          placed.add(name);
          return true;
        }),
      }))
      .filter((group) => group.fields.length > 0),
  }));

  /* A field the form works out for itself is never asked. */
  const rest = definition.fields.filter((field) => !field.derived && !placed.has(field.name)).map((field) => field.name);
  if (!rest.length) return steps;

  const extra: ListingStep = {
    id: "more",
    title: "More details",
    question: "Anything else?",
    description: "The last few details this listing can hold.",
    icon: ListChecks,
    tip: { title: "Optional", body: "Fill in what you know; everything here can be added later." },
    groups: [{ fields: rest }],
  };
  return [...steps.slice(0, -1), extra, steps.at(-1)!];
}

export function readinessChecks(definition: ResourceDefinition, kind?: string): readonly ReadinessCheck[] {
  if (!isListing(definition.key)) return [];
  const declared = new Set(definition.fields.map((field) => field.name));
  /* A line about one field reads as that field does, where a field still has a label of its kind's. */
  const labelFor = (name: string) =>
    kind ? definition.fields.find((field) => field.name === name)?.labelFor?.labels[kind] : undefined;
  return CHECKS[definition.key]
    .filter((check) => check.virtual || check.fields.every((name) => declared.has(name)))
    .map((check) => {
      const own = check.fields.length === 1 && !check.virtual ? labelFor(check.fields[0]) : undefined;
      return own ? { ...check, label: own } : check;
    })
    .filter((check) => check.label !== "");
}

export function stepFields(step: ListingStep): readonly string[] {
  return step.groups.flatMap((group) => group.fields);
}

/** Whether a form value holds something: text that is not blank, a list with an entry, a ticked box. */
export function isFilled(value: FieldValue | undefined): boolean {
  if (Array.isArray(value)) return value.some((item) => item.trim().length > 0);
  if (typeof value === "boolean") return value;
  return typeof value === "string" && value.trim().length > 0;
}
