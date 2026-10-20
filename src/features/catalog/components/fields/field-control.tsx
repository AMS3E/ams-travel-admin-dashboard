"use client";

import { Controller, useFormContext, useWatch } from "react-hook-form";
import dynamic from "next/dynamic";
import { TriangleAlert, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { WEEKDAYS } from "@/features/catalog/api/contracts";
import { ChipToggles, ChoiceTiles, IconPicker } from "@/features/catalog/components/fields/choice-tiles";
import { SpotList, type SpotContext } from "@/features/catalog/components/fields/spot-list";
import { ImageField } from "@/features/catalog/components/fields/image-field";
import { MultiSelectField } from "@/features/catalog/components/fields/multi-select-field";
import { inOptionGroup, optionGroupsOf } from "@/features/catalog/resource";
import { useDates } from "@/i18n/use-dates";
import type {
  FormValues,
  ReferenceOption,
  ResourceField,
  StatusOption,
} from "@/features/catalog/resource";

interface FieldControlProps {
  readonly field: ResourceField;
  /** Choices for a `ref`/`refs` field; empty for every other kind. */
  readonly options: readonly ReferenceOption[];
  /**
   * Shown but not editable: a value fixed when the row was created, such as
   * which partner a membership belongs to.
   */
  readonly locked?: boolean;
  /** What already belongs to each chosen option (see `siblings`). */
  readonly siblings?: readonly SiblingGroup[];
  /**
   * For `placeAmong`: the other rows of the list, top to bottom, or undefined
   * while what the list is (a region) is not chosen; `editing` names the
   * empty choice "where it is now" rather than "at the end".
   */
  readonly places?: readonly string[];
  readonly editing?: boolean;
  /** For `spots`: the row being placed, as the list shows it. */
  readonly spot?: SpotContext;
}

/** The rows already in one chosen region, zone or group. */
export interface SiblingGroup {
  readonly label: string;
  readonly names: readonly string[];
  /** What the rows are called: "categories", and one of them: "category". */
  readonly noun: string;
  readonly one: string;
  /** The one that has the name being typed, if any. */
  readonly clash?: string;
}

/** The card icon of a list the tile tables do not know. */
const TILE_ICONS: Partial<Record<string, LucideIcon>> = {};

type ControlWords = ReturnType<typeof useTranslations<"forms.controls">>;

/** What a locked field reads as: the chosen option's label rather than its id. */
function lockedText(
  field: ResourceField,
  value: FormValues[string] | undefined,
  options: readonly ReferenceOption[],
  t: ControlWords,
): string {
  if (typeof value !== "string" || !value) return t("notSet");
  if (field.kind === "ref") {
    return options.find((option) => option.value === value)?.label ?? t("outside");
  }
  if (field.kind === "enum") {
    return field.options?.find((option) => option.value === value)?.label ?? value;
  }
  return value;
}

/**
 * Renders one declared field as the control its kind calls for.
 *
 * This switch is the only place that knows a `refs` field is a checkbox list
 * and a `decimal` is a number input — which is why adding a field to the
 * registry is enough to make it appear, correctly wired, on its form.
 */
/* Written in the browser only, like the map: the editor has no server rendering. */
const RichText = dynamic(() => import("@/features/catalog/components/fields/rich-text"), {
  ssr: false,
  loading: () => <div className="min-h-40 rounded-md border border-line-strong bg-paper" />,
});

export function FieldControl({ field, options, locked = false, siblings, places, editing = false, spot }: FieldControlProps) {
  const t = useTranslations("forms.controls");
  const { dates } = useDates();
  const {
    control,
    register,
    getValues,
    formState: { errors },
  } = useFormContext<FormValues>();

  const error = errors[field.name]?.message as string | undefined;
  const span = field.span === 2 ? "md:col-span-2" : undefined;

  if (locked) {
    return (
      <FormField
        className={span}
        hint={t("lockedHint")}
        label={field.label}
      >
        {(aria) => (
          <p
            aria-describedby={aria["aria-describedby"]}
            className="rounded-md border border-line bg-sand px-3 py-2 text-sm text-ink-soft"
            id={aria.id}
          >
            {lockedText(field, getValues(field.name), options, t)}
          </p>
        )}
      </FormField>
    );
  }

  /* A region, a zone or a group as cards, with what already belongs to the choice under them. */
  if (field.tiles && ["ref", "refs", "enum", "enums"].includes(field.kind)) {
    const multiple = field.kind === "refs" || field.kind === "enums";
    const choices: readonly ReferenceOption[] =
      field.kind === "ref" || field.kind === "refs"
        ? options
        : (field.options ?? []).map((option) => ({ ...option, inactive: false }));
    return (
      <FormField className="md:col-span-2" error={error} hint={field.hint} label={field.label} required={field.required}>
        {(aria) => (
          <div className="flex flex-col gap-2.5">
            <Controller
              control={control}
              name={field.name}
              render={({ field: bound }) => (
                <ChoiceTiles
                  describedBy={aria["aria-describedby"]}
                  icon={field.ref ? TILE_ICONS[field.ref] : undefined}
                  invalid={aria["aria-invalid"]}
                  labelledBy={aria["aria-labelledby"]}
                  multiple={multiple}
                  onChange={bound.onChange}
                  options={choices}
                  value={multiple ? (Array.isArray(bound.value) ? bound.value : []) : typeof bound.value === "string" ? bound.value : ""}
                />
              )}
            />
            {siblings?.length ? <SiblingList groups={siblings} /> : null}
          </div>
        )}
      </FormField>
    );
  }

  /* Small toggles with All and None. */
  if (field.chips && field.kind === "refs") {
    return (
      <FormField className="md:col-span-2" error={error} hint={field.hint} label={field.label} required={field.required}>
        {(aria) => (
          <Controller
            control={control}
            name={field.name}
            render={({ field: bound }) => (
              <ChipToggles
                describedBy={aria["aria-describedby"]}
                labelledBy={aria["aria-labelledby"]}
                onChange={bound.onChange}
                options={options}
                value={Array.isArray(bound.value) ? bound.value.map(String) : []}
              />
            )}
          />
        )}
      </FormField>
    );
  }

  /* A row's place, chosen by clicking a spot in the list itself. */
  if (field.placeAmong && field.spots) {
    return (
      <FormField className="md:col-span-2" error={error} hint={places ? field.hint : undefined} label={field.label}>
        {(aria) =>
          places ? (
            <Controller
              control={control}
              name={field.name}
              render={({ field: bound }) => (
                <SpotList
                  {...spot}
                  describedBy={aria["aria-describedby"]}
                  editing={editing}
                  labelledBy={aria["aria-labelledby"]}
                  onChange={bound.onChange}
                  places={places}
                  title={spot?.title ?? ""}
                  value={typeof bound.value === "string" ? bound.value : String(bound.value ?? "")}
                />
              )}
            />
          ) : (
            <p className="rounded-md border border-dashed border-line-strong px-3 py-2.5 text-sm text-muted" id={aria.id}>
              {t("chooseFirst", { what: field.placeAmong === "groupName" ? "group" : "region" })}
            </p>
          )
        }
      </FormField>
    );
  }

  /* A row's place in its list, said as "after Mahendraparvata" rather than a number. */
  if (field.placeAmong) {
    const last = places?.at(-1);
    return (
      <FormField className="md:col-span-2" error={error} hint={places ? field.hint : field.placeAmong === "groupName" ? t("chooseGroupFirst") : t("chooseRegionFirst")} label={field.label}>
        {(aria) => (
          <Select {...aria} {...register(field.name)} disabled={!places}>
            <option value="">{editing ? t("whereNow") : last ? t("atEndAfter", { name: last }) : t("atEnd")}</option>
            {(places ?? []).map((_, index) => (
              <option key={index} value={String(index)}>
                {index + 1}. {index === 0 ? t("firstBefore", { name: places![0] }) : t("after", { name: places![index - 1] })}
              </option>
            ))}
            {places?.length ? (
              <option value={String(places.length)}>
                {places.length + 1}. {t("lastAfter", { name: last ?? "" })}
              </option>
            ) : null}
          </Select>
        )}
      </FormField>
    );
  }

  /* An icon, chosen by sight from those the website draws. */
  if (field.iconPicker) {
    return (
      <FormField className="md:col-span-2" error={error} hint={field.hint} label={field.label} required={field.required}>
        {(aria) => (
          <Controller
            control={control}
            name={field.name}
            render={({ field: bound }) => (
              <IconPicker
                describedBy={aria["aria-describedby"]}
                labelledBy={aria["aria-labelledby"]}
                onChange={bound.onChange}
                value={typeof bound.value === "string" ? bound.value : ""}
              />
            )}
          />
        )}
      </FormField>
    );
  }

  /* A checkbox reads as "label after control", not as a labelled field. */
  if (field.kind === "boolean" && field.boxed) {
    return (
      <div className={span}>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line-strong bg-paper p-3.5 transition-colors hover:border-line-hover has-checked:border-teal has-checked:bg-teal-soft/40">
          <Checkbox className="mt-0.5" {...register(field.name)} />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-ink select-none">{field.label}</span>
            {field.hint ? <span className="mt-0.5 block text-xs text-muted">{field.hint}</span> : null}
          </span>
        </label>
      </div>
    );
  }

  if (field.kind === "boolean") {
    return (
      <div className={span}>
        <label className="flex cursor-pointer items-center gap-2.5 py-2">
          <Checkbox {...register(field.name)} />
          <span className="text-sm font-semibold text-ink-soft select-none">
            {field.label}
          </span>
        </label>
        {field.hint ? (
          <small className="text-2xs text-muted">{field.hint}</small>
        ) : null}
      </div>
    );
  }

  return (
    <FormField
      className={span}
      error={error}
      hint={field.hint}
      label={field.label}
      required={field.required}
    >
      {(aria) => {
        /* A Khmer twin says it is Khmer, for the font and the spell checker. */
        const lang = field.khmerOf ? "km" : undefined;
        switch (field.kind) {
          case "textarea":
            if (field.rich) {
              return (
                <div className="contents" lang={lang}>
                  <Controller
                    control={control}
                    name={field.name}
                    render={({ field: bound }) => (
                      <RichText
                        describedBy={aria["aria-describedby"]}
                        id={aria.id}
                        invalid={Boolean(aria["aria-invalid"])}
                        onBlur={bound.onBlur}
                        onChange={bound.onChange}
                        value={typeof bound.value === "string" ? bound.value : ""}
                      />
                    )}
                  />
                </div>
              );
            }
            return <Textarea {...aria} {...register(field.name)} lang={lang} />;

          case "number":
          case "decimal":
            return (
              <Input
                {...aria}
                {...register(field.name)}
                max={field.max}
                min={field.min}
                step={field.step ?? (field.kind === "number" ? 1 : "any")}
                type="number"
              />
            );

          case "date":
            return <Input {...aria} {...register(field.name)} type="date" />;

          case "time":
            return <Input {...aria} {...register(field.name)} type="time" />;

          case "enum":
            return (
              <Select {...aria} {...register(field.name)}>
                <option value="">
                  {field.required ? t("chooseA", { label: field.label.toLowerCase() }) : t("notSet")}
                </option>
                {(field.options ?? []).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            );

          case "ref":
            return (
              <Select {...aria} {...register(field.name)}>
                <option value="">
                  {field.required ? t("chooseA", { label: field.label.toLowerCase() }) : t("notSet")}
                </option>
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                    {option.inactive ? ` ${t("retired")}` : ""}
                  </option>
                ))}
              </Select>
            );

          case "refs":
          case "enums": {
            const choices: readonly ReferenceOption[] =
              field.kind === "refs"
                ? options
                : (field.options ?? []).map((option) => ({
                    ...option,
                    inactive: false,
                  }));

            return (
              <Controller
                control={control}
                name={field.name}
                render={({ field: bound }) => {
                  const chosen: string[] = Array.isArray(bound.value) ? bound.value : [];
                  /* `optionGroup`: one shelf's interests, and any chosen from elsewhere so they can be taken away. */
                  const shown = field.optionGroup
                    ? choices.filter((option) => inOptionGroup(field, option) || chosen.includes(option.value))
                    : choices;
                  return (
                    <MultiSelectField
                      describedBy={aria["aria-describedby"]}
                      emptyLabel={
                        field.optionGroup
                          ? t("noInterests", { groups: optionGroupsOf(field).join(", ") })
                          : t("noneExist", { label: field.label.toLowerCase() })
                      }
                      invalid={aria["aria-invalid"]}
                      labelledBy={aria["aria-labelledby"]}
                      onChange={bound.onChange}
                      options={shown}
                      ordered={field.ordered}
                      value={chosen}
                    />
                  );
                }}
              />
            );
          }

          case "image":
            return (
              <ImageControl
                describedBy={aria["aria-describedby"]}
                field={field}
                id={aria.id}
                invalid={aria["aria-invalid"]}
              />
            );

          case "hours":
            return (
              <Controller
                control={control}
                name={field.name}
                render={({ field: bound }) => {
                  const days = Array.isArray(bound.value) ? bound.value : [];
                  return (
                    <div
                      aria-describedby={aria["aria-describedby"]}
                      aria-labelledby={aria["aria-labelledby"]}
                      className="grid gap-2 sm:grid-cols-2"
                      id={aria.id}
                      role="group"
                    >
                      {WEEKDAYS.map((day, index) => (
                        <label className="flex items-center gap-2 text-xs text-ink-soft" key={day}>
                          {/* The week starts on Monday here; the weekday names start on Sunday. */}
                          <span className="w-20 shrink-0 font-semibold">{dates.weekdays[(index + 1) % 7]}</span>
                          <Input
                            className="h-8 text-sm"
                            onChange={(event) => {
                              const next = WEEKDAYS.map((_, at) => days[at] ?? "");
                              next[index] = event.target.value;
                              bound.onChange(next);
                            }}
                            placeholder={t("closed")}
                            value={days[index] ?? ""}
                          />
                        </label>
                      ))}
                    </div>
                  );
                }}
              />
            );

          default:
            /* A name, with what already exists under it, so the same one is not made twice. */
            return siblings?.length ? (
              <div className="flex flex-col gap-2">
                <Input {...aria} {...register(field.name)} type="text" />
                <SiblingList groups={siblings} />
              </div>
            ) : (
              <Input {...aria} {...register(field.name)} lang={lang} type="text" />
            );
        }
      }}
    </FormField>
  );
}

