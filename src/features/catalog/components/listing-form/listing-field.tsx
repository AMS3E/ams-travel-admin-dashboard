"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import {
  BedDouble,
  Castle,
  Check,
  CircleAlert,
  Coffee,
  Flame,
  Hotel,
  House,
  Search,
  Shapes,
  Star,
  Store,
  TreePalm,
  Users,
  UtensilsCrossed,
  X,
  type LucideIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AmenityPicker } from "@/features/catalog/components/listing-form/amenity-picker";
import { CoverDropzone } from "@/features/catalog/components/listing-form/cover-dropzone";
import { HoursEditor } from "@/features/catalog/components/listing-form/hours-editor";
import { FieldControl } from "@/features/catalog/components/fields/field-control";
import { narrowChoices } from "@/features/catalog/narrowing";
import { THEME_TILES } from "@/features/catalog/components/fields/choice-tiles";
import { fittingOptions, hintOf, labelOf, offeredOptions } from "@/features/catalog/resource";
import type {
  EnumOption,
  FormValues,
  ReferenceOption,
  ResourceField,
} from "@/features/catalog/resource";
import { cn } from "@/lib/utils";

/** "A", "A and B", "A, B and C". */
function names(list: readonly string[]): string {
  return list.length < 2 ? (list[0] ?? "") : `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

/** The pictures on the type tiles, by the API's enum values. */
const TYPE_ICONS: Readonly<Record<string, LucideIcon>> = {
  HOTEL: Hotel,
  GUESTHOUSE: House,
  HOSTEL: BedDouble,
  RESORT: TreePalm,
  HOMESTAY: Users,
  VILLA: Castle,
  RESTAURANT: UtensilsCrossed,
  CAFE: Coffee,
  STREET_FOOD: Flame,
  MARKET: Store,
  /* An attraction's themes: its tourism regions. */
  ...Object.fromEntries(Object.entries(THEME_TILES).map(([code, tile]) => [code, tile.icon])),
};

/** One line under each type, so the choice is made on meaning rather than a word. */
const TYPE_HINTS: Readonly<Record<string, string>> = {
  HOTEL: "Rooms, a front desk, daily service",
  GUESTHOUSE: "A small, family-run place to stay",
  HOSTEL: "Shared dorms and social spaces",
  RESORT: "Pools, gardens, everything on site",
  HOMESTAY: "A room in a local family's home",
  VILLA: "A whole private house",
  RESTAURANT: "Meals at a table. Bars too.",
  CAFE: "Coffee and cakes. Bakeries too.",
  STREET_FOOD: "Stalls, carts and night markets",
  MARKET: "Food stalls and fresh produce",
  OTHER: "Anything that fits none of these",
  ...Object.fromEntries(Object.entries(THEME_TILES).map(([code, tile]) => [code, tile.hint])),
};

const PRICE_HINTS: Readonly<Record<string, string>> = {
  $: "Budget",
  $$: "Moderate",
  $$$: "Upscale",
  $$$$: "Fine dining",
};

/** Currencies a listing in Cambodia is priced in, offered before typing one. */
const COMMON_CURRENCIES = ["USD", "KHR"] as const;

interface ShellProps {
  readonly field: ResourceField;
  readonly error?: string;
  /** The counter shown beside the label, for text with a limit. */
  readonly count?: number;
  readonly children: (ids: { readonly id: string; readonly describedBy?: string; readonly labelId: string }) => ReactNode;
  readonly className?: string;
}

/** A label that says whether the field is needed, the control, and its hint or error. */
export function FieldShell({ field, error, count, children, className }: ShellProps) {
  const id = useId();
  const hintId = field.hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const near = field.maxLength != null && count != null && count > field.maxLength * 0.9;

  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", field.span === 2 && "md:col-span-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label className="text-sm font-medium text-ink-soft" htmlFor={id} id={`${id}-label`}>
          {field.label}
          {field.required ? (
            <span aria-hidden className="ml-0.5 text-heritage">
              *
            </span>
          ) : null}
        </label>
        {field.maxLength != null && count != null ? (
          <span className={cn("text-xs tabular-nums", near ? "font-medium text-heritage" : "text-muted")}>
            {count}/{field.maxLength}
          </span>
        ) : null}
      </div>

      {children({ id, describedBy: [errorId, hintId].filter(Boolean).join(" ") || undefined, labelId: `${id}-label` })}

      {error ? (
        <p className="flex items-center gap-1 text-xs font-medium text-heritage" id={errorId} role="alert">
          <CircleAlert aria-hidden className="size-3.5 shrink-0" />
          {error}
        </p>
      ) : field.hint ? (
        <p className="text-xs text-muted" id={hintId}>
          {field.hint}
        </p>
      ) : null}
    </div>
  );
}

interface ListingFieldProps {
  readonly field: ResourceField;
  readonly options: readonly ReferenceOption[];
  readonly locked?: boolean;
  /** Where the listing's pages live on the website, for the slug's prefix. */
  readonly pathPrefix: string;
  /** Alone in its group, so it takes the whole row. */
  readonly wide?: boolean;
  /** For a field `narrowedBy` another: that field's options, whose `links` say what this one offers. */
  readonly narrowing?: readonly ReferenceOption[];
}

/** Renders one registry field with the listing form's own control for it. */
export function ListingField({ field: declared, options, locked = false, pathPrefix, wide = false, narrowing }: ListingFieldProps) {
  const {
    control,
    register,
    getValues,
    setValue,
    formState: { errors },
  } = useFormContext<FormValues>();
  const error = errors[declared.name]?.message as string | undefined;
  const value = useWatch({ control, name: declared.name });
  /*
   * `optionsFor` and `labelFor`: only what this kind of listing has use for, in
   * the words it uses — a cafe is not offered curries, and is asked what a
   * coffee and a cake cost rather than a meal.
   */
  const follows = declared.optionsFor?.field ?? declared.labelFor?.field ?? declared.hintFor?.field ?? declared.name;
  const kind = useWatch({ control, name: follows });
  const field = useMemo(() => {
    if (!declared.optionsFor && !declared.labelFor && !declared.hintFor) return declared;
    const around = { [follows]: kind, [declared.name]: value };
    return {
      ...declared,
      label: labelOf(declared, around),
      hint: hintOf(declared, around),
      ...(declared.kind === "refs" ? {} : { options: offeredOptions(declared, around) }),
    };
  }, [declared, follows, kind, value]);
  const offered = field.options ?? [];
  /* What is chosen in the field this one follows; this field's own value when it follows none. */
  const followed = useWatch({ control, name: field.narrowedBy?.field ?? field.name });
  const length = typeof value === "string" ? value.trim().length : 0;

  /* `presetBy`: a new type picks its interest while none is chosen. The type the form opened with does not. */
  const presetSource = useWatch({ control, name: field.presetBy?.field ?? field.name });
  const [presetStart] = useState(() => presetSource);
  useEffect(() => {
    if (!field.presetBy || typeof presetSource !== "string" || presetSource === presetStart) return;
    const current = getValues(field.name);
    if (Array.isArray(current) && current.length > 0) return;
    const wanted = (field.presetBy.labels[presetSource] ?? []).map((label) => label.toLowerCase());
    const match = options.find(
      (option) =>
        !option.inactive &&
        (!field.optionGroup || option.group === field.optionGroup) &&
        wanted.includes(option.label.toLowerCase()),
    );
    if (match) setValue(field.name, [match.value], { shouldDirty: true, shouldValidate: true });
  }, [field, getValues, options, presetSource, presetStart, setValue]);

  if (locked) return <FieldControl field={field} locked options={options} />;

  if (field.kind === "boolean") return <ToggleRow field={field} />;

  if (field.kind === "enum" && (field.name === "type" || field.name === "theme")) {
    return (
      <FieldShell className="md:col-span-2" error={error} field={{ ...field, hint: undefined }}>
        {({ labelId }) => (
          <Controller
            control={control}
            name={field.name}
            render={({ field: bound }) => (
              <TypeTiles labelledBy={labelId} onChange={bound.onChange} options={field.options ?? []} value={String(bound.value ?? "")} />
            )}
          />
        )}
      </FieldShell>
    );
  }

  if (field.name === "starRating") {
    return (
      <FieldShell className="md:col-span-2" error={error} field={field}>
        {({ labelId, describedBy }) => (
          <Controller
            control={control}
            name={field.name}
            render={({ field: bound }) => (
              <StarRatingInput describedBy={describedBy} labelledBy={labelId} onChange={bound.onChange} value={String(bound.value ?? "")} />
            )}
          />
        )}
      </FieldShell>
    );
  }

  if (field.kind === "enum" && field.name === "priceRange") {
    return (
      <FieldShell className="md:col-span-2" error={error} field={field}>
        {({ labelId }) => (
          <Controller
            control={control}
            name={field.name}
            render={({ field: bound }) => (
              <PriceRangeInput labelledBy={labelId} onChange={bound.onChange} options={field.options ?? []} value={String(bound.value ?? "")} />
            )}
          />
        )}
      </FieldShell>
    );
  }

  if (field.kind === "enums" && (field.name === "amenities" || field.name === "specialties")) {
    const own = field.name === "specialties";
    return (
      <FieldShell className="md:col-span-2" error={error} field={own || declared.labelFor ? field : { ...field, label: "Facilities & services" }}>
        {({ labelId }) => (
          <Controller
            control={control}
            name={field.name}
            render={({ field: bound }) => (
              <AmenityPicker
                labelledBy={labelId}
                noun={own ? "this list" : undefined}
                onChange={bound.onChange}
                options={offered}
                /* What only this kind has is a written sequence; facilities are a list of names. */
                ordered={own}
                popular={own ? [] : undefined}
                value={Array.isArray(bound.value) ? bound.value : []}
              />
            )}
          />
        )}
      </FieldShell>
    );
  }

  if (field.kind === "refs" || field.kind === "enums") {
    const chosen = Array.isArray(value) ? value : [];
    const every: readonly ReferenceOption[] =
      field.kind === "refs" ? options : offered.map((option) => ({ ...option, inactive: false }));
    /* `optionGroup`: one shelf's interests, and any chosen from elsewhere so they can be taken away. */
    const grouped = field.optionGroup
      ? every.filter((option) => option.group === field.optionGroup || chosen.includes(option.value))
      : every;
    /* `optionsFor` on rows: a cafe is offered the categories and tags a cafe uses. */
    const all =
      field.kind === "refs" && field.optionsFor
        ? fittingOptions(field, grouped, { [field.optionsFor.field]: kind, [field.name]: chosen })
        : grouped;
    /* An attraction's categories, search filters and interests: only its theme's region's own. */
    const sources = Array.isArray(followed) ? followed : typeof followed === "string" && followed ? [followed] : [];
    const narrowed =
      field.narrowedBy && narrowing
        ? narrowChoices(all, narrowing, sources, field.narrowedBy.links, chosen)
        : null;
    const noun = field.label.toLowerCase();
    const outside = narrowed?.outside.size ?? 0;
    /* A hint written for this theme — UNESCO's — says more than "only the …". */
    const ownHint = declared.hintFor && field.hint !== declared.hint ? field.hint : undefined;
    const hint = !narrowed
      ? field.hint
      : narrowed.scope.length === 0
        ? field.narrowedBy?.from
          ? `Choose its theme first to see only that theme's ${noun}.`
          : `Choose a tourism region above to see only its ${noun}.`
        : (ownHint ?? `Only the ${noun} of ${names(narrowed.scope)}.`) +
          (outside
            ? ` ${outside} chosen earlier ${outside === 1 ? "is" : "are"} not in ${narrowed.scope.length === 1 ? "this region" : "these regions"}: select ${outside === 1 ? "it" : "them"} to take ${outside === 1 ? "it" : "them"} away.`
            : "");
    return (
      <FieldShell className="md:col-span-2" error={error} field={{ ...field, hint }}>
        {({ labelId, describedBy }) => (
          <Controller
            control={control}
            name={field.name}
            render={({ field: bound }) => (
              <ChipSelect
                describedBy={describedBy}
                emptyText={narrowed?.scope.length ? `${names(narrowed.scope)} has no ${noun} yet.` : undefined}
                flagged={narrowed?.outside}
                label={field.label}
                labelledBy={labelId}
                onChange={bound.onChange}
                options={narrowed ? narrowed.options : all}
                value={Array.isArray(bound.value) ? bound.value : []}
              />
            )}
          />
        )}
      </FieldShell>
    );
  }

  if (field.kind === "image") {
    return (
      <FieldShell className="md:col-span-2" error={error} field={{ ...field, label: "Cover photo" }}>
        {({ id, describedBy }) => <CoverDropzone describedBy={describedBy} field={field} id={id} invalid={Boolean(error)} />}
      </FieldShell>
    );
  }

  if (field.kind === "hours") {
    return (
      <FieldShell className="md:col-span-2" error={error} field={field}>
        {({ labelId }) => (
          <Controller
            control={control}
            name={field.name}
            render={({ field: bound }) => (
              <HoursEditor labelledBy={labelId} onChange={bound.onChange} value={Array.isArray(bound.value) ? bound.value : []} />
            )}
          />
        )}
      </FieldShell>
    );
  }

  return (
    <FieldShell className={wide ? "md:col-span-2" : undefined} count={field.maxLength ? length : undefined} error={error} field={field}>
      {({ id, describedBy }) => {
        const aria = { id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined };

        switch (field.kind) {
          case "textarea":
            return (
              <Textarea
                {...aria}
                {...register(field.name)}
                placeholder={
                  /* A stay or a food listing shows its own kind's example under the field; a destination is visited, not stayed at. */
                  field.name === "shortDescription"
                    ? "One or two sentences that make someone want to go."
                    : declared.hintFor
                      ? "The full story, in your own words."
                      : "The full story: what to see, what to know, when to go."
                }
                rows={field.name === "shortDescription" ? 3 : 7}
              />
            );

          case "ref":
            return (
              <Select {...aria} {...register(field.name)}>
                <option value="">
                  {field.required ? `Choose a ${field.label.toLowerCase()}` : "Not set"}
                </option>
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                    {option.inactive ? " (retired)" : ""}
                  </option>
                ))}
              </Select>
            );

          case "enum":
            return (
              <Select {...aria} {...register(field.name)}>
                <option value="">{field.required ? `Choose a ${field.label.toLowerCase()}` : "Not set"}</option>
                {offered.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            );

          case "number":
          case "decimal":
            if (field.name === "priceFrom") return <PriceInput aria={aria} field={field} />;
            return (
              <Input
                {...aria}
                {...register(field.name)}
                className="tabular-nums"
                inputMode="decimal"
                max={field.max}
                min={field.min}
                placeholder={field.name === "latitude" ? "13.412469" : field.name === "longitude" ? "103.866986" : undefined}
                step={field.step ?? (field.kind === "number" ? 1 : "any")}
                type="number"
              />
            );

          case "time":
            return <Input {...aria} {...register(field.name)} className="tabular-nums" type="time" />;

          case "date":
            return <Input {...aria} {...register(field.name)} type="date" />;

          default:
            if (field.name === "currency") return <CurrencyInput aria={aria} field={field} />;
            if (field.name === "slug") {
              return (
                <div className="flex h-9 items-stretch overflow-hidden rounded-md border border-line-strong bg-paper shadow-xs transition-[border-color,box-shadow] focus-within:border-teal focus-within:ring-3 focus-within:ring-teal/15 hover:border-line-hover">
                  <span className="flex items-center border-r border-line bg-sand px-2.5 font-mono text-xs text-muted">{pathPrefix}</span>
                  <input
                    {...aria}
                    {...register(field.name)}
                    className="min-w-0 flex-1 bg-transparent px-2.5 font-mono text-sm text-ink outline-none placeholder:text-muted/70"
                    placeholder="generated-from-the-name"
                    spellCheck={false}
                    type="text"
                  />
                </div>
              );
            }
            return (
              <Input
                {...aria}
                {...register(field.name)}
                autoComplete="off"
                inputMode={field.name === "phone" ? "tel" : field.name === "contactEmail" ? "email" : field.name === "website" ? "url" : undefined}
                placeholder={declared.hintFor && field.name === "name" ? undefined : PLACEHOLDERS[field.name]}
                type="text"
              />
            );
        }
      }}
    </FieldShell>
  );
}

