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
import { createTranslator, type _Translator, type Messages } from "next-intl";
import englishForms from "@locales/en/forms.json";
import type {
  FieldValue,
  ResourceDefinition,
  ResourceKey,
} from "@/features/catalog/resource";
import { getResource } from "@/features/catalog/resources";

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

/** The words of the sections, from `useTranslations("forms.steps")` or `getTranslations("forms.steps")`. */
export type StepWords = _Translator<Messages, "forms.steps">;

/** English, for a caller that passes no words of its own. */
const ENGLISH: StepWords = createTranslator({ locale: "en", messages: { forms: englishForms }, namespace: "forms.steps" });
const ENGLISH_LABELS: Readonly<Record<string, string>> = englishForms.steps.labels;

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
  /** The title says what its first field's own label says, so the form shows only one of them. */
  readonly echoes?: boolean;
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

/** What a listing's words call it: a stay, or a place. */
type Noun = "place" | "stay";
/** A line of the navigator or the checklist, by its key under `labels`. */
type Label = keyof typeof englishForms.steps.labels;

/** A group's title, by its key under `labels`; `echoes` is worked out once the fields are known. */
interface GroupDraft extends Omit<StepGroup, "title"> {
  readonly label?: Label;
  readonly title?: string;
}

interface StepDraft extends Omit<ListingStep, "groups" | "places"> {
  readonly groups: readonly GroupDraft[];
  readonly places?: readonly { readonly label: Label; readonly field: string }[];
}

