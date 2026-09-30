"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm, useWatch, type Resolver } from "react-hook-form";
import { CircleCheck, CircleDashed, Flame, ImagePlus, Loader2, Minus, Plus, Star, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SaveResult } from "@/features/catalog/form-state";
import { mediaPath, resourceSchema, type FormValues, type ResourceDefinition } from "@/features/catalog/resource";
import { COURSES_BY_KIND, DISH_LABELS, MENU_COURSES, alphabetical } from "@/features/catalog/resources";
import { SPICE_WORDS, dishChecklist, priceWarning, spiceLabel, type MenuWords } from "@/features/catalog/menu";
import { DishCard } from "@/features/catalog/components/listing-form/dish-card";
import type { GalleryPhoto } from "@/features/catalog/components/listing-form/room-editor";
import { cn } from "@/lib/utils";

interface DishEditorProps {
  readonly definition: ResourceDefinition;
  readonly initial: FormValues;
  readonly currency: string;
  /** What the listing says a meal costs, to sanity-check a dish's price against. */
  readonly averageMealPrice: unknown;
  /** RESTAURANT, CAFE…: which course headings this menu is printed under. */
  readonly foodType: string;
  /** What one thing on this menu is called — a dish, an item — and an example to type over. */
  readonly words: MenuWords;
  /** The listing's gallery, to choose this dish's photos from. */
  readonly photos: readonly GalleryPhoto[];
  readonly isNew: boolean;
  readonly onSave: (values: FormValues) => Promise<SaveResult>;
  readonly onCancel: () => void;
}

/**
 * One dish, written the way a cook would describe it: what it is called — in
 * English, in Khmer and said aloud — what is in it, how hot it is, and what the
 * price buys. The card on the right is the dish as travellers will read it.
 *
 * The Khmer name and the pronunciation are asked for first-class rather than
 * buried: at a stall they are what a traveller actually uses to order.
 */
