
import type { BadgeTone } from "@/components/ui/badge";
import type { ImageCategory } from "@/features/catalog/image-category";
import { z } from "zod";
import { WEEKDAYS, type CatalogRecord } from "@/features/catalog/api/contracts";

/**
 * One description per catalogue table, and every screen is generated from it.
 *
 * Twenty-one resources share the same five operations. Writing twenty-one list
 * pages and as many forms would mean twenty-one places for a key field to be
 * sent as a URL or the status toggle to drift. Instead a resource declares its columns,
 * its fields and its status, and the list, the form, the Zod schema, and the
 * request body all fall out of that declaration.
 *
 * Declarations cross from server pages into client components, so they hold
 * data only — never a function.
 */

export type ResourceKey =
  | "destinations"
  | "destination-media"
  | "stays"
  | "stay-media"
  | "stay-rooms"
  | "foods"
  | "food-menu-items"
  | "food-media"
  | "corridors"
  | "corridor-media"
  | "regions"
  | "provinces"
  | "interests"
  | "categories"
  | "tags"
  | "badge-definitions"
  | "badge-periods"
  | "seasons"
  | "amenities";

/**
 * What a `ref` field can point at: a resource's rows, or one of the lists made
 * for a field — the accounts that have signed in, the tourism regions (the
 * attraction themes), the zones provinces sit in, and the ancient sites whose
 * history is told.
 */
export type ReferenceKey = ResourceKey | "users" | "tourism-regions" | "zones";

export type ResourceGroup =
  | "Catalogue"
  | "Listings"
  | "Places"
  | "Taxonomy"
  | "Gamification";

export type FieldKind =
  /** Single-line text. */
  | "text"
  /** Multi-line prose. */
  | "textarea"
  /** Whole number. */
  | "number"
  /** Fractional number — coordinates and prices. */
  | "decimal"
  /** A calendar day, sent as ISO `YYYY-MM-DD`. */
  | "date"
  /** A clock time, sent as `HH:mm` — a stay's check-in and check-out. */
  | "time"
  /** Checkbox. */
  | "boolean"
  /** A MinIO object key, filled in by an upload and previewed through `urlField`. */
  | "image"
  /** One row of another resource, chosen by id. */
  | "ref"
  /** Many rows of another resource. */
  | "refs"
  /** One value from a fixed list the backend enum defines. */
  | "enum"
  /** Many values from that list. */
  | "enums"
  /** One text box per weekday, sent as `{ mon: "07:00-22:00", … }`. */
  | "hours";

export interface EnumOption {
  readonly value: string;
  readonly label: string;
}