const PLACEHOLDERS: Readonly<Record<string, string>> = {
  name: "e.g. Angkor Wat",
  address: "Street, village or landmark it is on",
  phone: "+855 12 345 678",
  contactEmail: "hello@example.com",
  website: "https://",
};

/* -------------------------------------------------------------------------- */

/** One kind, with its picture and the line that says what it means. */
function TypeTile({
  option,
  selected,
  onChange,
}: {
  readonly option: EnumOption;
  readonly selected: boolean;
  readonly onChange: (value: string) => void;
}) {
  const Icon = TYPE_ICONS[option.value] ?? Shapes;
  return (
    <button
      aria-checked={selected}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
        selected ? "border-teal bg-teal-soft/50 ring-1 ring-teal" : "border-line-strong bg-paper hover:bg-sand",
      )}
      onClick={() => onChange(option.value)}
      role="radio"
      type="button"
    >
      <Icon aria-hidden className={cn("size-5 shrink-0", selected ? "text-teal" : "text-muted")} strokeWidth={1.75} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ink">{option.label}</span>
        <span className="block text-xs leading-snug text-muted">{TYPE_HINTS[option.value] ?? ""}</span>
      </span>
      <span
        aria-hidden
        className={cn(
          "grid size-4 shrink-0 place-items-center rounded-full border",
          selected ? "border-teal bg-teal" : "border-line-strong bg-paper",
        )}
      >
        {selected ? <span className="size-1.5 rounded-full bg-white" /> : null}
      </span>
    </button>
  );
}

