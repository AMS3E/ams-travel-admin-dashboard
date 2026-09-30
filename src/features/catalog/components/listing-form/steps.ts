import {
  CalendarClock,
  Compass,
  FileText,
  Hotel,
  ImagePlus,
  ListChecks,
  MapPin,
  Rocket,
  Sparkles,
  Tags,
  BedDouble,
  ChefHat,
  CupSoda,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type {
  FieldValue,
  ResourceDefinition,
  ResourceKey,
} from "@/features/catalog/resource";
import { STAY_CHECK_WORDS, STAY_WORDS } from "@/features/catalog/components/listing-form/stay-words";
import { DESTINATION_CHECK_WORDS, DESTINATION_WORDS } from "@/features/catalog/components/listing-form/destination-words";
import { FOOD_CHECK_WORDS, FOOD_WORDS } from "@/features/catalog/components/listing-form/food-words";

/** Each kind of stay or place to eat reads its own words on every step (see STAY_WORDS, FOOD_WORDS). */
/** A step's words for one kind; `omit` leaves the step out for that kind. */
type KindStepWords = Partial<Pick<ListingStep, "title" | "question" | "description" | "tip">> & {
  readonly groupTitles?: Readonly<Record<string, string>>;
  readonly omit?: boolean;
};
const KIND_WORDS: Partial<Record<ListingKey, Readonly<Record<string, Readonly<Record<string, KindStepWords>>>>>> = {
  destinations: DESTINATION_WORDS,
  stays: STAY_WORDS,
  foods: FOOD_WORDS,
};
const KIND_CHECK_WORDS: Partial<Record<ListingKey, Readonly<Record<string, Readonly<Record<string, string>>>>>> = {
  destinations: DESTINATION_CHECK_WORDS,
  stays: STAY_CHECK_WORDS,
  foods: FOOD_CHECK_WORDS,
};

/**
 * The listing forms — a destination, a stay, a food — as a short journey
 * rather than one long page.
 *
 * Each step asks one question the way a host would think about it (what kind
 * of place, where, what it offers, how it looks, what it costs), holds the
 * registry's fields for that question in a few small groups, and carries one
 * tip. The fields themselves still come from the registry: a step only names
 * them, so validation and the request body are unchanged, and a field added to
 * the registry but not placed here still appears, in a "More details" step.
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

export interface StepGroup {
  readonly title?: string;
  readonly description?: string;
  readonly fields: readonly string[];
}

export interface ListingStep {
  readonly id: string;
  /** The short name in the step list. */
  readonly title: string;
  /** The step's heading, asked as a question. */
  readonly question: string;
  readonly description: string;
  readonly icon: LucideIcon;
  readonly tip: { readonly title: string; readonly body: string };
  readonly groups: readonly StepGroup[];
  /** The last step: whether it goes live, and what is still missing. */
  readonly review?: boolean;
}

/** One line of the "ready to publish" checklist, and the fields it looks at. */
export interface ReadinessCheck {
  readonly label: string;
  readonly fields: readonly string[];
  /**
   * The fields are values the form keeps for itself rather than registry
   * fields — the number of rooms made in the Rooms step — so no step holds
   * them and the check stands although the registry does not declare them.
   */
  readonly virtual?: boolean;
  /** The step "Add" opens, for a virtual check no field leads to. */
  readonly step?: string;
  /** Needs every field, rather than any one of them. */
  readonly all?: boolean;
  /** For a line reworded per kind of place (see FOOD_CHECK_WORDS, STAY_CHECK_WORDS). */
  readonly id?: "menu" | "price" | "own" | "rooms";
  readonly required?: boolean;
}

const about = (noun: string, withSlug: boolean): ListingStep => ({
  id: "about",
  title: "About",
  question: `What's this ${noun} called, and what's it like?`,
  description: "A name, a line that sells it, and the full story.",
  icon: FileText,
  tip: {
    title: "Write for a first-time visitor",
    body: "Lead with what makes it worth the trip. The short description is what cards across the website show, so keep it to one or two sentences.",
  },
  groups: [
    { fields: withSlug ? ["name", "slug"] : ["name"] },
    { title: "Description", fields: ["shortDescription", "description"] },
  ],
});