export interface ResourceField {
  readonly name: string;
  readonly label: string;
  readonly kind: FieldKind;
  readonly required?: boolean;
  readonly hint?: string;
  /** For `enum` / `enums`. */
  readonly options?: readonly EnumOption[];
  /** For `ref` / `refs` — which list supplies the choices. */
  readonly ref?: ReferenceKey;
  /** For `refs` — the order of the choices matters (corridor stops) and can be changed. */
  readonly ordered?: boolean;
  /**
   * For `refs` — one at a time: choosing another replaces it. Still sent as a
   * list, as the API takes it. An attraction's tourism region.
   */
  readonly single?: boolean;
  /** For `image` — which folder in the bucket it uploads into. */
  readonly imageCategory?: ImageCategory;
  /**
   * For `image` — the row field that holds the picture's current URL. The key
   * is what is saved; the URL is only what the preview shows.
   */
  readonly urlField?: string;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  /** For text — the most characters the API's column takes. */
  readonly maxLength?: number;
  /**
   * Filled only together with this other field, or not at all: a centre's
   * latitude and longitude, which the API refuses one without the other.
   */
  readonly pairedWith?: string;
  /**
   * The row's flag that says this value was set by hand. A row can carry a
   * value nobody set — a region's centre is the middle of its places until an
   * editor types one — and sending it back would fix it there. So while the
   * flag is false the box starts empty, and an empty value is sent as null,
   * which the API reads as "keep following".
   */
  readonly blankUnless?: string;
  /**
   * For text — the shape the API insists on, checked before sending: an empty
   * box always passes. The expression is its source text, since a definition
   * is passed from server pages to client forms and a RegExp cannot be.
   */
  readonly pattern?: { readonly source: string; readonly message: string };
  /**
   * For `refs` — the choices follow another field: only the options the rows
   * chosen there list under their `links[links]` are offered, as a
   * destination's categories follow its tourism regions. Nothing chosen there
   * offers everything. Plain strings, for the same reason as `pattern`.
   *
   * `from`: the list whose rows the followed field names when it is not a
   * `refs` field itself — a field holding a tourism region's code.
   */
  readonly narrowedBy?: { readonly field: string; readonly links: string; readonly from?: ReferenceKey };
  /**
   * Shown only while `field` holds one of `values` — a breakfast price only
   * when breakfast costs extra. Hidden, it still travels in the body as it is.
   *
   * `bySlug`: `field` holds ids of that list's rows and `values` are their
   * slugs — an ancient site's kings are asked once its King tag is ticked.
   */
  readonly visibleWhen?: { readonly field: string; readonly values: readonly string[]; readonly bySlug?: ReferenceKey };
  /**
   * Only the options this kind of row has use for: a cafe is offered coffee
   * and pastries, not curries; a street stall is not offered private dining.
   * A value already chosen stays offered, so it can be taken away. A kind the
   * table does not name is offered everything.
   */
  readonly optionsFor?: { readonly field: string; readonly keep: Readonly<Record<string, readonly string[]>> };
  /** For `enums` read from the amenities taxonomy (`ref: "amenities"`): the level this picker stands at. */
  readonly offeredAt?: "PROPERTY" | "ROOM";
  /**
   * For `enum` / `enums` — the options are a scale or a sequence — $ to $$,
   * breakfast to dinner — and keep the order they are written in. Every other
   * list of choices is shown A to Z.
   */
  readonly scale?: boolean;
  /** For `enums` — the values are whole numbers and go to the API as numbers. */
  readonly numeric?: boolean;
  /**
   * The label this kind of row uses: a cafe is asked what a coffee and a cake
   * cost, a bar what a drink costs. A kind the table does not name keeps the
   * field's own label.
   */
  readonly labelFor?: { readonly field: string; readonly labels: Readonly<Record<string, string>> };
  /** The hint this kind of row is shown: a cafe's name example, a stall's address. */
  readonly hintFor?: { readonly field: string; readonly hints: Readonly<Record<string, string>> };
  /**
   * For `refs` to a list with `groupBy`: only these groups' options are
   * offered — a stay's interests are the Stays shelf's, an attraction's are
   * the three that fit an attraction. One chosen from another group stays
   * shown, so it can be taken away.
   */
  readonly optionGroup?: string | readonly string[];
  /**
   * For `refs`: when `field` changes and nothing is chosen here yet, the
   * option whose label is one of `labels[its value]` is chosen — a Resort
   * starts with "Resorts". Never replaces a choice already made.
   */
  readonly presetBy?: { readonly field: string; readonly labels: Readonly<Record<string, readonly string[]>> };
  /** Columns the control spans in the two-column form grid. */
  readonly span?: 1 | 2;
  /** Fields sharing a section render under one sub-heading, in declared order. */
  readonly section?: string;
  /** What a new row's form starts with. */
  readonly initial?: string;
  /**
   * Chosen when the row is created and fixed afterwards: shown on the edit
   * form but not editable, and left out of the update body.
   */
  readonly createOnly?: boolean;
  /**
   * What an emptied text box sends on update. By default `""`, which clears
   * the column; `"null"` for a column where an empty string would collide —
   * a unique code, or a slug the API generates when it is absent.
   */
  readonly blank?: "null";
  /**
   * Written through an endpoint of its own after the row is saved:
   * `PUT {path}/{id}` with `{ [bodyKey]: value }`. Corridor stops.
   */
  readonly separate?: { readonly path: string; readonly bodyKey: string };
  /**
   * For `refs` — the link is kept on the other rows: each chosen one lists this
   * row in its own `field`. A category's tourism regions are the regions whose
   * categories include it. It is read from those rows and saved by updating
   * them, never sent in this row's own body.
   */
  readonly inverse?: { readonly resource: ResourceKey; readonly field: string };
  /**
   * Worked out by the form, never asked: an attraction's theme is the code of
   * the tourism region chosen for it. No step holds it, and it travels in the
   * body as it is.
   */
  readonly derived?: boolean;
  /**
   * For `refs` — each link is a row of its own with more to it: a site's kings,
   * each with how he shaped it. Read from `GET {path}?{by}={id}` as the list of
   * `key`s; saved after the row with `PUT {path}/{id}` and
   * `{ [list]: [{ [key]: value, …what that tie already had }] }`, so what the
   * form does not show is kept. Never in the row's own body.
   */
  /**
   * For `ref`, `refs` and `enum` — offered as cards with an icon and one line
   * each, rather than a dropdown or a checkbox list: a category's regions, a
   * province's zone, an interest's group.
   */
  readonly tiles?: boolean;
  /**
   * Under the choice, what already belongs to what is chosen: the categories a
   * region has, the provinces a zone holds — so nothing is made twice.
   */
  readonly siblings?: boolean;
  /**
   * For `number` — a row's place in the list of the rows that share this
   * field's value, 0 for the first: a capital's place in its region's
   * Historical coverage. Chosen as "after Mahendraparvata"; empty means at the
   * end for a new row and where it is for an existing one.
   */
  readonly placeAmong?: string; /* "*": among every row of the list, which has no parent field (the corridors). */
  /** For `placeAmong` — chosen by clicking a spot in the list itself rather than from a dropdown. */
  readonly spots?: boolean;
  /** For `refs` — small toggles with All and None, rather than cards or a checkbox list. */
  readonly chips?: boolean;
  /** For `text` — an icon name, chosen from the icons the website draws. */
  readonly iconPicker?: boolean;
  /** For `boolean` — a bordered box with its hint inside: a choice travellers see the result of. */
  readonly boxed?: boolean;
  /**
   * For `textarea` — written with a toolbar (bold, lists, links…) and saved
   * as Markdown, which the app draws. A plain text is Markdown already.
   */
  readonly rich?: boolean;
  /**
   * The Khmer twin of this English field, typed by hand: `nameKm` is
   * `khmerOf: "name"`. A listing form shows it in the English field's place
   * when its language switch is on Khmer; other forms show it beside it.
   */
  readonly khmerOf?: string;
  readonly ties?: {
    readonly path: string;
    readonly by: string;
    readonly list: string;
    readonly key: string;
    /** What each tie keeps from before: a king's description of how he shaped the place. */
    readonly keep?: readonly string[];
  };
}