/** What is already in each chosen region, zone or group; the one with the name being typed is marked. */
function SiblingList({ groups }: { readonly groups: readonly SiblingGroup[] }) {
  const t = useTranslations("forms.controls.siblings");
  const b = (chunks: React.ReactNode) => <span className="font-medium">{chunks}</span>;
  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-line bg-sand/60 px-3 py-2.5" role="status">
      {groups.map((group) => (
        <div className="flex flex-col gap-1.5" key={group.label}>
          <p className="text-xs text-ink-soft">
            {!group.label
              ? group.names.length === 0
                ? t("noneYet")
                : t("already", { count: group.names.length, one: group.one, noun: group.noun })
              : group.names.length === 0
                ? t.rich("groupNone", { label: group.label, noun: group.noun, b })
                : t.rich("groupHas", { label: group.label, count: group.names.length, one: group.one, noun: group.noun, b })}
          </p>
          {group.names.length ? (
            <ul className="flex flex-wrap gap-1">
              {group.names.map((name) => (
                <li
                  className={
                    name === group.clash
                      ? "rounded-full border border-heritage/40 bg-heritage-soft px-2 py-0.5 text-2xs font-medium text-heritage"
                      : "rounded-full border border-line bg-paper px-2 py-0.5 text-2xs text-ink-soft"
                  }
                  key={name}
                >
                  {name}
                </li>
              ))}
            </ul>
          ) : null}
          {group.clash ? (
            <p className="flex items-center gap-1 text-xs font-medium text-heritage">
              <TriangleAlert aria-hidden className="size-3.5 shrink-0" />
              {t("clash", { clash: group.clash })}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/** The upload control, which also keeps the preview URL beside the key it saves. */
function ImageControl({
  field,
  id,
  describedBy,
  invalid,
}: {
  readonly field: ResourceField;
  readonly id: string;
  readonly describedBy?: string;
  readonly invalid?: boolean;
}) {
  const { control, setValue } = useFormContext<FormValues>();
  const urlField = field.urlField ?? `${field.name}__preview`;
  const previewUrl = useWatch({ control, name: urlField });

  return (
    <Controller
      control={control}
      name={field.name}
      render={({ field: bound }) => (
        <ImageField
          category={field.imageCategory ?? "general"}
          describedBy={describedBy}
          id={id}
          invalid={invalid}
          onChange={(key, url) => {
            bound.onChange(key);
            setValue(urlField, url);
          }}
          previewUrl={typeof previewUrl === "string" ? previewUrl : ""}
          value={typeof bound.value === "string" ? bound.value : ""}
        />
      )}
    />
  );
}

/** The status control: the choices come from the resource's own status model. */
export function StatusControl({ options }: { readonly options: readonly StatusOption[] }) {
  const t = useTranslations("forms.controls");
  const { register } = useFormContext<FormValues>();

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="record-status">{t("status")}</Label>
      <Select id="record-status" {...register("status")}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label} — {option.hint}
          </option>
        ))}
      </Select>
    </div>
  );
}