/**
 * The kinds a listing can be, as tiles in one grid: three across on a desk,
 * two on a laptop, one on a phone. What each kind covers is said on the tile
 * itself, so the list stays one block a reader can take in at a glance.
 */
function TypeTiles({
  options,
  value,
  onChange,
  labelledBy,
}: {
  readonly options: readonly EnumOption[];
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly labelledBy: string;
}) {
  return (
    <div
      aria-labelledby={labelledBy}
      className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
      role="radiogroup"
    >
      {options.map((option) => (
        <TypeTile key={option.value} onChange={onChange} option={option} selected={option.value === value} />
      ))}
    </div>
  );
}

function StarRatingInput({
  value,
  onChange,
  labelledBy,
  describedBy,
}: {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly labelledBy: string;
  readonly describedBy?: string;
}) {
  const [hover, setHover] = useState(0);
  const current = Math.round(Number(value) || 0);
  const shown = hover || current;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div
        aria-describedby={describedBy}
        aria-labelledby={labelledBy}
        className="flex items-center gap-0.5"
        onMouseLeave={() => setHover(0)}
        role="radiogroup"
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            aria-checked={current === star}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            className="rounded-sm p-0.5"
            key={star}
            onBlur={() => setHover(0)}
            onClick={() => onChange(current === star ? "" : String(star))}
            onFocus={() => setHover(star)}
            onMouseEnter={() => setHover(star)}
            role="radio"
            type="button"
          >
            <Star
              aria-hidden
              className={cn("size-6 transition-colors", star <= shown ? "fill-gold text-gold" : "text-line-strong")}
              strokeWidth={1.5}
            />
          </button>
        ))}
      </div>
      <p aria-live="polite" className="text-sm text-ink-soft">
        {shown ? `${shown}-star property` : "Not rated"}
      </p>
      {current ? (
        <button className="text-xs text-muted underline-offset-2 hover:text-ink hover:underline" onClick={() => onChange("")} type="button">
          Clear
        </button>
      ) : null}
    </div>
  );
}