/** The rows a table's screens show, when it holds more than its page is about. */
export interface RowsWhere {
  readonly field: string;
  readonly values: readonly string[];
}

/** Whether a row is one its table's screens show (see `rowsWhere`). */
export function shownRow(definition: { readonly rowsWhere?: RowsWhere }, record: Readonly<Record<string, unknown>>): boolean {
  const rule = definition.rowsWhere;
  return !rule || rule.values.includes(String(record[rule.field] ?? ""));
}

export interface ResourceColumn {
  readonly name: string;
  readonly label: string;
  /**
   * How the cell reads. `approval` and `verified` are the table's own answers —
   * who approved the listing's request, and whether the place is verified on
   * evidence — rather than anything the row itself carries. `khmer` is how far
   * the Khmer is written: the API's `missingKhmer` list, or a Khmer name.
   */
  readonly kind?: "text" | "number" | "boolean" | "status" | "image" | "ref" | "refs" | "enum" | "approval" | "verified" | "khmer";
  readonly ref?: ReferenceKey;
  /** For `enum` — the labels its values read as; an unset value shows as a dash. */
  readonly options?: readonly EnumOption[];
  /** Hidden below `md`, so a phone shows only what identifies the row. */
  readonly secondary?: boolean;
  /**
   * A small line under the value, as the All Destinations table puts a
   * place under a name: the `text` field when it is set, else the row the
   * `ref` field points at, read as its name.
   */
  readonly detail?: {
    readonly text?: string;
    readonly ref?: { readonly field: string; readonly resource: ReferenceKey };
  };
}

export interface StatusOption {
  readonly value: string;
  readonly label: string;
  /** What the value means for visitors, in the form's status control. */
  readonly hint: string;
  readonly tone: BadgeTone;
}

/**
 * How a resource says whether it is on the public site.
 *
 * The taxonomy carries an `isActive` flag; destinations, stays and foods a
 * DRAFT → PUBLISHED → ARCHIVED status; partners ACTIVE or INACTIVE. Media rows
 * and memberships have no status at all, and declare none.
 */
export interface ResourceStatus {
  /** `isActive` for a boolean flag (shown as ACTIVE / INACTIVE), `status` for an enum column. */
  readonly field: "isActive" | "status";
  readonly options: readonly StatusOption[];
  /** What a new row starts as. */
  readonly initial: string;
  /** The value that puts a row on the public site. */
  readonly live: string;
  /** What the list's retire toggle sets. */
  readonly retired: string;
  /**
   * `publish` when the status is not part of the request body and moves only
   * through `PATCH /{id}/publish` and `/unpublish` — destinations.
   */
  readonly via?: "publish";
}

export interface ResourceDefinition {
  readonly key: ResourceKey;
  readonly label: string;
  readonly labelPlural: string;
  readonly group: ResourceGroup;
  readonly description: string;
  /** The field that names a row in headings, breadcrumbs, and `ref` dropdowns. */
  readonly titleField: string;
  /** Fields the list-screen search box looks through. */
  readonly searchFields: readonly string[];
  /** Sorted by this before display, when present. */
  readonly orderField?: string;
  readonly status?: ResourceStatus;
  readonly columns: readonly ResourceColumn[];
  readonly fields: readonly ResourceField[];
  /**
   * Rows fall into groups by this field, and pickers of them show one heading
   * per group in this order; rows in no listed group come last. Interests,
   * under Attraction Sites, Stays, Food, Water, Activities & Experiences,
   * Tourism Corridors.
   */
  readonly groupBy?: { readonly field: string; readonly order: readonly string[] };
  /**
   * The rows its screens show, when the table holds more than the page is
   * about: Tourism Regions lists the tourism regions, not the zones.
   */
  readonly rowsWhere?: RowsWhere;
  /** What its rows are called in a form's "already has" list, when its plural reads oddly there. */
  readonly siblingNoun?: string;
  /** Its form's error messages in the reader's language; English when absent. Filled by `localizeResource`. */
  readonly validation?: ValidationWords;
  /** A preview of the row as the website shows it: under the form, or beside it for an interest. */
  readonly preview?: "coverage" | "interest";
}