/** The sections of every kind of listing, in the words given. */
function stepsIn(t: StepWords): Readonly<Record<ListingKey, readonly StepDraft[]>> {
  /** The quote at the top of the page, with who said it: asked on every kind of listing. */
  const sloganGroup: GroupDraft = { label: "slogan", description: t("slogan.description"), fields: ["slogan", "sloganBy"] };

  /** `has`: whether this kind of listing carries a web address (slug). */
  const about = (noun: Noun, has: { readonly slug?: boolean } = {}): StepDraft => ({
    id: "about",
    /* "Details", not "About": the app's word About is the long text's, and the section holds more than it. */
    title: t("about.title"),
    question: t("about.question", { noun }),
    description: t("about.description"),
    icon: FileText,
    tip: { title: t("about.tipTitle"), body: t("about.tipBody") },
    groups: [
      /* The name takes the row, its web address under it. */
      { fields: ["name", ...(has.slug ? ["slug"] : [])], columns: "one" },
      sloganGroup,
      { fields: ["description"] },
    ],
    /* What the navigator lists under Details: the three things written here, whether or not they are checks. */
    places: [
      { label: "name", field: "name" },
      { label: "slogan", field: "slogan" },
      { label: "about", field: "description" },
    ],
  });

  /**
   * Where it is, for every kind of listing: the link box, the map, and the
   * province and address the pin fills in. `found` says how travellers come
   * across this kind — a stay or a food listing by its pin, not by a page.
   */
  const locationStep = (noun: Noun, found?: "stays" | "foods"): StepDraft => ({
    id: "location",
    title: t("location.title"),
    question: t("location.question"),
    description: t("location.description", { noun }),
    icon: MapPin,
    tip: {
      title: t("location.tipTitle"),
      body: `${found ? `${t(`location.found.${found}`)} ` : ""}${t("location.tipBody", { noun })}`,
    },
    /* One group, no line between: the map first, and under it the province and the address the pin fills in. */
    groups: [{ fields: ["latitude", "longitude", "provinceId", "address"] }],
  });

  /** Who runs a stay or a food listing and how travellers reach it: the same three groups, every box the full width. */
  const contact = (noun: Noun): StepDraft => ({
    id: "contact",
    title: t("contact.title"),
    question: t("contact.question"),
    description: t("contact.description"),
    icon: Phone,
    tip: { title: t("contact.tipTitle"), body: t("contact.tipBody") },
    groups: [
      { label: "owner", fields: ["ownerUserId"], columns: "one" },
      { label: "contactDetails", description: t("contact.detailsDescription"), fields: ["phone", "contactEmail", "website"], columns: "one" },
      {
        label: "messaging",
        description: t("contact.messagingDescription", { noun }),
        fields: ["telegram", "whatsapp", "facebookUrl"],
        columns: "one",
      },
    ],
    places: [
      { label: "owner", field: "ownerUserId" },
      { label: "contactDetails", field: "phone" },
      { label: "messaging", field: "telegram" },
    ],
  });

  const photos = (noun: Noun): StepDraft => ({
    id: "photos",
    title: t("photos.title"),
    question: t("photos.question"),
    description: t("photos.description", { noun }),
    icon: ImagePlus,
    tip: { title: t("photos.tipTitle"), body: t("photos.tipBody") },
    /* No field of its own: the gallery is the section, and the cover is one of its photos. */
    groups: [],
  });

  const review: StepDraft = {
    id: "review",
    title: t("review.title"),
    question: t("review.question"),
    description: t("review.description"),
    icon: Rocket,
    tip: { title: t("review.tipTitle"), body: t("review.tipBody") },
    /* No field of its own: the checklist is the section. */
    groups: [],
    review: true,
  };

  return {
    destinations: [
      about("place", { slug: true }),
      /* Photos right after the words: the cover is the first thing a traveller sees. */
      photos("place"),
      locationStep("place"),
      {
        id: "classification",
        title: t("classification.title"),
        question: t("classification.question"),
        description: t("classification.description"),
        icon: Tags,
        tip: { title: t("classification.tipTitle"), body: t("classification.tipBody") },
        groups: [
          { label: "tourismRegion", fields: ["tourismRegionIds"] },
          { label: "categories", fields: ["categoryIds"] },
          /* The region's own tags, with no heading of their own. */
          { fields: ["tagIds"] },
          { label: "interests", description: t("classification.interestsDescription"), fields: ["interestIds"] },
        ],
        places: [
          { label: "tourismRegion", field: "tourismRegionIds" },
          { label: "categories", field: "categoryIds" },
          { label: "tags", field: "tagIds" },
          { label: "interests", field: "interestIds" },
        ],
      },
      review,
    ],

    stays: [
      about("stay"),
      photos("stay"),
      locationStep("stay", "stays"),
      contact("stay"),
      {
        id: "facilities",
        title: t("facilities.title"),
        question: t("facilities.question"),
        description: t("facilities.description"),
        icon: Sparkles,
        tip: { title: t("facilities.tipTitle"), body: t("facilities.tipBody") },
        groups: [
          /* The type first — the Stays shelf of the taxonomy — then the stars: the type decides which rooms the stay is offered later. */
          { fields: ["interestIds"] },
          { fields: ["starRating"] },
          /* Breakfast and parking are chips in this list, as the app shows them; the rooms follow the list. */
          { fields: ["amenities"], rooms: true },
          { label: "policies", description: t("facilities.policiesDescription"), fields: ["policies"] },
        ],
        places: [
          { label: "type", field: "interestIds" },
          { label: "starRating", field: "starRating" },
          { label: "facilities", field: "amenities" },
          { label: "rooms", field: "rooms" },
          { label: "policies", field: "policies" },
        ],
      },
      review,
    ],

    foods: [
      {
        ...about("place", { slug: true }),
        tip: { title: t("foodAbout.tipTitle"), body: t("foodAbout.tipBody") },
      },
      photos("place"),
      locationStep("place", "foods"),
      contact("place"),
      {
        id: "menu",
        title: t("menu.title"),
        question: t("menu.question"),
        description: t("menu.description"),
        icon: ChefHat,
        tip: { title: t("menu.tipTitle"), body: t("menu.tipBody") },
        groups: [
          /* The type first — the Food shelf of the taxonomy. */
          { fields: ["interestIds"] },
          /* The price range alone: the from-price follows the cheapest dish by itself, and the currency stays at its default. */
          { fields: ["priceRange"] },
          { fields: ["paymentMethods"] },
          /* Parked here for now: the hours left the Contact section and have no home of their own yet. */
          { label: "hours", fields: ["openingHours"] },
        ],
        places: [
          { label: "type", field: "interestIds" },
          { label: "priceRange", field: "priceRange" },
          { label: "pay", field: "paymentMethods" },
          { label: "hours", field: "openingHours" },
        ],
      },
      review,
    ],
  };
}

type CheckDraft = Omit<ReadinessCheck, "label"> & { readonly label: Label };