const photos = (noun: string): ListingStep => ({
  id: "photos",
  title: "Photos",
  question: "Show it at its best",
  description: `The cover is the first thing travellers see of this ${noun} — on cards, in search, and across the top of its page.`,
  icon: ImagePlus,
  tip: {
    title: "What makes a great cover",
    body: "A bright landscape photo of the place itself, with no text, logos or collages. 1600 × 900 pixels or larger stays sharp everywhere.",
  },
  groups: [{ fields: ["coverKey"] }],
});

const review = (standing: readonly string[]): ListingStep => ({
  id: "review",
  title: "Review & publish",
  question: "Ready to go live?",
  description: "Check what is still missing, then choose whether travellers can see it yet.",
  icon: Rocket,
  tip: {
    title: "Nothing here is final",
    body: "A published listing appears on the website straight away. A draft stays in the dashboard until it is published, and either can be changed later.",
  },
  groups: standing.length ? [{ title: "Standing", fields: standing }] : [],
  review: true,
});

/**
 * A stay or a food listing: a place in its own right, found by its map pin on
 * the page of every destination near it, so there is no destination to choose.
 */
const whereAndContact = (noun: string, example: string): ListingStep => ({
  id: "location",
  title: "Location & contact",
  question: "Where is it, and how do guests get in touch?",
  description: `Pin the ${noun} on the map and add the ways to reach it.`,
  icon: MapPin,
  tip: {
    title: "The pin puts it on the website",
    body: `Travellers see this ${noun} on the page of every destination within 50 km of its pin — ${example} — so there is no destination to choose. At the place with a phone? Press Use my location.`,
  },
  groups: [
    { title: "Address & map pin", fields: ["address", "latitude", "longitude"] },
    { title: "Who runs it", fields: ["ownerUserId"] },
    { title: "Contact details", description: "Shown on the listing so travellers can ask before they go.", fields: ["phone", "contactEmail", "website"] },
    {
      title: "Messaging apps",
      description: "Most travellers in Cambodia ask on Telegram or WhatsApp first; the stay's page opens a chat.",
      fields: ["telegram", "whatsapp", "facebookUrl"],
    },
  ],
});