export function DishEditor({ definition, initial, currency, averageMealPrice, foodType, words, photos, isNew, onSave, onCancel }: DishEditorProps) {
  const schema = useMemo(() => resourceSchema(definition), [definition]);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<FormValues>,
    defaultValues: initial,
  });
  const values = useWatch({ control: form.control }) as FormValues;
  const { errors, isSubmitting } = form.formState;
  const [banner, setBanner] = useState<string | null>(null);

  /* A cafe's menu has no curry heading; a heading already in use stays, so it can be changed. */
  const asksSpice = foodType !== "CAFE" || Number(values.spiceLevel) > 0;
  /* A coffee feeds one: only a kind that shares plates is asked how many. */
  const asksServes = foodType !== "CAFE" || Number(values.serves) > 1;
  const keep = COURSES_BY_KIND[foodType];
  const courses = keep ? MENU_COURSES.filter((option) => keep.includes(option.value) || values.course === option.value) : MENU_COURSES;
  const checklist = dishChecklist(values);
  const warning = priceWarning(values, averageMealPrice);
  const chosenPhotos = Array.isArray(values.photoKeys) ? values.photoKeys : [];
  const labels = Array.isArray(values.labels) ? values.labels : [];
  const firstPhoto = photos.find((photo) => photo.key === chosenPhotos[0])?.url ?? (chosenPhotos[0] ? mediaPath(chosenPhotos[0]) : undefined);

  function set(name: string, value: FormValues[string]) {
    form.setValue(name, value, { shouldDirty: true, shouldValidate: Boolean(errors[name]) });
  }

  function step(name: string, delta: number, min: number, max: number) {
    const current = Number.parseInt(typeof values[name] === "string" ? (values[name] as string) : "0", 10) || 0;
    set(name, String(Math.min(max, Math.max(min, current + delta))));
  }

  function toggleLabel(slug: string) {
    set("labels", labels.includes(slug) ? labels.filter((each) => each !== slug) : [...labels, slug]);
  }

  /** A problem with a field this editor does not show — said, rather than failing quietly. */
  function refuse(invalid: Record<string, { message?: unknown } | undefined>) {
    const shown = new Set(["name", "localName", "pronunciation", "description", "price", "portion"]);
    const hidden = Object.entries(invalid)
      .filter(([name]) => !shown.has(name))
      .map(([name, error]) => `${definition.fields.find((field) => field.name === name)?.label ?? name}: ${String(error?.message ?? "invalid")}`);
    setBanner(hidden.length ? `Check ${hidden.join("; ")}.` : "A few details need attention — they are marked in red.");
  }

  async function submit(submitted: FormValues) {
    setBanner(null);
    const result = await onSave(submitted);
    if (result.ok) return;
    for (const [name, message] of Object.entries(result.fieldErrors ?? {})) form.setError(name, { message });
    setBanner(result.message);
  }

  return (
    <FormProvider {...form}>
      <div className="@container">
        <div className="grid gap-5 @3xl:grid-cols-[minmax(0,1fr)_17rem]">
          <div className="flex min-w-0 flex-col gap-6">
            {banner ? (
              <p className="flex items-start gap-2 rounded-md border border-heritage/20 bg-heritage-soft px-3 py-2 text-sm text-heritage" role="alert">
                <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                {banner}
              </p>
            ) : null}

            <Section description="The name travellers read, the one on the menu board, and how to ask for it." title={`What is the ${words.one}?`}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field error={errors.name?.message as string | undefined} label="Name on the menu">
                  <Input {...form.register("name")} aria-invalid={Boolean(errors.name)} maxLength={150} placeholder={`e.g. ${words.example}`} />
                </Field>
                <Field error={errors.localName?.message as string | undefined} label="Name in Khmer">
                  <Input {...form.register("localName")} maxLength={150} placeholder={words.exampleKm || "Khmer name"} />
                  <p className="mt-1 text-xs text-muted">What a traveller points at to order.</p>
                </Field>
              </div>
              <div className="mt-4">
                <Field error={errors.pronunciation?.message as string | undefined} label="How to say it">
                  <Input {...form.register("pronunciation")} maxLength={150} placeholder={words.exampleSaid || "How it sounds"} />
                </Field>
              </div>
              <div className="mt-4">
                <p className="mb-1.5 text-xs font-medium text-muted">Course</p>
                <div className="flex flex-wrap gap-1.5">
                  {courses.map((option) => (
                    <Chip key={option.value} on={values.course === option.value} onClick={() => set("course", option.value)}>
                      {option.label}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className="mt-4">
                <Field error={errors.description?.message as string | undefined} label={`Describe the ${words.one}`}>
                  <Textarea {...form.register("description")} placeholder="How it is cooked and what comes with it…" rows={3} />
                </Field>
              </div>
              <label className="mt-3 flex items-center gap-2.5 text-sm text-ink-soft">
                <input {...form.register("isSignature")} className="size-4 accent-teal" type="checkbox" />
                <Star aria-hidden className="size-4 text-gold-deep" />
                {`The ${words.one} they are known for`}
              </label>
            </Section>

            <Section description={asksSpice ? "What the price buys, and how hot it comes." : "What the price buys."} title="Price and portion">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field error={errors.price?.message as string | undefined} label="Price">
                  <div className="relative">
                    <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs text-muted">{currency}</span>
                    <Input {...form.register("price")} className="pl-12" inputMode="decimal" placeholder="e.g. 6.50" />
                  </div>
                </Field>
                <Field error={errors.portion?.message as string | undefined} label="What the price buys">
                  <Input {...form.register("portion")} maxLength={60} placeholder="One bowl, 300 g, Serves 2…" />
                </Field>
              </div>
              {warning ? (
                <p className="mt-2 flex items-start gap-1.5 text-xs text-gold-deep" role="status">
                  <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
                  {warning}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3">
                <Field label="How many people it feeds" hidden={!asksServes}>
                  <Stepper max={20} min={1} name="serves" onStep={step} value={values.serves} />
                </Field>
                <div hidden={!asksSpice}>
                  <p className="mb-1.5 text-xs font-medium text-muted">How spicy</p>
                  <div className="flex flex-wrap gap-1.5">
                    {SPICE_WORDS.map((word, level) => (
                      <Chip key={word} on={(Number(values.spiceLevel) || 0) === level} onClick={() => set("spiceLevel", String(level))}>
                        {level > 0 ? (
                          <span className="mr-1 inline-flex">
                            {Array.from({ length: level }, (_, index) => (
                              <Flame aria-hidden className="size-3" key={index} />
                            ))}
                          </span>
                        ) : null}
                        {word}
                      </Chip>
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            <Section description="What a diner must know before ordering, and what suits their diet." title="Diet and allergens">
              <div className="flex flex-wrap gap-1.5">
                {alphabetical(DISH_LABELS).map((option) => (
                  <Chip
                    key={option.value}
                    on={labels.includes(option.value)}
                    onClick={() => toggleLabel(option.value)}
                    tone={option.value.startsWith("contains-") || option.value === "raw" ? "warn" : "good"}
                  >
                    {option.label}
                  </Chip>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted">
                Say what it contains even when it seems obvious: a traveller who cannot eat pork reads this before the description.
              </p>
            </Section>

            <Section description="Chosen from the listing's gallery, so nothing is uploaded twice. The first one leads the dish." title="Photos">
              {photos.length ? (
                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                  {photos.map((photo) => {
                    const at = chosenPhotos.indexOf(photo.key);
                    return (
                      <li key={photo.key}>
                        <button
                          aria-pressed={at >= 0}
                          className={cn(
                            "relative block aspect-4/3 w-full overflow-hidden rounded-md border-2 bg-sand-deep transition-colors",
                            at >= 0 ? "border-teal" : "border-transparent hover:border-line-strong",
                          )}
                          onClick={() =>
                            set("photoKeys", at >= 0 ? chosenPhotos.filter((key) => key !== photo.key) : [...chosenPhotos, photo.key])
                          }
                          type="button"
                        >
                          <Image alt="" className="object-cover" fill sizes="120px" src={photo.url} unoptimized />
                          {at >= 0 ? (
                            <span className="absolute top-1 left-1 grid size-5 place-items-center rounded-full bg-teal text-2xs font-semibold text-white tabular-nums">
                              {at + 1}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="flex items-center gap-2 rounded-md border border-dashed border-line-strong bg-sand px-3 py-3 text-sm text-muted">
                  <ImagePlus aria-hidden className="size-4 shrink-0" />
                  Add photos in the listing&apos;s Photos step; they appear here to choose from.
                </p>
              )}
            </Section>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
              <div className="mr-auto flex flex-wrap gap-1.5" role="radiogroup" aria-label="On the menu">
                <Chip on={values.status !== "INACTIVE"} onClick={() => set("status", "ACTIVE")}>
                  On the menu today
                </Chip>
                <Chip on={values.status === "INACTIVE"} onClick={() => set("status", "INACTIVE")}>
                  Off the menu
                </Chip>
              </div>
              <Button onClick={onCancel} size="sm" type="button" variant="ghost">
                Cancel
              </Button>
              <Button disabled={isSubmitting} onClick={() => void form.handleSubmit(submit, refuse)()} size="sm" type="button">
                {isSubmitting ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : null}
                {isNew ? `Add ${words.one}` : `Save ${words.one}`}
              </Button>
            </div>
          </div>

          <aside className="flex flex-col gap-3 @3xl:sticky @3xl:top-20 @3xl:self-start">
            <p className="text-xs font-medium text-muted">How diners will see it</p>
            <DishCard currency={currency} layout="stacked" photoUrl={firstPhoto} values={values} />
            <div className="rounded-lg border border-line bg-paper px-3 py-2.5">
              <p className="mb-1.5 text-xs font-medium text-muted">
                {checklist.filter((item) => item.done).length} of {checklist.length} details
              </p>
              <ul className="flex flex-col gap-1">
                {checklist.map((item) => (
                  <li className="flex items-center gap-2 text-xs" key={item.label}>
                    {item.done ? (
                      <CircleCheck aria-hidden className="size-3.5 text-success" />
                    ) : (
                      <CircleDashed aria-hidden className="size-3.5 text-muted" />
                    )}
                    <span className={item.done ? "text-ink-soft" : "text-ink"}>{item.label}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-2xs text-muted">{spiceLabel(values.spiceLevel)}</p>
            </div>
          </aside>
        </div>
      </div>
    </FormProvider>
  );
}

/* -------------------------------------------------------------------------- */

function Section({ title, description, children }: { readonly title: string; readonly description?: string; readonly children: React.ReactNode }) {
  return (
    <section>
      <h4 className="text-sm font-semibold text-ink">{title}</h4>
      {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  error,
  hidden = false,
  children,
}: {
  readonly label: string;
  readonly error?: string;
  readonly hidden?: boolean;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="min-w-0" hidden={hidden}>
      <p className="mb-1.5 text-xs font-medium text-muted">{label}</p>
      {children}
      {error ? <p className="mt-1 text-xs text-heritage">{error}</p> : null}
    </div>
  );
}

function Chip({
  on,
  onClick,
  tone = "plain",
  children,
}: {
  readonly on: boolean;
  readonly onClick: () => void;
  readonly tone?: "plain" | "good" | "warn";
  readonly children: React.ReactNode;
}) {
  const chosen = tone === "warn" ? "border-gold bg-gold-soft text-gold-deep" : "border-teal bg-teal-soft text-teal-deep";
  return (
    <button
      aria-pressed={on}
      className={cn(
        "inline-flex h-8 items-center rounded-md border px-2.5 text-sm transition-colors",
        on ? chosen : "border-line-strong bg-paper text-ink-soft hover:bg-sand hover:text-ink",
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function Stepper({
  name,
  value,
  min,
  max,
  onStep,
}: {
  readonly name: string;
  readonly value: FormValues[string] | undefined;
  readonly min: number;
  readonly max: number;
  readonly onStep: (name: string, delta: number, min: number, max: number) => void;
}) {
  const current = Number.parseInt(typeof value === "string" ? value : "0", 10) || 0;
  return (
    <div className="inline-flex h-9 items-center rounded-md border border-line-strong bg-paper">
      <button
        aria-label="One fewer"
        className="grid size-9 place-items-center text-muted hover:text-ink disabled:opacity-40"
        disabled={current <= min}
        onClick={() => onStep(name, -1, min, max)}
        type="button"
      >
        <Minus aria-hidden className="size-3.5" />
      </button>
      <span className="w-8 text-center text-sm font-medium text-ink tabular-nums">{current}</span>
      <button
        aria-label="One more"
        className="grid size-9 place-items-center text-muted hover:text-ink disabled:opacity-40"
        disabled={current >= max}
        onClick={() => onStep(name, 1, min, max)}
        type="button"
      >
        <Plus aria-hidden className="size-3.5" />
      </button>
    </div>
  );
}
