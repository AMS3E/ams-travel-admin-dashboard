import type { ResourceDefinition, ResourceField, ValidationWords } from "@/features/catalog/resource";

/*
 * The registry is written in English; resources.json holds each resource's
 * words in the reader's language, by resource, field and option. A word the
 * file does not have yet stays in English. Keys are made by
 * scripts/extract-resource-text.mjs, which writes the English file.
 */

type Words = { readonly [key: string]: string | Words | undefined };

/** next-intl reads a dot as nesting, so a key never holds one. */
export const textKeyOf = (value: string) => value.replaceAll(".", "_");

const word = (words: Words | undefined, key: string): string | undefined => {
  const value = words?.[textKeyOf(key)];
  return typeof value === "string" && value.trim() ? value : undefined;
};
const branch = (words: Words | undefined, key: string): Words | undefined => {
  const value = words?.[textKeyOf(key)];
  return value && typeof value === "object" ? value : undefined;
};

function relabel(source: Readonly<Record<string, string>>, words: Words | undefined): Readonly<Record<string, string>> {
  return Object.fromEntries(Object.entries(source).map(([kind, text]) => [kind, word(words, kind) ?? text]));
}

function localizeField(field: ResourceField, words: Words | undefined): ResourceField {
  if (!words) return field;
  const options = branch(words, "options");
  return {
    ...field,
    label: word(words, "label") ?? field.label,
    hint: word(words, "hint") ?? field.hint,
    section: word(words, "section") ?? field.section,
    pattern: field.pattern ? { ...field.pattern, message: word(words, "pattern") ?? field.pattern.message } : undefined,
    options: field.options?.map((option) => ({ ...option, label: word(options, option.value) ?? option.label })),
    labelFor: field.labelFor ? { ...field.labelFor, labels: relabel(field.labelFor.labels, branch(words, "labelFor")) } : undefined,
    hintFor: field.hintFor ? { ...field.hintFor, hints: relabel(field.hintFor.hints, branch(words, "hintFor")) } : undefined,
  };
}

/** A definition in the reader's language: the same shape, plain data, so it crosses from server to client. */
export function localizeResource(
  definition: ResourceDefinition,
  words: Words | undefined,
  validation: ValidationWords | undefined,
): ResourceDefinition {
  const columns = branch(words, "columns");
  const status = branch(words, "status");
  const fields = branch(words, "fields");
  const chips = branch(words, "chips");
  return {
    ...definition,
    label: word(words, "label") ?? definition.label,
    labelPlural: word(words, "labelPlural") ?? definition.labelPlural,
    description: word(words, "description") ?? definition.description,
    siblingNoun: word(words, "siblingNoun") ?? definition.siblingNoun,
    columns: definition.columns.map((column) => ({ ...column, label: word(columns, column.name) ?? column.label })),
    status: definition.status
      ? {
          ...definition.status,
          options: definition.status.options.map((option) => {
            const text = branch(status, option.value);
            return { ...option, label: word(text, "label") ?? option.label, hint: word(text, "hint") ?? option.hint };
          }),
        }
      : undefined,
    fields: definition.fields.map((field) => localizeField(field, branch(fields, field.name))),
    groupBy: definition.groupBy?.chips
      ? {
          ...definition.groupBy,
          chips: definition.groupBy.chips.map((chip) => ({ ...chip, label: word(chips, chip.value) ?? chip.label })),
        }
      : definition.groupBy,
    validation: validation ?? definition.validation,
  };
}

/** The pieces of the message tree a definition is translated from. */
export interface ResourceMessages {
  readonly resources?: unknown;
  readonly common?: { readonly validation?: unknown };
}

/** `localizeResource` with its words taken from next-intl's messages. */
export function localizeWith(definition: ResourceDefinition, messages: ResourceMessages): ResourceDefinition {
  const all = messages.resources as Words | undefined;
  return localizeResource(definition, branch(all, definition.key), messages.common?.validation as ValidationWords | undefined);
}