const STEPS: Readonly<Record<ListingKey, readonly ListingStep[]>> = {
  destinations: [
    {
      id: "theme",
      title: "Theme",
      question: "What is it mainly about?",
      description: "Choose its tourism region. The rest of the form is written for it: a temple is asked about its history, a beach about its sea.",
      icon: Compass,
      tip: {
        title: "One theme, its own lists",
        body: "Choose the region the place is best known for. From here on it is offered only that region's categories, search filters and interests, and the form is written for it.",
      },
      groups: [{ fields: ["theme"] }],
    },
    about("place", true),
    {
      id: "location",
      title: "Location",
      question: "Where is it?",
      description: "The province places it in the right region of Cambodia; the coordinates drop the pin on the map.",
      icon: MapPin,
      tip: {
        title: "Putting the pin on the place",
        body: "At the place with a phone? Press Use my location. Otherwise search for it, click the map, or paste a Google Maps link — then switch to Satellite and drag the pin onto the spot.",
      },
      groups: [
        { fields: ["provinceId", "address"] },
        { title: "Map pin", fields: ["latitude", "longitude"] },
      ],
    },
    {
      id: "classification",
      title: "Where it appears",
      question: "What kind of place is it?",
      description: "Its theme's own categories, search filters and interests. They decide where it shows up on the website.",
      icon: Tags,
      tip: {
        title: "Choose what a traveller would look for",
        body: "Two or three accurate categories, the search filters that are true of it, and the interests a traveller would find it under.",
      },
      groups: [
        { title: "Categories", fields: ["categoryIds"] },
        /*
         * The theme's own tags. Ancient Capitals & Khmer Civilization's Century,
         * King, Architecture Style, Religion and Historical Period then ask which.
         */
        {
          title: "Search filters",
          fields: ["tagIds", "centuries", "monarchIds", "architectureStyleIds", "religionIds", "historicalPeriodIds"],
        },
        { title: "Interests", description: "The Explore shelves and province pages it is listed under.", fields: ["interestIds"] },
      ],
    },
    {
      id: "visiting",
      title: "Visiting",
      question: "What should a visitor know?",
      description: "What only this kind of place has — its theme decides what is asked.",
      icon: Sparkles,
      tip: {
        title: "Only what is true today",
        body: "Travellers plan their day on these. Tick only what they will really find.",
      },
      groups: [{ fields: ["specialties"] }],
    },
    photos("place"),
    review(["isFeatured"]),
  ],

  stays: [
    {
      id: "type",
      title: "Property type",
      question: "What kind of property is it?",
      description: "Choose the closest match. Guests filter stays by this, and it decides which rooms you are offered later.",
      icon: Hotel,
      tip: {
        title: "Not officially rated?",
        body: "Leave the stars empty for guesthouses and homestays without an official rating. An honest listing earns more trust than an inflated one.",
      },
      groups: [
        { fields: ["type"] },
        { fields: ["starRating"] },
        {
          title: "Where guests will find it",
          description: "The kinds of trip this stay suits. It is listed on the page of each one you tick, and on the Explore screen.",
          fields: ["interestIds"],
        },
      ],
    },
    about("stay", false),
    whereAndContact("stay", "a hotel in Siem Reap on Angkor Wat's page, say"),
    {
      id: "facilities",
      title: "Facilities",
      question: "What can guests use?",
      description: "Tick everything a guest can use today. Guests filter stays by these.",
      icon: Sparkles,
      tip: {
        title: "Only list what is there",
        body: "A guest who chooses a stay for its pool expects to find one. Leave out anything seasonal or on request.",
      },
      groups: [
        { fields: ["specialties"] },
        { fields: ["amenities"] },
        { title: "Breakfast", description: "Whether it is served, what is on it, and what it costs.", fields: ["breakfastOption", "breakfastTypes", "breakfastPrice"] },
        { title: "Parking", fields: ["parkingOption", "parkingPrice"] },
      ],
    },
    photos("stay"),
    {
      id: "rooms",
      title: "Rooms",
      question: "Which rooms can guests book?",
      description: "Add each kind of room once: how many people it sleeps, in which beds, what it has, and what one night costs.",
      icon: BedDouble,
      tip: {
        title: "One entry per kind of room",
        body: "Ten identical doubles are one room, with 10 in “How many rooms like this”. Copy a room to make the next one like it. When a room cannot be booked for a while, hide it instead of deleting it. The cheapest bookable room sets the “From” price guests see.",
      },
      groups: [],
    },
    {
      id: "rules",
      title: "House rules",
      question: "What are the house rules?",
      description: "When guests can arrive and must leave, and what they may bring and do. Guests read these before they book.",
      icon: CalendarClock,
      tip: {
        title: "Rules that avoid surprises",
        body: "Clear arrival times and a pets and smoking rule answer the questions guests otherwise send by message. Leave “Latest check-in” empty if someone is at the desk all night.",
      },
      groups: [
        { title: "Check-in", fields: ["checkInFrom", "checkInUntil"] },
        { title: "Check-out", fields: ["checkOutFrom", "checkOutUntil"] },
        { title: "Guests", fields: ["minCheckInAge", "childrenAllowed"] },
        { title: "Pets, smoking and parties", fields: ["petsPolicy", "smokingPolicy", "partiesAllowed"] },
        { title: "Quiet hours", fields: ["quietHours"] },
      ],
    },
    {
      id: "policies",
      title: "Prices & payments",
      question: "What does a night cost, and how can guests pay?",
      description: "The price guests see first, the ways they can pay, and the languages your staff speak.",
      icon: Wallet,
      tip: {
        title: "Show the lowest honest price",
        body: "“From” is one night in the cheapest room on an ordinary night, taxes included — a price a guest can really book. Once your rooms have prices, it follows the cheapest one on its own, so you can leave it alone.",
      },
      groups: [
        { title: "Price", fields: ["priceFrom", "currency"] },
        { title: "Ways to pay", fields: ["paymentMethods"] },
        { title: "Languages spoken", fields: ["languagesSpoken"] },
      ],
    },
    review([]),
  ],

  foods: [
    {
      id: "about",
      title: "About",
      question: "What is the place, and what is it like?",
      description: "What it is called, what kind of place a traveller would call it, and the line that makes them want to eat there.",
      icon: FileText,
      tip: {
        title: "Lead with what people come for",
        body: "“Charcoal-grilled river fish, open late” tells a traveller more than “good food and friendly service”. The short description is what cards across the website show, so keep it to one or two sentences.",
      },
      groups: [
        /* The kind first: every label, hint and heading after it is written for what is picked here. */
        { fields: ["type", "name"] },
        { title: "Description", fields: ["shortDescription", "description"] },
      ],
    },
    {
      id: "location",
      title: "Where & how to reach",
      question: "Where is it, when is it open, and how do people reach it?",
      description: "Pin it on the map, set the hours for each day, and add the ways to get in touch.",
      icon: MapPin,
      tip: {
        title: "The pin puts it on the website",
        body: "Travellers see this place on the page of every destination within 50 km of its pin — a noodle shop in Siem Reap on Angkor Wat's page, say — so there is no destination to choose. At the place with a phone? Press Use my location.",
      },
      groups: [
        { title: "Address & map pin", fields: ["address", "latitude", "longitude"] },
        { title: "Who runs it", fields: ["ownerUserId"] },
        { title: "Opening hours", fields: ["openingHours"] },
        { title: "Contact details", description: "Shown on the listing so travellers can ask before they go.", fields: ["phone", "contactEmail", "website"] },
        {
          title: "Messaging apps",
          description: "Most travellers in Cambodia ask on Telegram or WhatsApp first; the place's page opens a chat.",
          fields: ["telegram", "whatsapp", "facebookUrl"],
        },
      ],
    },
    {
      /*
       * What only this kind of place has — a cafe's beans, a bar's nights, a
       * stall's fire. "Other" has no list of its own, so this step drops out
       * for it on its own (see `omitted`).
       */
      id: "known",
      title: "Known for",
      question: "What is this place known for?",
      description: "The few things only this kind of place has. Travellers read them on its page.",
      icon: CupSoda,
      tip: {
        title: "Only what is true today",
        body: "Tick only what a traveller will really find. This is the part of the page people scan before deciding to go.",
      },
      groups: [{ fields: ["specialties"] }],
    },
    {
      id: "menu",
      title: "Menu & prices",
      question: "What is on the menu, and what does it cost?",
      description: "Each dish once — what it is called, what is in it and what it costs — then what a meal comes to, and how people pay.",
      icon: ChefHat,
      tip: {
        title: "Five dishes beat fifty",
        body: "Write the dishes people come for, with prices and their Khmer names — the Khmer name is what a traveller points at to order. When a dish is out of season, take it off the menu instead of deleting it. The cheapest dish on the menu sets the “From” price travellers see.",
      },
      groups: [
        { title: "What a meal costs", fields: ["priceRange", "averageMealPrice", "priceFrom", "currency"] },
        { title: "Paying", fields: ["paymentMethods"] },
      ],
    },
    photos("place"),
    review(["isFeatured", "isLocalSpecialty"]),
  ],
};