/** The API path is the key, unless a gallery, which is the one media table. */
/**
 * The same resource with one field left out, and its column with it: a stay's
 * or a food listing's owner is not asked of the account that is the owner — the
 * API fills their own name in and refuses any other, and the list of accounts is
 * not theirs to read.
 */
export function withoutField(definition: ResourceDefinition, name: string): ResourceDefinition {
  if (!definition.fields.some((field) => field.name === name)) return definition;
  return {
    ...definition,
    fields: definition.fields.filter((field) => field.name !== name),
    columns: definition.columns.filter((column) => column.name !== name),
  };
}

/** Whose photos a gallery holds: the API's `ownerType`. */
export type GalleryOwnerType = "DESTINATION" | "STAY" | "FOOD" | "CORRIDOR";

/** The four galleries are one API table, `/media`, told apart by whose photos they are. */
const MEDIA_OWNERS: Partial<Record<ResourceKey, GalleryOwnerType>> = {
  "destination-media": "DESTINATION",
  "stay-media": "STAY",
  "food-media": "FOOD",
  "corridor-media": "CORRIDOR",
};

/** The `ownerType` a gallery's rows carry, or null for any other resource. */
export function mediaOwnerType(key: ResourceKey): GalleryOwnerType | null {
  return MEDIA_OWNERS[key] ?? null;
}

/** Resources whose API path is not their dashboard key. */
const API_PATHS: Partial<Record<ResourceKey, string>> = { "badge-definitions": "/badges" };

export function resourcePath(key: ResourceKey): string {
  if (MEDIA_OWNERS[key]) return "/media";
  return API_PATHS[key] ?? `/${key}`;
}

/** A photo set hung off one row: the picture, whose it is, and the order shown. */
export interface Gallery {
  readonly file: ResourceField;
  readonly owner: ResourceField;
  readonly ownerRef: ReferenceKey;
  readonly category: ImageCategory;
}

/**
 * Whether this resource is a gallery, and what it hangs off.
 *
 * Read from the fields rather than declared, so a new gallery is one by having
 * the shape of one: a `mediaKey` upload and a required reference to the row it
 * belongs to. Screens use it to offer adding many photographs at once, which
 * is the only way anyone fills a gallery.
 */
export function galleryOf(definition: ResourceDefinition): Gallery | null {
  const file = definition.fields.find(
    (field) => field.kind === "image" && field.name === "mediaKey",
  );
  const owner = definition.fields.find((field) => field.kind === "ref" && field.required);
  if (!file?.imageCategory || !owner?.ref) return null;
  return { file, owner, ownerRef: owner.ref, category: file.imageCategory };
}


/* -------------------------------------------------------------------------- */
/* Order                                                                      */
/* -------------------------------------------------------------------------- */

/** How a list is ordered: what was added last, or by name. */
/** A to Z by name; in the order the rows were arranged (a gallery, a timeline); or what was added last. */
export type ResourceOrder = "name" | "shown" | "newest";

export const RESOURCE_ORDERS: readonly ResourceOrder[] = ["name", "shown", "newest"];

export function isResourceOrder(value: unknown): value is ResourceOrder {
  return value === "newest" || value === "name" || value === "shown";
}

/*
 * Rows whose order is their meaning: one listing's photos, dishes and rooms as
 * its host arranged them, the history pages by date, and the catalogue the
 * curators numbered — the tourism regions 1 to 9, the interests within their
 * group, the corridors. Every other list opens A to Z.
 */
const ARRANGED: ReadonlySet<ResourceKey> = new Set([
  "destination-media", "stay-media", "food-media", "corridor-media", "food-menu-items", "stay-rooms",
  "regions", "interests", "corridors", "amenities",
]);

/** Whether a list's own order is its meaning, so its pickers and tables keep it rather than going A to Z. */
export function isArranged(key: ResourceKey): boolean {
  return ARRANGED.has(key);
}

/**
 * The order a list opens in: A to Z by name, so every table reads the same
 * way. The lists arranged by hand or by date open in that order; any list can
 * be switched to "Newest first" to find a row just added.
 */