const CHECKS: Readonly<Record<ListingKey, readonly CheckDraft[]>> = {
  destinations: [
    { label: "tourismRegion", fields: ["tourismRegionIds"], required: true },
    { label: "name", fields: ["name"], required: true },
    /* In the navigator it is the row under the map — the province and the address — so it is named for the address. */
    { label: "address", fields: ["provinceId"], required: true },
    { label: "cover", fields: ["coverKey"], step: "photos" },
    { label: "pin", fields: ["latitude", "longitude"], all: true },
    { label: "categories", fields: ["categoryIds"] },
    { label: "interests", fields: ["interestIds"] },
  ],
  stays: [
    { label: "type", fields: ["interestIds"], required: true },
    { label: "name", fields: ["name"], required: true },
    { label: "pin", fields: ["latitude", "longitude"], all: true, required: true },
    { label: "address", fields: ["provinceId"] },
    { label: "rooms", fields: ["rooms"], virtual: true, step: "facilities", id: "rooms" },
    { label: "policies", fields: ["policies"] },
    { label: "messaging", fields: ["telegram", "whatsapp", "facebookUrl"] },
    { label: "cover", fields: ["coverKey"], step: "photos" },
    { label: "facilities", fields: ["amenities"] },
  ],
  foods: [
    { label: "type", fields: ["interestIds"], required: true },
    { label: "name", fields: ["name"], required: true },
    { label: "pin", fields: ["latitude", "longitude"], all: true, required: true },
    { label: "address", fields: ["provinceId"] },
    { label: "cover", fields: ["coverKey"], step: "photos" },
    { label: "hours", fields: ["openingHours"] },
    { label: "messaging", fields: ["telegram", "whatsapp", "facebookUrl"] },
    { label: "priceRange", fields: ["priceRange"], id: "price" },
    { label: "pay", fields: ["paymentMethods"] },
  ],
};

/**
 * The steps for this listing, holding only fields the registry declares, with
 * any declared field no step names gathered before the review. `t` gives the
 * words; English when none is given.
 */
export function listingSteps(definition: ResourceDefinition, kind?: string, t: StepWords = ENGLISH): readonly ListingStep[] {
  if (!isListing(definition.key)) return [];
  const declared = new Set(definition.fields.map((field) => field.name));
  /* The registry's own labels, in English, to tell a group title that repeats its field's label in any language. */
  const englishLabels = new Map(getResource(definition.key).fields.map((field) => [field.name, field.label]));
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
  const omitted = (step: StepDraft) => {
    const names = step.groups.flatMap((group) => group.fields);
    return names.length > 0 && names.every(notAsked);
  };
  const drafts = stepsIn(t)[definition.key];
  for (const step of drafts) {
    if (omitted(step)) step.groups.forEach((group) => group.fields.forEach((name) => placed.add(name)));
  }
  /* The same sections, in the same words, whatever kind of stay or place it is. */
  const steps: ListingStep[] = drafts.filter((step) => !omitted(step)).map((step) => ({
    ...step,
    places: step.places?.map((place) => ({ label: t(`labels.${place.label}`), field: place.field })),
    groups: step.groups
      .map(({ label, ...group }) => {
        const fields = group.fields.filter((name) => {
          if (!declared.has(name)) return false;
          placed.add(name);
          return true;
        });
        return {
          ...group,
          ...(label ? { title: t(`labels.${label}`), echoes: englishLabels.get(fields[0] ?? "") === ENGLISH_LABELS[label] } : {}),
          fields,
        };
      })
      .filter((group) => group.fields.length > 0),
  }));

  /* A field the form works out for itself is never asked. */
  const rest = definition.fields.filter((field) => !field.derived && !placed.has(field.name)).map((field) => field.name);
  if (!rest.length) return steps;

  const extra: ListingStep = {
    id: "more",
    title: t("more.title"),
    question: t("more.question"),
    description: t("more.description"),
    icon: ListChecks,
    tip: { title: t("more.tipTitle"), body: t("more.tipBody") },
    groups: [{ fields: rest }],
  };
  return [...steps.slice(0, -1), extra, steps.at(-1)!];
}

export function readinessChecks(definition: ResourceDefinition, kind?: string, t: StepWords = ENGLISH): readonly ReadinessCheck[] {
  if (!isListing(definition.key)) return [];
  const declared = new Set(definition.fields.map((field) => field.name));
  /* A line about one field reads as that field does, where a field still has a label of its kind's. */
  const labelFor = (name: string) =>
    kind ? definition.fields.find((field) => field.name === name)?.labelFor?.labels[kind] : undefined;
  return CHECKS[definition.key]
    .filter((check) => check.virtual || check.fields.every((name) => declared.has(name)))
    .map((check): ReadinessCheck => {
      const own = check.fields.length === 1 && !check.virtual ? labelFor(check.fields[0]) : undefined;
      return { ...check, label: own || t(`labels.${check.label}`) };
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