const CHECKS: Readonly<Record<ListingKey, readonly ReadinessCheck[]>> = {
  destinations: [
    { label: "Theme", fields: ["theme"], required: true },
    { label: "Name", fields: ["name"], required: true },
    { label: "Province", fields: ["provinceId"], required: true },
    { label: "Short description", fields: ["shortDescription"] },
    { label: "Cover photo", fields: ["coverKey"] },
    { label: "Map pin", fields: ["latitude", "longitude"], all: true },
    { label: "At least one category", fields: ["categoryIds"] },
    { label: "At least one interest", fields: ["interestIds"] },
    { label: "What makes it this kind of place", fields: ["specialties"], id: "own" },
  ],
  stays: [
    { label: "Property type", fields: ["type"], required: true },
    { label: "Name", fields: ["name"], required: true },
    { label: "Map pin", fields: ["latitude", "longitude"], all: true, required: true },
    { label: "A kind of trip it suits, so guests can find it", fields: ["interestIds"] },
    { label: "At least one room", fields: ["rooms"], virtual: true, step: "rooms", id: "rooms" },
    { label: "What makes it this kind of stay", fields: ["specialties"], id: "own" },
    { label: "Arrival and departure times", fields: ["checkInFrom", "checkOutUntil"], all: true },
    { label: "Pets and smoking rules", fields: ["petsPolicy", "smokingPolicy"], all: true },
    { label: "Ways to pay", fields: ["paymentMethods"] },
    { label: "Languages spoken", fields: ["languagesSpoken"] },
    { label: "Telegram, WhatsApp or Facebook", fields: ["telegram", "whatsapp", "facebookUrl"] },
    { label: "Short description", fields: ["shortDescription"] },
    { label: "Cover photo", fields: ["coverKey"] },
    { label: "Facilities", fields: ["amenities"] },
    { label: "Price from", fields: ["priceFrom"], id: "price" },
  ],
  foods: [
    { label: "Kind of place", fields: ["type"], required: true },
    { label: "Name", fields: ["name"], required: true },
    { label: "Map pin", fields: ["latitude", "longitude"], all: true, required: true },
    { label: "At least one dish", fields: ["dishes"], virtual: true, step: "menu", id: "menu" },
    { label: "What makes it this kind of place", fields: ["specialties"], id: "own" },
    { label: "Short description", fields: ["shortDescription"] },
    { label: "Cover photo", fields: ["coverKey"] },
    { label: "Opening hours", fields: ["openingHours"] },
    { label: "Telegram, WhatsApp or Facebook", fields: ["telegram", "whatsapp", "facebookUrl"] },
    { label: "What a meal costs", fields: ["priceRange", "averageMealPrice"], id: "price" },
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
  /* A cafe is asked what it serves, a hostel about its dorms: the same steps, its own words. */
  const words = kind ? (KIND_WORDS[definition.key]?.[kind] ?? {}) : {};

  /*
   * A field only some kinds are asked, and this kind is not one of them: a
   * theme added since, with no Visiting questions of its own, is not asked any.
   */
  const kindField = definition.key === "destinations" ? "theme" : "type";
  const notAsked = (name: string) => {
    const shown = definition.fields.find((field) => field.name === name)?.visibleWhen;
    return Boolean(kind && shown && !shown.bySlug && shown.field === kindField && !shown.values.includes(kind));
  };
  /*
   * A step this kind does not have — an ancient site's History & visiting, or
   * one whose every question is for other kinds — is left out, and its fields with it.
   */
  const omitted = (step: ListingStep) => {
    const names = step.groups.flatMap((group) => group.fields);
    return Boolean(words[step.id]?.omit) || (names.length > 0 && names.every(notAsked));
  };
  for (const step of STEPS[definition.key]) {
    if (omitted(step)) step.groups.forEach((group) => group.fields.forEach((name) => placed.add(name)));
  }
  const steps = STEPS[definition.key].filter((step) => !omitted(step)).map((step) => {
    const { groupTitles, title, question, description, tip } = words[step.id] ?? {};
    return {
      ...step,
      ...(title === undefined ? {} : { title }),
      ...(question === undefined ? {} : { question }),
      ...(description === undefined ? {} : { description }),
      ...(tip === undefined ? {} : { tip }),
      groups: step.groups
        .map((group) => ({
          ...group,
          title: groupTitles?.[group.fields[0] ?? ""] ?? group.title,
          fields: group.fields.filter((name) => {
            if (!declared.has(name)) return false;
            placed.add(name);
            return true;
          }),
        }))
        .filter((group) => group.fields.length > 0),
    };
  });

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
  /* A cafe has items on its board, a hostel dorms: the list reads in the kind's own words. */
  const words = kind ? KIND_CHECK_WORDS[definition.key]?.[kind] : undefined;
  /* A line about one field reads as that field does for this kind: "Cuisines the kitchen cooks". */
  const labelFor = (name: string) =>
    kind ? definition.fields.find((field) => field.name === name)?.labelFor?.labels[kind] : undefined;
  return CHECKS[definition.key]
    .filter((check) => check.virtual || check.fields.every((name) => declared.has(name)))
    .map((check) => {
      if (words && check.id && words[check.id] !== undefined) return { ...check, label: words[check.id] };
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