export function defaultOrder(definition: Pick<ResourceDefinition, "key" | "orderField">): ResourceOrder {
  return definition.orderField && ARRANGED.has(definition.key) ? "shown" : "name";
}

/**
 * Where a stored key can be read through this dashboard: the media proxy
 * forwards `/api/v1/media/files/{key}` to the API's public file endpoint.
 */
export function mediaPath(key: string): string {
  return `/api/v1/media/files/${key
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/")}`;
}

/* -------------------------------------------------------------------------- */
/* Status                                                                     */
/* -------------------------------------------------------------------------- */

/** The row's status as the status control and the filters spell it, or null when the resource has none. */
export function statusValueOf(
  definition: ResourceDefinition,
  record: Readonly<Record<string, unknown>> | null | undefined,
): string | null {
  const model = definition.status;
  if (!model || !record) return null;
  if (model.field === "isActive") return record.isActive === false ? "INACTIVE" : "ACTIVE";
  return typeof record.status === "string" ? record.status : null;
}

export function statusOption(
  definition: ResourceDefinition,
  value: string | null,
): StatusOption | undefined {
  return definition.status?.options.find((option) => option.value === value);
}

/**
 * What the form's status control offers for a row currently at `current`.
 *
 * A destination only moves through publish and unpublish, so its control is a
 * two-way choice — on the site, or where it is now — rather than a pick of
 * every value the column can hold.
 */
export function statusChoices(
  definition: ResourceDefinition,
  current: string | null,
): readonly StatusOption[] {
  const model = definition.status;
  if (!model) return [];
  if (model.via !== "publish") return model.options;
  const resting = current && current !== model.live ? current : model.initial;
  return model.options.filter(
    (option) => option.value === model.live || option.value === resting,
  );
}

/* -------------------------------------------------------------------------- */
/* Reference options                                                          */
/* -------------------------------------------------------------------------- */

/** The groups a field offers (`optionGroup`), none when it offers every group. */
export function optionGroupsOf(field: ResourceField): readonly string[] {
  return field.optionGroup == null ? [] : typeof field.optionGroup === "string" ? [field.optionGroup] : field.optionGroup;
}

/** Whether an option is in one of the groups a field offers; any option when it offers every group. */
export function inOptionGroup(field: ResourceField, option: ReferenceOption): boolean {
  const groups = optionGroupsOf(field);
  return groups.length === 0 || (option.group !== undefined && groups.includes(option.group));
}

/** One choice in a `ref`/`refs` control, and one label for a reference column. */
export interface ReferenceOption {
  readonly value: string;
  readonly label: string;
  readonly inactive: boolean;
  /** Ids this row stands for in other lists: a tourism region's own `categoryIds` and `tagIds`. */
  readonly links?: Readonly<Record<string, readonly string[]>>;
  /** The heading it is picked under, for a resource with `groupBy`: an interest's Food, Water… */
  readonly group?: string;
  /** The row's slug, when it has one: how `optionsFor` names a category or a tag. */
  readonly slug?: string;
  /** One line about it on a card. */
  readonly detail?: string;
  /** Where an amenity is offered: PROPERTY, ROOM or BOTH. */
  readonly level?: string;
  /** The icon an amenity is drawn with, by name. */
  readonly icon?: string;
}

/**
 * Lives here rather than beside the loader that fills it: the loader is
 * `server-only`, and client components need this type.
 */
export type ReferenceOptions = Readonly<
  Partial<Record<ReferenceKey, readonly ReferenceOption[]>>
>;

/* -------------------------------------------------------------------------- */
/* Form values                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Everything a form holds is form-native: a string, a checkbox boolean, or a
 * list of strings (selected ids, or one box per weekday). Numbers stay strings
 * until the payload is built so that a half-typed "-" or "12." does not become
 * `NaN` mid-keystroke. Ids are UUID strings end to end and are never parsed.
 */
export type FieldValue = string | boolean | string[];
export type FormValues = Record<string, FieldValue>;

const MULTI_KINDS: ReadonlySet<FieldKind> = new Set(["refs", "enums"]);

export function isMultiField(field: ResourceField): boolean {
  return MULTI_KINDS.has(field.kind);
}

function hoursOf(raw: unknown): string[] {
  const hours =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  return WEEKDAYS.map((day) => (typeof hours[day] === "string" ? hours[day] : ""));
}

/**
 * Whether a field applies to the row as it stands (see `visibleWhen`). A rule
 * by slug needs the list's `options`; without them it does not apply.
 */
