import { WEEKDAYS } from "@/features/catalog/api/contracts";
import {
  isShown,
  labelOf,
  type FormValues,
  type ReferenceOptions,
  type ResourceDefinition,
  type ResourceField,
} from "@/features/catalog/resource";
import { byName } from "@/features/catalog/resources";
import { isFilled, type ListingStep, type ReadinessCheck } from "@/features/catalog/components/listing-form/steps";

/**
 * A listing as its reviewer reads it: every answer its author gave, under the
 * steps of the form they filled in, and each as a traveller would read it —
 * "Free parking", not `FREE`; "Mon · 07:00-22:00", not seven boxes.
 */

/** One answer: what the form asked, and what was given. */
export interface ReviewRow {
  readonly name: string;
  readonly label: string;
  /** A line, several (a list, a week of hours), or null when nothing was given. */
  readonly value: string | readonly string[] | null;
  readonly required: boolean;
  /** Prose that keeps its line breaks, and takes the width. */
  readonly prose: boolean;
  /** A web address, opened from the review. */
  readonly href: string | null;
}

export interface ReviewGroup {
  readonly title?: string;
  readonly rows: readonly ReviewRow[];
}

type Weekday = (typeof WEEKDAYS)[number];

/** The words an answer is written with, from `publishing.answers`; English when none are given. */
export interface AnswerWords {
  readonly yes: string;
  readonly no: string;
  /** A chosen row that is gone from its list. */
  readonly gone: string;
  readonly closed: string;
  readonly days: Readonly<Record<Weekday, string>>;
}

const ENGLISH_ANSWERS: AnswerWords = {
  yes: "Yes",
  no: "No",
  gone: "An entry no longer listed",
  closed: "Closed",
  days: { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" },
};

const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

/** The labels of what was chosen, A to Z unless the choices are a scale or an order. */
function labels(field: ResourceField, chosen: readonly string[], lookup: (value: string) => string): string[] {
  const named = chosen.filter((value) => value.trim()).map(lookup);
  return field.scale || field.ordered
    ? (field.options ? field.options.filter((option) => chosen.includes(option.value)).map((option) => option.label) : named)
    : named.toSorted(byName);
}

/** What one field holds, as a person reads it; null when nothing was given. */
export function reviewValue(
  field: ResourceField,
  values: FormValues,
  options: ReferenceOptions,
  words: AnswerWords = ENGLISH_ANSWERS,
): string | readonly string[] | null {
  const raw = values[field.name];
  /* A tick box always says something: no is an answer too. */
  if (field.kind === "boolean") return raw === true ? words.yes : words.no;
  if (!isFilled(raw)) return null;

  const optionLabel = (value: string) => field.options?.find((option) => option.value === value)?.label ?? value;
  const rowLabel = (value: string) =>
    (field.ref ? options[field.ref]?.find((option) => option.value === value)?.label : undefined) ?? words.gone;

  switch (field.kind) {
    case "enum":
      return optionLabel(text(raw));
    case "enums":
      return labels(field, Array.isArray(raw) ? raw : [], optionLabel);
    case "ref":
      return rowLabel(text(raw));
    case "refs":
      return labels(field, Array.isArray(raw) ? raw : [], rowLabel);
    case "hours": {
      const days = Array.isArray(raw) ? raw : [];
      return WEEKDAYS.flatMap((day, index) => {
        const hours = text(days[index]);
        return hours ? [`${words.days[day]} · ${hours === "closed" ? words.closed : hours}`] : [];
      });
    }
    default:
      return text(raw);
  }
}

/** A web address worth opening from the review: only one that says it is one. */
function linkOf(value: string | readonly string[] | null): string | null {
  return typeof value === "string" && /^https?:\/\/\S+$/i.test(value) ? value : null;
}

/**
 * A step's answers, group by group. What does not apply to this listing — a
 * breakfast price with no breakfast — is left out, as the form leaves it out;
 * photos are shown on their own, and what the form works out is never asked.
 */
export function reviewGroups(
  definition: ResourceDefinition,
  step: ListingStep,
  values: FormValues,
  options: ReferenceOptions,
  words: AnswerWords = ENGLISH_ANSWERS,
): ReviewGroup[] {
  const fields = new Map(definition.fields.map((field) => [field.name, field]));
  return step.groups
    .map((group) => ({
      title: group.title,
      rows: group.fields.flatMap((name): ReviewRow[] => {
        const field = fields.get(name);
        if (!field || field.kind === "image" || field.derived || !isShown(field, values, options)) return [];
        const value = reviewValue(field, values, options, words);
        return [{
          name,
          label: labelOf(field, values),
          value,
          required: Boolean(field.required),
          prose: field.kind === "textarea",
          href: linkOf(value),
        }];
      }),
    }))
    .filter((group) => group.rows.length > 0);
}

/** One line of the checklist, answered. */
export interface CheckedLine {
  readonly label: string;
  readonly done: boolean;
  readonly required: boolean;
}

/** The form's "ready to publish" checklist, answered for the listing as it was sent. */
export function checkedLines(checks: readonly ReadinessCheck[], values: FormValues): CheckedLine[] {
  return checks.map((check) => ({
    label: check.label,
    done: check.all
      ? check.fields.every((name) => isFilled(values[name]))
      : check.fields.some((name) => isFilled(values[name])),
    required: Boolean(check.required),
  }));
}
