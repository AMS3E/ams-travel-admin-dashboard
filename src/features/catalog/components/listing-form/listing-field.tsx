"use client";

import { useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
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
  Info,
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
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AmenityPicker } from "@/features/catalog/components/listing-form/amenity-picker";
import { offeredAmenities, type AmenityOption } from "@/features/catalog/amenities";
import { HoursEditor } from "@/features/catalog/components/listing-form/hours-editor";
import { FieldControl } from "@/features/catalog/components/fields/field-control";
import { HelpStyleContext } from "@/features/catalog/components/listing-form/help-style";
import { narrowChoices } from "@/features/catalog/narrowing";
import { ChoiceTiles } from "@/features/catalog/components/fields/choice-tiles";
import { fittingOptions, hintOf, inOptionGroup, labelOf, offeredOptions } from "@/features/catalog/resource";
import type {
  EnumOption,
  FormValues,
  ReferenceOption,
  ResourceField,
} from "@/features/catalog/resource";
import { cn } from "@/lib/utils";
import type englishForms from "@locales/en/forms.json";

/* Written in the browser only, like the map: the editor has no server rendering. */
const RichText = dynamic(() => import("@/features/catalog/components/fields/rich-text"), {
  ssr: false,
  loading: () => <div className="min-h-40 rounded-md border border-line-strong bg-paper" />,
});

/** "A", "A and B", "A, B and C"; `and` joins the last two in the reader's language. */
function names(list: readonly string[], and: (rest: string, last: string) => string): string {
  return list.length < 2 ? (list[0] ?? "") : and(list.slice(0, -1).join(", "), list[list.length - 1]);
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
};

/** The types with a line under them (`forms.field.typeHints`), so the choice is made on meaning rather than a word. */
type TypeHint = keyof typeof englishForms.field.typeHints;

/** What each price range means, by its key under `forms.field.priceHints`. */
const PRICE_HINTS: Readonly<Record<string, keyof typeof englishForms.field.priceHints>> = {
  $: "budget",
  $$: "moderate",
  $$$: "upscale",
  $$$$: "fine",
};

/** Currencies a listing in Cambodia is priced in, offered before typing one. */
const COMMON_CURRENCIES = ["USD", "KHR"] as const;

interface ShellProps {
  readonly field: ResourceField;
  readonly error?: string;
  /** The counter shown beside the label, for text with a limit. */
  readonly count?: number;
  /** What the control is doing right now — "Only the categories of Coastal & Island Region" — shown under it whatever the help style. */
  readonly status?: string;
  readonly children: (ids: { readonly id: string; readonly describedBy?: string; readonly labelId: string }) => ReactNode;
  readonly className?: string;
}