function PriceRangeInput({
  options,
  value,
  onChange,
  labelledBy,
}: {
  readonly options: readonly { readonly value: string; readonly label: string }[];
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly labelledBy: string;
}) {
  return (
    <div aria-labelledby={labelledBy} className="inline-flex max-w-full flex-wrap overflow-hidden rounded-md border border-line-strong bg-paper" role="radiogroup">
      {[{ value: "", label: "—" }, ...options].map((option) => {
        const selected = option.value === value;
        return (
          <button
            aria-checked={selected}
            className={cn(
              "flex min-w-20 flex-col items-center border-line px-3 py-1.5 transition-colors not-last:border-r",
              selected ? "bg-teal-soft text-teal-deep" : "text-ink-soft hover:bg-sand",
            )}
            key={option.value || "none"}
            onClick={() => onChange(option.value)}
            role="radio"
            type="button"
          >
            <span className="text-sm font-semibold tracking-wide">{option.label}</span>
            <span className={cn("text-2xs", selected ? "text-teal-deep/80" : "text-muted")}>
              {option.value ? PRICE_HINTS[option.value] : "Not set"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

type Aria = { readonly id: string; readonly "aria-describedby"?: string; readonly "aria-invalid"?: boolean };

function PriceInput({ field, aria }: { readonly field: ResourceField; readonly aria: Aria }) {
  const { control, register } = useFormContext<FormValues>();
  const currency = useWatch({ control, name: "currency" });

  return (
    <div className="flex h-9 items-stretch overflow-hidden rounded-md border border-line-strong bg-paper shadow-xs transition-[border-color,box-shadow] focus-within:border-teal focus-within:ring-3 focus-within:ring-teal/15 hover:border-line-hover has-[[aria-invalid=true]]:border-heritage">
      <span className="flex min-w-12 items-center justify-center border-r border-line bg-sand px-2.5 text-xs font-medium text-muted">
        {typeof currency === "string" && currency.trim() ? currency.trim().toUpperCase() : "—"}
      </span>
      <input
        {...aria}
        {...register(field.name)}
        className="min-w-0 flex-1 bg-transparent px-2.5 text-base text-ink tabular-nums outline-none placeholder:text-muted/70"
        inputMode="decimal"
        min={field.min}
        placeholder="0.00"
        step={field.step ?? "any"}
        type="number"
      />
    </div>
  );
}

function CurrencyInput({ field, aria }: { readonly field: ResourceField; readonly aria: Aria }) {
  const { control } = useFormContext<FormValues>();

  return (
    <Controller
      control={control}
      name={field.name}
      render={({ field: bound }) => {
        const current = typeof bound.value === "string" ? bound.value : "";
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            <Input
              {...aria}
              className="w-20 text-center font-mono tracking-wider uppercase"
              maxLength={3}
              name={bound.name}
              onBlur={bound.onBlur}
              onChange={(event) => bound.onChange(event.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
              placeholder="USD"
              ref={bound.ref}
              value={current}
            />
            {COMMON_CURRENCIES.map((code) => (
              <button
                aria-pressed={current === code}
                className={cn(
                  "h-7 rounded-md border px-2 text-xs font-medium transition-colors",
                  current === code ? "border-teal bg-teal-soft text-teal-deep" : "border-line bg-paper text-muted hover:bg-sand hover:text-ink",
                )}
                key={code}
                onClick={() => bound.onChange(code)}
                type="button"
              >
                {code}
              </button>
            ))}
          </div>
        );
      }}
    />
  );
}

/** Many choices as toggles: select to add, select again to take away. */
function ChipSelect({
  options,
  value,
  onChange,
  label,
  labelledBy,
  describedBy,
  flagged,
  emptyText,
}: {
  readonly options: readonly ReferenceOption[];
  readonly value: readonly string[];
  readonly onChange: (value: string[]) => void;
  readonly label: string;
  readonly labelledBy: string;
  readonly describedBy?: string;
  /** Chosen, but outside what the list now offers: shown marked, so it can be taken away. */
  readonly flagged?: ReadonlySet<string>;
  /** What to say when there is nothing to offer, instead of "none exist yet". */
  readonly emptyText?: string;
}) {
  const [term, setTerm] = useState("");
  const selected = useMemo(() => new Set(value), [value]);
  const needle = term.trim().toLowerCase();
  const visible = needle ? options.filter((option) => option.label.toLowerCase().includes(needle)) : options;
  const sections = groupSections(visible);

  function toggle(option: string) {
    onChange(selected.has(option) ? value.filter((item) => item !== option) : [...value, option]);
  }

  if (!options.length) {
    return (
      <p className="rounded-md border border-dashed border-line-strong px-3 py-3 text-sm text-muted">
        {emptyText ?? `No ${label.toLowerCase()} exist yet.`}
      </p>
    );
  }

  return (
    <div aria-describedby={describedBy} aria-labelledby={labelledBy} className="flex flex-col gap-2" role="group">
      {options.length > 14 ? (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-48 flex-1 sm:max-w-xs">
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted" />
            <Input
              aria-label={`Search ${label.toLowerCase()}`}
              className="h-8 pl-8 text-sm"
              onChange={(event) => setTerm(event.target.value)}
              placeholder={`Search ${label.toLowerCase()}…`}
              type="search"
              value={term}
            />
          </div>
          <span className="text-xs text-muted tabular-nums">
            {value.length} of {options.length} selected
          </span>
          {value.length ? (
            <button className="text-xs font-medium text-teal-deep hover:underline" onClick={() => onChange([])} type="button">
              Clear
            </button>
          ) : null}
        </div>
      ) : null}

      {sections ? (
        /* Interests: one heading per group — Attraction Sites, Stays, Food… — each with its own. */
        <div className="flex max-h-96 flex-col gap-3 overflow-y-auto">
          {sections.map((section) => (
            <div aria-label={section.name} key={section.name} role="group">
              <p className="mb-1.5 text-2xs font-semibold tracking-wide text-muted uppercase">{section.name}</p>
              <ul className="flex flex-wrap gap-1.5">{section.options.map(chip)}</ul>
            </div>
          ))}
        </div>
      ) : (
        <ul className="flex max-h-64 flex-wrap gap-1.5 overflow-y-auto">
          {visible.map(chip)}
          {visible.length === 0 ? (
            <li className="flex items-center gap-2 py-1 text-xs text-muted">
              Nothing matches “{term}”.
              <button className="inline-flex items-center gap-1 font-medium text-teal-deep" onClick={() => setTerm("")} type="button">
                <X aria-hidden className="size-3" /> Clear search
              </button>
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );

  function chip(option: ReferenceOption) {
    const on = selected.has(option.value);
    const off = flagged?.has(option.value) ?? false;
    return (
      <li key={option.value}>
        <button
          aria-pressed={on}
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-sm transition-colors",
            on && off
              ? "border-gold-deep/40 bg-gold-soft text-gold-deep"
              : on
                ? "border-teal bg-teal-soft text-teal-deep"
                : "border-line-strong bg-paper text-ink-soft hover:bg-sand hover:text-ink",
            option.inactive && !on && "opacity-60",
          )}
          onClick={() => toggle(option.value)}
          title={off ? "Not in the chosen region. Select to take it away." : undefined}
          type="button"
        >
          {on ? <Check aria-hidden className="size-3.5" strokeWidth={2.5} /> : null}
          {option.label}
          {option.inactive ? <span className="text-2xs text-muted">(retired)</span> : null}
          {off ? <span className="text-2xs">(not in region)</span> : null}
        </button>
      </li>
    );
  }
}

/** The options under their group headings, in the order they come; null when none has a group. */
function groupSections(options: readonly ReferenceOption[]): { name: string; options: ReferenceOption[] }[] | null {
  if (!options.some((option) => option.group)) return null;
  const sections = new Map<string, ReferenceOption[]>();
  for (const option of options) {
    const name = option.group ?? "Other";
    sections.set(name, [...(sections.get(name) ?? []), option]);
  }
  return [...sections].map(([name, list]) => ({ name, options: list }));
}

/** A yes-or-no setting: the label and what it means, with a switch. */
function ToggleRow({ field }: { readonly field: ResourceField }) {
  const { register } = useFormContext<FormValues>();

  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border border-line px-3 py-3 transition-colors hover:bg-sand has-disabled:cursor-not-allowed",
        field.span === 2 && "md:col-span-2",
      )}
    >
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input {...register(field.name)} className="peer sr-only" role="switch" type="checkbox" />
        <span
          aria-hidden
          className="h-5 w-9 rounded-full bg-line-strong transition-colors peer-checked:bg-teal peer-focus-visible:ring-3 peer-focus-visible:ring-teal/25"
        />
        <span
          aria-hidden
          className="absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-xs transition-transform peer-checked:translate-x-4"
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ink">{field.label}</span>
        <span className="mt-0.5 block text-xs text-muted">{field.hint ?? TOGGLE_HINTS[field.name] ?? ""}</span>
      </span>
    </label>
  );
}

const TOGGLE_HINTS: Readonly<Record<string, string>> = {
  isFeatured: "Featured listings are promoted on the website: marked Featured and shown first.",
  isLocalSpecialty: "A dish or a place the area is known for — worth the trip on its own.",
};