export function isShown(field: ResourceField, values: FormValues, options?: ReferenceOptions): boolean {
  const rule = field.visibleWhen;
  if (!rule) return true;
  if (rule.bySlug) {
    const chosen = new Set(Array.isArray(values[rule.field]) ? (values[rule.field] as string[]) : []);
    return (options?.[rule.bySlug] ?? []).some((option) => chosen.has(option.value) && option.slug !== undefined && rule.values.includes(option.slug));
  }
  const current = values[rule.field];
  /* A list field is followed too: delivery apps appear once delivery is ticked. */
  if (Array.isArray(current)) return current.some((each) => rule.values.includes(each));
  return typeof current === "string" && rule.values.includes(current);
}

/**
 * The rows a `refs` field offers for the row as it stands (see `optionsFor`,
 * whose lists name rows by slug), always including whatever is already chosen
 * so it can be taken away. A kind the table does not name is offered them all.
 */
export function fittingOptions(
  field: ResourceField,
  options: readonly ReferenceOption[],
  values: FormValues,
): readonly ReferenceOption[] {
  const rule = field.optionsFor;
  if (!rule) return options;
  const kind = values[rule.field];
  const keep = typeof kind === "string" ? rule.keep[kind] : undefined;
  if (!keep) return options;
  const value = values[field.name];
  const chosen = Array.isArray(value) ? value : [];
  return options.filter((option) => (option.slug !== undefined && keep.includes(option.slug)) || chosen.includes(option.value));
}

/** The hint a field shows for the row as it stands (see `hintFor`). */
export function hintOf(field: ResourceField, values: FormValues): string | undefined {
  const rule = field.hintFor;
  if (!rule) return field.hint;
  const kind = values[rule.field];
  return (typeof kind === "string" ? rule.hints[kind] : undefined) ?? field.hint;
}

/** The label a field wears for the row as it stands (see `labelFor`). */
export function labelOf(field: ResourceField, values: FormValues): string {
  const rule = field.labelFor;
  if (!rule) return field.label;
  const kind = values[rule.field];
  return (typeof kind === "string" ? rule.labels[kind] : undefined) ?? field.label;
}

/**
 * The options a field offers for the row as it stands (see `optionsFor`),
 * always including whatever is already chosen so it can be taken away.
 */
export function offeredOptions(field: ResourceField, values: FormValues): readonly EnumOption[] {
  const every = field.options ?? [];
  if (!field.optionsFor) return every;
  const kind = values[field.optionsFor.field];
  const keep = typeof kind === "string" ? field.optionsFor.keep[kind] : undefined;
  if (!keep) return every;
  const value = values[field.name];
  const chosen = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  return every.filter((option) => keep.includes(option.value) || chosen.includes(option.value));
}

/** Each English field that has a Khmer twin, by the English field's name. */
export function khmerTwins(definition: ResourceDefinition): ReadonlyMap<string, ResourceField> {
  return new Map(definition.fields.filter((field) => field.khmerOf).map((field) => [field.khmerOf!, field]));
}

/**
 * The Khmer twins still empty while their English says something: what the
 * API refuses to publish without (its `missingKhmer`, worked out here as the
 * form stands).
 */
export function missingKhmer(definition: ResourceDefinition, values: FormValues): readonly string[] {
  const said = (value: FieldValue | undefined) => typeof value === "string" && value.trim().length > 0;
  return definition.fields
    .filter((field) => field.khmerOf && said(values[field.khmerOf]) && !said(values[field.name]))
    .map((field) => field.name);
}

/** Turns an API row into the values its form starts with. */
export function toFormValues(
  definition: ResourceDefinition,
  record: CatalogRecord | null,
): FormValues {
  const values: FormValues = {};

  for (const field of definition.fields) {
    /* A value the row carries without anyone having set it starts empty: see `blankUnless`. */
    const unset = Boolean(record && field.blankUnless && record[field.blankUnless] !== true);
    const raw = unset ? null : record?.[field.name];

    switch (field.kind) {
      case "boolean":
        /* A new row starts from `initial: "true"` where the API's default is yes — children welcome. */
        values[field.name] = record ? raw === true : field.initial === "true";
        break;
      case "refs":
      case "enums":
        values[field.name] = Array.isArray(raw) ? raw.map(String) : [];
        break;
      case "hours":
        values[field.name] = hoursOf(raw);
        break;
      case "time":
        values[field.name] = typeof raw === "string" ? raw.slice(0, 5) : (field.initial ?? "");
        break;
      default:
        values[field.name] =
          raw == null ? (record ? "" : (field.initial ?? "")) : String(raw);
    }

    /* The preview rides along in the form but is never part of the body. */
    if (field.kind === "image" && field.urlField) {
      const url = record?.[field.urlField];
      values[field.urlField] = typeof url === "string" ? url : "";
    }
  }

  /* Status lives outside `fields`: it has its own control and its own rules. */
  if (definition.status) {
    values.status = statusValueOf(definition, record) ?? definition.status.initial;
  }
  return values;
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

/** A form's error messages: `{label}`, `{min}`, `{max}`, `{other}` and `{values}` are filled in. In common.json, under validation. */
export interface ValidationWords {
  readonly required: string;
  readonly number: string;
  readonly whole: string;
  readonly below: string;
  readonly above: string;
  readonly chooseOne: string;
  readonly chooseMany: string;
  readonly hours: string;
  readonly date: string;
  readonly time: string;
  readonly photo: string;
  readonly maxLength: string;
  readonly paired: string;
  readonly status: string;
}

export const ENGLISH_VALIDATION: ValidationWords = {
  required: "{label} is required",
  number: "{label} must be a number",
  whole: "{label} must be a whole number",
  below: "{label} cannot be below {min}",
  above: "{label} cannot be above {max}",
  chooseOne: "Choose a {label}",
  chooseMany: "Choose at least one {label}",
  hours: "Hours look like 07:00-22:00",
  date: "{label} must be a date",
  time: "{label} must be a time, e.g. 14:00",
  photo: "Upload the photo here. A pasted key looks like general/…/photo.jpg; a web link cannot be used.",
  maxLength: "{label} takes at most {max} characters",
  paired: "{label} goes with {other}: fill in both, or neither",
  status: "Status must be one of {values}",
};

/** A message with its values filled in. */
function say(template: string, values: Readonly<Record<string, string | number>>): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => (name in values ? String(values[name]) : whole));
}