/** The info icon beside a label or a section title: a click opens the help; a click elsewhere, or Escape, closes it. */
export function HelpIcon({ id, label, text }: { readonly id: string; readonly label: string; readonly text: string }) {
  const t = useTranslations("forms.field");
  const [open, setOpen] = useState(false);
  const holder = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (event: MouseEvent) => {
      if (!holder.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <span className="relative inline-flex" ref={holder}>
      <button
        aria-controls={id}
        aria-expanded={open}
        aria-label={t("about", { label })}
        className={cn("grid size-5 place-items-center rounded-full text-muted transition-colors hover:bg-sand hover:text-ink", open && "bg-sand text-ink")}
        onClick={() => setOpen((shown) => !shown)}
        type="button"
      >
        <Info aria-hidden className="size-3.5" />
      </button>
      {open ? (
        <span className="absolute top-full left-0 z-20 mt-1 w-72 rounded-lg border border-line bg-paper px-3 py-2 text-xs leading-relaxed font-normal text-ink-soft shadow-md" id={id} role="note">
          {text}
        </span>
      ) : (
        <span className="sr-only" id={id}>
          {text}
        </span>
      )}
    </span>
  );
}

/**
 * A label that says whether the field is needed, the control, and its error,
 * its status line and its help — the help under the box, or behind an info
 * icon beside the label where the form asks for that.
 */
export function FieldShell({ field, error, count, status, children, className }: ShellProps) {
  const id = useId();
  const help = useContext(HelpStyleContext);
  const hintId = field.hint ? `${id}-hint` : undefined;
  const statusId = status ? `${id}-status` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const near = field.maxLength != null && count != null && count > field.maxLength * 0.9;

  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", field.span === 2 && "md:col-span-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex items-center gap-1">
          <label className="text-sm font-medium text-ink-soft" htmlFor={id} id={`${id}-label`}>
            {field.label}
            {field.required ? (
              <span aria-hidden className="ml-0.5 text-heritage">
                *
              </span>
            ) : null}
          </label>
          {field.hint && hintId && help === "icon" ? <HelpIcon id={hintId} label={field.label} text={field.hint} /> : null}
        </span>
        {field.maxLength != null && count != null ? (
          <span className={cn("text-xs tabular-nums", near ? "font-medium text-heritage" : "text-muted")}>
            {count}/{field.maxLength}
          </span>
        ) : null}
      </div>

      {children({ id, describedBy: [errorId, statusId, hintId].filter(Boolean).join(" ") || undefined, labelId: `${id}-label` })}

      {error ? (
        <p className="flex items-center gap-1 text-xs font-medium text-heritage" id={errorId} role="alert">
          <CircleAlert aria-hidden className="size-3.5 shrink-0" />
          {error}
        </p>
      ) : status ? (
        <p className="text-xs text-muted" id={statusId}>
          {status}
        </p>
      ) : field.hint && help === "below" ? (
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

/** A link name as the API makes it from a name: lower-case words joined by hyphens. */
function slugOf(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * The link name as one quiet line under the name — it is made from the name
 * and almost never typed — with Edit to open the box. The box stays open
 * once something is wrong with it.
 */
function SlugField({ field, error, pathPrefix }: { readonly field: ResourceField; readonly error?: string; readonly pathPrefix: string }) {
  const t = useTranslations("forms.field");
  const actions = useTranslations("forms.actions");
  const { control, register } = useFormContext<FormValues>();
  const [open, setOpen] = useState(false);
  const name = useWatch({ control, name: "name" });
  const value = useWatch({ control, name: field.name });
  const slug = typeof value === "string" ? value.trim() : "";
  const made = slug || slugOf(typeof name === "string" ? name : "");
  if (!open && !error) {
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted md:col-span-2">
        <span>{t("webAddress")}</span>
        <code className="rounded bg-sand px-1.5 py-0.5 font-mono text-2xs text-ink-soft">
          {pathPrefix}
          {made || "made-from-the-name"}
        </code>
        <button className="font-medium text-ink-soft underline-offset-2 hover:text-ink hover:underline" onClick={() => setOpen(true)} type="button">
          {actions("edit")}
        </button>
      </div>
    );
  }
  return (
    <FieldShell className="md:col-span-2" count={slug.length} error={error} field={field}>
      {({ id, describedBy }) => (
        <div className="flex h-9 items-stretch overflow-hidden rounded-md border border-line-strong bg-paper shadow-xs transition-[border-color,box-shadow] focus-within:border-teal focus-within:ring-3 focus-within:ring-teal/15 hover:border-line-hover">
          <span className="flex items-center border-r border-line bg-sand px-2.5 font-mono text-xs text-muted">{pathPrefix}</span>
          <input
            {...register(field.name)}
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
            className="min-w-0 flex-1 bg-transparent px-2.5 font-mono text-sm text-ink outline-none placeholder:text-muted/70"
            id={id}
            placeholder={made || "made-from-the-name"}
            spellCheck={false}
            type="text"
          />
        </div>
      )}
    </FieldShell>
  );
}

/** Renders one registry field with the listing form's own control for it. */
export function ListingField({ field: declared, options, locked = false, pathPrefix, wide = false, narrowing }: ListingFieldProps) {
  const t = useTranslations("forms.field");
  const and = (rest: string, last: string) => t("and", { rest, last });
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
  /* A picker fed by the amenities taxonomy takes the active ones offered at its level; any other field its own choices. */
  const offered = field.kind === "enums" && field.ref === "amenities" ? offeredAmenities(options, field.offeredAt) : (field.options ?? []);
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
        inOptionGroup(field, option) &&
        wanted.includes(option.label.toLowerCase()),
    );
    if (match) setValue(field.name, [match.value], { shouldDirty: true, shouldValidate: true });
  }, [field, getValues, options, presetSource, presetStart, setValue]);

  if (locked) return <FieldControl field={field} locked options={options} />;

  if (field.kind === "boolean") return <ToggleRow field={field} />;

  if (field.kind === "text" && field.name === "slug") return <SlugField error={error} field={field} pathPrefix={pathPrefix} />;

  if (field.kind === "enum" && field.name === "type") {
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

  if (field.kind === "enums" && field.name === "amenities") {
    return (
      <FieldShell className="md:col-span-2" error={error} field={declared.labelFor ? field : { ...field, label: t("facilities") }}>
        {({ labelId }) => (
          <Controller
            control={control}
            name={field.name}
            render={({ field: bound }) => (
              <FacilitiesField labelledBy={labelId} onChange={bound.onChange} options={offered} value={Array.isArray(bound.value) ? bound.value : []} />
            )}
          />
        )}
      </FieldShell>
    );
  }

  if (field.kind === "enums" && field.name === "specialties") {
    return (
      <FieldShell className="md:col-span-2" error={error} field={field}>
        {({ labelId }) => (
          <Controller
            control={control}
            name={field.name}
            render={({ field: bound }) => (
              <AmenityPicker
                labelledBy={labelId}
                noun="list"
                onChange={bound.onChange}
                options={offered}
                /* What only this kind has is a written sequence, so it reads in its own order. */
                ordered
                popular={[]}
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
    /* `optionGroup`: the shelves this listing is offered, and any chosen from elsewhere so they can be taken away. */
    const grouped = field.optionGroup ? every.filter((option) => inOptionGroup(field, option) || chosen.includes(option.value)) : every;
    /* `optionsFor` on rows: a cafe is offered the categories and tags a cafe uses. */
    const all =
      field.kind === "refs" && field.optionsFor
        ? fittingOptions(field, grouped, { [field.optionsFor.field]: kind, [field.name]: chosen })
        : grouped;
    /*
     * One at a time, as cards — an attraction's tourism region: choosing another
     * replaces it, and choosing the chosen one again clears it. The value stays a list.
     */
    if (field.kind === "refs" && field.single && field.tiles) {
      return (
        <FieldShell className="md:col-span-2" error={error} field={field}>
          {({ labelId, describedBy }) => (
            <Controller
              control={control}
              name={field.name}
              render={({ field: bound }) => (
                <ChoiceTiles
                  compact
                  describedBy={describedBy}
                  invalid={Boolean(error)}
                  labelledBy={labelId}
                  onChange={(next) => bound.onChange(typeof next === "string" && next && next !== chosen[0] ? [next] : [])}
                  options={all}
                  value={chosen[0] ?? ""}
                />
              )}
            />
          )}
        </FieldShell>
      );
    }
    /* An attraction's categories, search filters and interests: only its tourism region's own. */
    const sources = Array.isArray(followed) ? followed : typeof followed === "string" && followed ? [followed] : [];
    const narrowed =
      field.narrowedBy && narrowing
        ? narrowChoices(all, narrowing, sources, field.narrowedBy.links, chosen)
        : null;
    const noun = field.label.toLowerCase();
    const outside = narrowed?.outside.size ?? 0;
    /* A hint written for this kind says more than "only the …". */
    const ownHint = declared.hintFor && field.hint !== declared.hint ? field.hint : undefined;
    const status = !narrowed
      ? undefined
      : narrowed.scope.length === 0
        ? field.narrowedBy?.from
          ? t("narrowed.chooseTheme", { noun })
          : t("narrowed.chooseRegion", { noun })
        : (ownHint ?? t("narrowed.only", { noun, names: names(narrowed.scope, and) })) +
          (outside
            ? ` ${t("narrowed.outside", {
                count: outside,
                where: narrowed.scope.length === 1 ? t("narrowed.thisRegion") : t("narrowed.theseRegions"),
              })}`
            : "");
    return (
      <FieldShell className="md:col-span-2" error={error} field={field} status={status}>
        {({ labelId, describedBy }) => (
          <Controller
            control={control}
            name={field.name}
            render={({ field: bound }) => (
              <ChipSelect
                describedBy={describedBy}
                emptyText={narrowed?.scope.length ? t("narrowed.empty", { names: names(narrowed.scope, and), noun }) : undefined}
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
          case "textarea": {
            const prompt = t("storyPrompt");
            if (field.rich) {
              return (
                <Controller
                  control={control}
                  name={field.name}
                  render={({ field: bound }) => (
                    <RichText
                      describedBy={describedBy}
                      id={id}
                      invalid={Boolean(error)}
                      onBlur={bound.onBlur}
                      onChange={bound.onChange}
                      placeholder={prompt}
                      value={typeof bound.value === "string" ? bound.value : ""}
                    />
                  )}
                />
              );
            }
            return <Textarea {...aria} {...register(field.name)} placeholder={prompt} rows={7} />;
          }

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

          case "enum":
            return (
              <Select {...aria} {...register(field.name)}>
                <option value="">{field.required ? t("chooseA", { label: field.label.toLowerCase() }) : t("notSet")}</option>
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
            return (
              <Input
                {...aria}
                {...register(field.name)}
                autoComplete="off"
                inputMode={field.name === "phone" ? "tel" : field.name === "contactEmail" ? "email" : field.name === "website" ? "url" : undefined}
                placeholder={declared.hintFor && field.name === "name" ? undefined : placeholderOf(field.name, t)}
                type="text"
              />
            );
        }
      }}
    </FieldShell>
  );
}

/** Sample values, written the same in every language: a number, an address, a link. */
const PLACEHOLDERS: Readonly<Record<string, string>> = {
  phone: "+855 12 345 678",
  contactEmail: "hello@example.com",
  website: "https://",
};

/** What a box shows while empty: words for a name or an address, a sample for the rest. */
function placeholderOf(name: string, t: ReturnType<typeof useTranslations<"forms.field">>): string | undefined {
  if (name === "name" || name === "address") return t(`placeholders.${name}`);
  return PLACEHOLDERS[name];
}

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
  const t = useTranslations("forms.field.typeHints");
  const Icon = TYPE_ICONS[option.value] ?? Shapes;
  const hint = t.has(option.value as TypeHint) ? t(option.value as TypeHint) : "";
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
        <span className="block text-xs leading-snug text-muted">{hint}</span>
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
  const t = useTranslations("forms.field");
  const actions = useTranslations("forms.actions");
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
            aria-label={t("stars", { count: star })}
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
        {shown ? t("starProperty", { count: shown }) : t("notRated")}
      </p>
      {current ? (
        <button className="text-xs text-muted underline-offset-2 hover:text-ink hover:underline" onClick={() => onChange("")} type="button">
          {actions("clear")}
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
  const t = useTranslations("forms.field");
  /* As wide as its words, not the row: the shell would otherwise stretch it. */
  return (
    <div aria-labelledby={labelledBy} className="inline-flex max-w-full flex-wrap self-start overflow-hidden rounded-md border border-line-strong bg-paper" role="radiogroup">
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
              {option.value ? (PRICE_HINTS[option.value] ? t(`priceHints.${PRICE_HINTS[option.value]}`) : undefined) : t("notSet")}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * A stay's facilities on the form: the chosen ones as chips, each with a
 * cross, and a button that opens the full checklist in a dialog over the
 * page. The list is long; the form shows only what was picked from it.
 */
function FacilitiesField({
  options,
  value,
  onChange,
  labelledBy,
}: {
  readonly options: readonly AmenityOption[];
  readonly value: readonly string[];
  readonly onChange: (value: string[]) => void;
  readonly labelledBy: string;
}) {
  const t = useTranslations("forms.field");
  const actions = useTranslations("forms.actions");
  const [open, setOpen] = useState(false);
  const labels = useMemo(() => new Map(options.map((option) => [option.value, option.label.split(" · ").pop() ?? option.label])), [options]);
  const chosen = value.filter((slug) => labels.has(slug));

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {chosen.length ? (
          chosen.map((slug) => (
            <span className="inline-flex items-center gap-1 rounded-md border border-line bg-sand px-2 py-1 text-xs text-ink" key={slug}>
              {labels.get(slug)}
              <button
                aria-label={t("remove", { name: labels.get(slug) ?? slug })}
                className="grid size-4 place-items-center rounded-full text-muted hover:bg-sand-deep hover:text-heritage"
                onClick={() => onChange(value.filter((each) => each !== slug))}
                type="button"
              >
                <X aria-hidden className="size-3" />
              </button>
            </span>
          ))
        ) : (
          <span className="text-sm text-muted">{t("noneChosen")}</span>
        )}
        <Button className="ml-auto" onClick={() => setOpen(true)} size="sm" type="button" variant="secondary">
          {t("chooseFacilities")}
        </Button>
      </div>

      {open
        ? createPortal(
            <div className="fixed inset-0 z-[100] overflow-y-auto bg-ink/40 p-3 sm:p-6" onClick={() => setOpen(false)}>
              <div
                aria-labelledby="facilities-dialog-title"
                aria-modal="true"
                className="mx-auto w-full max-w-3xl rounded-xl border border-line bg-paper p-5 shadow-xl sm:p-6"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-ink" id="facilities-dialog-title">
                    {t("facilities")}
                  </h3>
                  <button
                    aria-label={actions("close")}
                    className="grid size-8 place-items-center rounded-md text-muted hover:bg-sand hover:text-ink"
                    onClick={() => setOpen(false)}
                    type="button"
                  >
                    <X aria-hidden className="size-4" />
                  </button>
                </div>
                <AmenityPicker labelledBy={labelledBy} onChange={onChange} options={options} popular={[]} value={value} />
                <div className="mt-4 flex justify-end border-t border-line pt-4">
                  <Button onClick={() => setOpen(false)} size="sm" type="button">
                    {actions("done")}
                  </Button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
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
  const t = useTranslations("forms.field");
  const actions = useTranslations("forms.actions");
  const [term, setTerm] = useState("");
  const selected = useMemo(() => new Set(value), [value]);
  const needle = term.trim().toLowerCase();
  const visible = needle ? options.filter((option) => option.label.toLowerCase().includes(needle)) : options;
  const sections = groupSections(visible, t("otherGroup"));

  function toggle(option: string) {
    onChange(selected.has(option) ? value.filter((item) => item !== option) : [...value, option]);
  }

  if (!options.length) {
    return (
      <p className="rounded-md border border-dashed border-line-strong px-3 py-3 text-sm text-muted">
        {emptyText ?? t("noneExist", { label: label.toLowerCase() })}
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
              aria-label={t("search", { label: label.toLowerCase() })}
              className="h-8 pl-8 text-sm"
              onChange={(event) => setTerm(event.target.value)}
              placeholder={t("searchPlaceholder", { label: label.toLowerCase() })}
              type="search"
              value={term}
            />
          </div>
          <span className="text-xs text-muted tabular-nums">{t("selected", { count: value.length, total: options.length })}</span>
          {value.length ? (
            <button className="text-xs font-medium text-teal-deep hover:underline" onClick={() => onChange([])} type="button">
              {actions("clear")}
            </button>
          ) : null}
        </div>
      ) : null}

      {sections ? (
        /* Interests: one heading per group — Attraction Sites, Stays, Food… — each with its own. */
        <div className="flex max-h-96 flex-col gap-3 overflow-y-auto">
          {sections.map((section) => (
            <div aria-label={section.name} key={section.name} role="group">
              {/* One shelf alone — a stay's, a food listing's — needs no heading; three do. */}
              {sections.length > 1 ? <p className="mb-1.5 text-2xs font-semibold tracking-wide text-muted uppercase">{section.name}</p> : null}
              <ul className="flex flex-wrap gap-1.5">{section.options.map(chip)}</ul>
            </div>
          ))}
        </div>
      ) : (
        <ul className="flex max-h-64 flex-wrap gap-1.5 overflow-y-auto">
          {visible.map(chip)}
          {visible.length === 0 ? (
            <li className="flex items-center gap-2 py-1 text-xs text-muted">
              {t("noMatch", { term })}
              <button className="inline-flex items-center gap-1 font-medium text-teal-deep" onClick={() => setTerm("")} type="button">
                <X aria-hidden className="size-3" /> {t("clearSearch")}
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
          title={off ? t("notInRegionTitle") : undefined}
          type="button"
        >
          {on ? <Check aria-hidden className="size-3.5" strokeWidth={2.5} /> : null}
          {option.label}
          {option.inactive ? <span className="text-2xs text-muted">{t("retired")}</span> : null}
          {off ? <span className="text-2xs">{t("notInRegion")}</span> : null}
        </button>
      </li>
    );
  }
}

/** The options under their group headings, in the order they come; null when none has a group. `other` names the rest. */
function groupSections(options: readonly ReferenceOption[], other: string): { name: string; options: ReferenceOption[] }[] | null {
  if (!options.some((option) => option.group)) return null;
  const sections = new Map<string, ReferenceOption[]>();
  for (const option of options) {
    const name = option.group ?? other;
    sections.set(name, [...(sections.get(name) ?? []), option]);
  }
  return [...sections].map(([name, list]) => ({ name, options: list }));
}

/**
 * A yes-or-no setting, laid out like any other field: its name with its help
 * beside it, and under them the switch, as tall as a text box so it lines up
 * with one on the same row.
 */
function ToggleRow({ field }: { readonly field: ResourceField }) {
  const t = useTranslations("forms.field");
  const { control, register } = useFormContext<FormValues>();
  const on = useWatch({ control, name: field.name }) === true;

  return (
    <FieldShell field={{ ...field, hint: field.hint ?? (field.name === "isLocalSpecialty" ? t("toggleHints.isLocalSpecialty") : undefined) }}>
      {({ id, describedBy }) => (
        <label className="flex h-9 w-fit cursor-pointer items-center gap-2.5 has-disabled:cursor-not-allowed">
          <span className="relative inline-flex shrink-0">
            <input {...register(field.name)} aria-describedby={describedBy} className="peer sr-only" id={id} role="switch" type="checkbox" />
            <span
              aria-hidden
              className="h-5 w-9 rounded-full bg-line-strong transition-colors peer-checked:bg-teal peer-focus-visible:ring-3 peer-focus-visible:ring-teal/25"
            />
            <span
              aria-hidden
              className="absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-xs transition-transform peer-checked:translate-x-4"
            />
          </span>
          <span className={cn("text-sm", on ? "font-medium text-ink" : "text-muted")}>{on ? t("on") : t("off")}</span>
        </label>
      )}
    </FieldShell>
  );
}