function numberSchema(field: ResourceField, integer: boolean, words: ValidationWords) {
  return z
    .string()
    .trim()
    .superRefine((value, context) => {
      if (!value) {
        if (field.required) {
          context.addIssue({ code: "custom", message: say(words.required, { label: field.label }) });
        }
        return;
      }

      const parsed = Number(value);
      if (!Number.isFinite(parsed)) {
        context.addIssue({ code: "custom", message: say(words.number, { label: field.label }) });
        return;
      }
      if (integer && !Number.isInteger(parsed)) {
        context.addIssue({ code: "custom", message: say(words.whole, { label: field.label }) });
        return;
      }
      if (field.min != null && parsed < field.min) {
        context.addIssue({ code: "custom", message: say(words.below, { label: field.label, min: field.min }) });
      }
      if (field.max != null && parsed > field.max) {
        context.addIssue({ code: "custom", message: say(words.above, { label: field.label, max: field.max }) });
      }
    });
}

function fieldSchema(field: ResourceField, words: ValidationWords): z.ZodType {
  switch (field.kind) {
    case "boolean":
      return z.boolean();

    case "refs":
    case "enums":
      return field.required
        ? z.array(z.string()).min(1, say(field.single ? words.chooseOne : words.chooseMany, { label: field.label.toLowerCase() }))
        : z.array(z.string());

    case "hours":
      return z
        .array(z.string())
        .refine(
          (days) => days.every((day) => !day.trim() || OPENING_HOURS.test(day.trim())),
          words.hours,
        );

    case "number":
      return numberSchema(field, true, words);

    case "decimal":
      return numberSchema(field, false, words);

    case "date":
      return z
        .string()
        .trim()
        .refine(
          (value) => (!field.required && !value) || /^\d{4}-\d{2}-\d{2}$/.test(value),
          say(field.required ? words.required : words.date, { label: field.label }),
        );

    case "time":
      return z
        .string()
        .trim()
        .refine(
          (value) => (!field.required && !value) || /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value),
          say(field.required ? words.required : words.time, { label: field.label }),
        );

    case "image":
      return z
        .string()
        .trim()
        .refine(
          (value) => !field.required || value.length > 0,
          say(words.required, { label: field.label }),
        )
        .refine(
          (value) => !value || MEDIA_KEY.test(value),
          words.photo,
        );

    default: {
      const required = field.required
        ? z.string().trim().min(1, say(words.required, { label: field.label }))
        : z.string();
      const shape = field.pattern ? new RegExp(field.pattern.source) : null;
      const text = shape
        ? required.refine((value) => !value.trim() || shape.test(value.trim()), field.pattern!.message)
        : required;
      return field.maxLength
        ? text.refine(
            (value) => value.trim().length <= field.maxLength!,
            say(words.maxLength, { label: field.label, max: field.maxLength! }),
          )
        : text;
    }
  }
}

/** A stored picture's key as the API takes it: `{folder}/{uploader uuid}/{file}.{jpg|png|webp|gif|avif}`. */
export const MEDIA_KEY =
  /^[a-z]+\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[a-z0-9]+(?:-[a-z0-9]+)*\.(?:jpg|png|webp|gif|avif)$/;

/** One day's opening hours as the API takes them: `07:00-22:00`, or `closed`. */
export const OPENING_HOURS = /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-4]):[0-5]\d$|^closed$/;

/** The Zod schema React Hook Form resolves this resource's form against. */
export function resourceSchema(definition: ResourceDefinition) {
  const words = definition.validation ?? ENGLISH_VALIDATION;
  const shape: Record<string, z.ZodType> = {};
  if (definition.status) {
    const values = definition.status.options.map((option) => option.value);
    shape.status = z.string().refine(
      (value) => values.includes(value),
      say(words.status, { values: values.join(", ") }),
    );
  }
  for (const field of definition.fields) {
    shape[field.name] = fieldSchema(field, words);
  }
  /* A pair is filled together or left empty together: the API refuses half a centre. */
  const paired = definition.fields.filter((field) => field.pairedWith);
  if (!paired.length) return z.object(shape);
  return z.object(shape).superRefine((values, context) => {
    const filled = (name: string) => typeof values[name] === "string" && (values[name] as string).trim().length > 0;
    for (const field of paired) {
      const other = definition.fields.find((each) => each.name === field.pairedWith);
      if (!other || filled(field.name) || !filled(other.name)) continue;
      context.addIssue({
        code: "custom",
        path: [field.name],
        message: say(words.paired, { label: field.label, other: other.label.toLowerCase() }),
      });
    }
  });
}

/* -------------------------------------------------------------------------- */
/* Request bodies                                                             */
/* -------------------------------------------------------------------------- */

function numberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/** A single id or enum value: kept as the string it is, or null when unset. */
function textOrNull(value: FieldValue | undefined): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Builds the JSON the Spring controller expects.
 *
 * Ids travel as the UUID strings they are — a `ref` is one string, `refs` a
 * list of them — and nothing here ever runs one through `Number`. The API
 * stamps who created or changed a row from the token, so no user id is sent.
 *
 * The awkward part is clearing a value. `PUT` leaves a `null` column alone, so
 * an editor who deletes a description and saves would watch it come back. On
 * update an emptied text box is therefore sent as `""`, which does overwrite;
 * on create it stays `null`, because a fresh row should hold NULL rather than
 * an empty string. A slug or a unique code is the exception (`blank: "null"`):
 * an empty one must mean "generate it" or "none", never a second `""`.
 *
 * The same trick has no equivalent for an optional reference: there is no
 * non-null id that means "no parent". Such a dropdown can be pointed elsewhere
 * but not emptied.
 */
export function toRequestBody(
  definition: ResourceDefinition,
  values: FormValues,
  options: { readonly mode: "create" | "update" },
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  const updating = options.mode === "update";

  for (const field of definition.fields) {
    /* Written by its own endpoint, or fixed once the row exists. */
    if (field.separate || field.inverse || field.ties || (updating && field.createOnly)) continue;
    const value = values[field.name];

    switch (field.kind) {
      case "boolean":
        body[field.name] = value === true;
        break;

      case "refs":
      case "enums": {
        const chosen = Array.isArray(value) ? value.filter((item) => item.trim().length > 0) : [];
        body[field.name] = field.numeric ? chosen.map(Number).filter(Number.isInteger) : chosen;
        break;
      }

      case "ref":
      case "enum":
      case "date":
      case "time":
        body[field.name] = textOrNull(value);
        break;

      case "number":
      case "decimal":
        body[field.name] = typeof value === "string" ? numberOrNull(value) : null;
        break;

      case "hours": {
        const days = Array.isArray(value) ? value : [];
        const hours = Object.fromEntries(
          WEEKDAYS.flatMap((day, index) => {
            const text = days[index]?.trim();
            return text ? [[day, text]] : [];
          }),
        );
        body[field.name] = Object.keys(hours).length || updating ? hours : null;
        break;
      }

      default: {
        const text = typeof value === "string" ? value.trim() : "";
        body[field.name] = text || (updating && field.blank !== "null" ? "" : null);
      }
    }
  }

  const status = definition.status;
  if (status && status.via !== "publish") {
    const value = typeof values.status === "string" ? values.status : status.initial;
    if (status.field === "isActive") body.isActive = value === status.live;
    else body.status = value;
  }

  const ownerType = mediaOwnerType(definition.key);
  if (ownerType) body.ownerType = ownerType;

  return body;
}

/**
 * The writes that follow the row's own: one `PUT` per `separate` field. On a
 * create an empty list is skipped — there is nothing yet to replace.
 */
export function separateWrites(
  definition: ResourceDefinition,
  values: FormValues,
  id: string,
  mode: "create" | "update",
): readonly { readonly path: string; readonly body: Record<string, unknown> }[] {
  return definition.fields.flatMap((field) => {
    if (!field.separate) return [];
    const value = values[field.name];
    const list = Array.isArray(value) ? value.filter(Boolean) : [];
    if (mode === "create" && !list.length) return [];
    return [
      {
        path: `${field.separate.path}/${id}`,
        body: { [field.separate.bodyKey]: list },
      },
    ];
  });
}
