"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, FormProvider, useForm, useWatch, type Resolver } from "react-hook-form";
import {
  BedDouble,
  ImagePlus,
  Loader2,
  Minus,
  Plus,
  TriangleAlert,
  Users,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import dynamic from "next/dynamic";
import type { SaveResult } from "@/features/catalog/form-state";
import { mediaPath, resourceSchema, type FormValues, type ResourceDefinition } from "@/features/catalog/resource";
import { ROOM_BEDS } from "@/features/catalog/resources";
import type { AmenityOption } from "@/features/catalog/amenities";
import {
  capacityWarning,
  sleepsOf,
  type BedName,
} from "@/features/catalog/rooms";
import { AmenityPicker } from "@/features/catalog/components/listing-form/amenity-picker";
import { RoomCard } from "@/features/catalog/components/listing-form/room-card";
import { IMAGE_ACCEPT, MAX_IMAGE_BYTES, prepareImage } from "@/features/catalog/media-upload";
import { useUploadText } from "@/features/catalog/use-image-upload";
import { useUploadMedia } from "@/features/media/api/media-api";
import { useApiErrorMessage } from "@/store/api/api-error";
import { cn } from "@/lib/utils";

/* Written in the browser only, like a listing's About: the editor has no server rendering. */
const RichText = dynamic(() => import("@/features/catalog/components/fields/rich-text"), {
  ssr: false,
  loading: () => <div className="min-h-40 rounded-md border border-line-strong bg-paper" />,
});

export interface GalleryPhoto {
  readonly key: string;
  readonly url: string;
}


/** What guests ask of a room first, offered before the full list. */

interface RoomEditorProps {
  readonly definition: ResourceDefinition;
  /** The amenities taxonomy as offered in a room. */
  readonly amenityOptions: readonly AmenityOption[];
  readonly initial: FormValues;

  readonly currency: string;
  /** The stay's gallery, to choose this room's photos from. */
  /** The stay's gallery, for the links of photos chosen from it before photos were uploaded here. */
  readonly photos: readonly GalleryPhoto[];
  /** The image category the room's own photos are uploaded under. */
  readonly category: string;
  readonly isNew: boolean;
  /** Saved into the stay's list; null when the list holds it until the stay is saved. */
  readonly onSave: (values: FormValues) => Promise<SaveResult>;
  readonly onCancel: () => void;
  /** What this kind of stay calls what it lets — a dorm, a villa (see ROOM_WORDS). */
}

/**
 * One room, written the way a host thinks about it: what kind of room, which
 * beds and for whom, what it is like, what it has, and what a night costs and
 * on which terms. The card on the right is the room as travellers will see it,
 * redrawn as it is filled in.
 *
 * Improvements on the usual room setup: the type picks its beds, the name
 * writes itself from the grade, beds and view until it is typed over, the beds
 * say how many they sleep and warn when the guests outnumber them, and the
 * photos are chosen from the stay's gallery rather than uploaded twice.
 */
export function RoomEditor({
  amenityOptions,
  definition,
  initial,
  currency,
  photos,
  category,
  isNew,
  onSave,
  onCancel,
}: RoomEditorProps) {
  const rooms = useTranslations("forms.rooms");
  const t = useTranslations("forms.rooms.editor");
  const actions = useTranslations("forms.actions");
  const text = useUploadText();
  const errorMessage = useApiErrorMessage();
  const schema = useMemo(() => resourceSchema(definition), [definition]);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<FormValues>,
    defaultValues: initial,
  });
  const values = useWatch({ control: form.control }) as FormValues;
  const { errors: fieldErrors, isSubmitting } = form.formState;
  const [adultsOwned, setAdultsOwned] = useState(!isNew);
  const [banner, setBanner] = useState<string | null>(null);

  const warning = capacityWarning(values, rooms);
  /* A bed's name as the registry gives it, in the reader's language. */
  const bedLabel = (name: string, fallback: string) => definition.fields.find((field) => field.name === name)?.label ?? fallback;
  const chosenPhotos = Array.isArray(values.photoKeys) ? values.photoKeys : [];
  /* Photos uploaded here, by key, so they can be shown before the room is saved. */
  const [uploaded, setUploaded] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(0);
  const [photoProblem, setPhotoProblem] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadMedia = useUploadMedia();
  const urlOf = (key: string) => uploaded[key] ?? photos.find((photo) => photo.key === key)?.url ?? mediaPath(key);
  const firstPhoto = chosenPhotos[0] ? urlOf(chosenPhotos[0]) : undefined;

  function set(name: string, value: FormValues[string]) {
    form.setValue(name, value, { shouldDirty: true, shouldValidate: Boolean(fieldErrors[name]) });
  }

  /** Values changed elsewhere in the room. */
  function update(next: FormValues) {
    for (const [name, value] of Object.entries(next)) {
      if (values[name] !== value) set(name, value);
    }
  }

  function step(name: string, delta: number, min: number, max: number) {
    const current = Number.parseInt(typeof values[name] === "string" ? (values[name] as string) : "0", 10) || 0;
    const next = String(Math.min(max, Math.max(min, current + delta)));
    if (ROOM_BEDS.some((bed) => bed.name === name)) {
      const withBed = { ...values, [name]: next };
      /* The guests follow the beds until the host sets them. */
      const adults = String(Math.max(1, values.roomType === "DORM_BED" ? 1 : sleepsOf(withBed)));
      update({ [name]: next, ...(adultsOwned ? {} : { maxAdults: adults }) });
      return;
    }
    if (name === "maxAdults") setAdultsOwned(true);
    update({ [name]: next });
  }

  /** Photos dropped or picked: each is checked, shrunk if huge, uploaded, and added to the dish in the order given. */
  async function addPhotos(files: readonly File[]) {
    if (!files.length) return;
    setPhotoProblem(null);
    setUploading((count) => count + files.length);
    const keys: string[] = [];
    const problems: string[] = [];
    for (const picked of files) {
      const problem = text.problem(picked);
      if (problem) {
        problems.push(problem);
        continue;
      }
      try {
        const file = await prepareImage(picked);
        if (file.size > MAX_IMAGE_BYTES) {
          problems.push(text.tooLarge(picked.name));
          continue;
        }
        const body = new FormData();
        body.set("file", file, file.name);
        body.set("category", category);
        const payload = await uploadMedia(body);
        keys.push(payload.key);
        setUploaded((map) => ({ ...map, [payload.key]: payload.uri || mediaPath(payload.key) }));
      } catch (error) {
        problems.push(`${picked.name}: ${errorMessage(error)}`);
      }
    }
    setUploading((count) => Math.max(0, count - files.length));
    if (keys.length) {
      const current = Array.isArray(form.getValues("photoKeys")) ? (form.getValues("photoKeys") as string[]) : [];
      set("photoKeys", [...current, ...keys.filter((key) => !current.includes(key))]);
    }
    if (problems.length) setPhotoProblem(problems.join(" "));
    if (fileInput.current) fileInput.current.value = "";
  }

  /** A problem with a field this editor does not show — said, rather than failing quietly. */
  function refuse(invalid: Record<string, { message?: unknown } | undefined>) {
    const shown = new Set(["name", "pricePerNight", "weekendPrice", "description"]);
    const hidden = Object.entries(invalid)
      .filter(([name]) => !shown.has(name))
      .map(([name, error]) => `${definition.fields.find((field) => field.name === name)?.label ?? name}: ${String(error?.message ?? t("invalid"))}`);
    setBanner(hidden.length ? t("check", { problems: hidden.join("; ") }) : t("attention"));
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

          <Field label={t("photos")}>
            <p className="-mt-0.5 mb-2 text-xs text-muted">{t("photosHint")}</p>
            <input
              accept={IMAGE_ACCEPT}
              className="sr-only"
              multiple
              onChange={(event) => void addPhotos(Array.from(event.target.files ?? []))}
              ref={fileInput}
              type="file"
            />
            <div className="flex flex-wrap gap-2">
              {chosenPhotos.map((key, at) => (
                <div className="group relative aspect-4/3 w-28 overflow-hidden rounded-md border border-line bg-sand-deep" key={key}>
                  <Image alt="" className="object-cover" fill sizes="112px" src={urlOf(key)} unoptimized />
                  <span className="absolute top-1 left-1 grid size-5 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground tabular-nums">
                    {at + 1}
                  </span>
                  <button
                    aria-label={t("removePhoto", { number: at + 1 })}
                    className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-paper/90 text-ink-soft shadow-xs hover:text-heritage"
                    onClick={() => set("photoKeys", chosenPhotos.filter((each) => each !== key))}
                    type="button"
                  >
                    <X aria-hidden className="size-3" />
                  </button>
                </div>
              ))}
              <button
                className="flex aspect-4/3 w-28 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-line-strong bg-sand text-xs text-muted transition-colors hover:border-teal hover:text-ink"
                disabled={uploading > 0}
                onClick={() => fileInput.current?.click()}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  void addPhotos(Array.from(event.dataTransfer.files));
                }}
                type="button"
              >
                {uploading > 0 ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <ImagePlus aria-hidden className="size-4" />}
                {uploading > 0 ? t("uploading") : t("addPhoto")}
              </button>
            </div>
            {photoProblem ? (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-heritage" role="alert">
                <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
                {photoProblem}
              </p>
            ) : null}
          </Field>

          <Field error={fieldErrors.name?.message as string | undefined} label={t("name")}>
            <Input {...form.register("name")} aria-invalid={Boolean(fieldErrors.name)} maxLength={150} placeholder={t("namePlaceholder")} />
          </Field>

          {/* The two prices side by side: the nightly one, and what a Friday or Saturday night costs when that differs. */}
          <div className="grid gap-x-4 gap-y-1 @md:grid-cols-2">
            <Field error={fieldErrors.pricePerNight?.message as string | undefined} label={t("price")}>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs text-muted">{currency}</span>
                <Input {...form.register("pricePerNight")} className="pl-12" inputMode="decimal" placeholder={t("pricePlaceholder")} />
              </div>
            </Field>
            <Field error={fieldErrors.weekendPrice?.message as string | undefined} label={t("weekend")}>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs text-muted">{currency}</span>
                <Input {...form.register("weekendPrice")} className="pl-12" inputMode="decimal" placeholder={t("weekendPlaceholder")} />
              </div>
            </Field>
            <p className="text-xs text-muted @md:col-span-2">{t("weekendHint")}</p>
            <label className="mt-1 flex items-center gap-2.5 text-sm text-ink-soft @md:col-span-2">
              <input {...form.register("breakfastIncluded")} className="size-4 accent-teal" type="checkbox" />
              {t("breakfast")}
            </label>
          </div>

          <div className="flex flex-wrap gap-x-8 gap-y-4">
            <Field label={t("adults")}>
              <Stepper max={40} min={1} name="maxAdults" onStep={step} value={values.maxAdults} />
            </Field>
            <Field label={t("children")}>
              <Stepper max={20} min={0} name="maxChildren" onStep={step} value={values.maxChildren} />
            </Field>
          </div>

          <Field label={t("about")}>
            <p className="-mt-0.5 mb-2 text-xs text-muted">{t("aboutHint")}</p>
            <Controller
              control={form.control}
              name="description"
              render={({ field }) => (
                <RichText
                  id="room-description"
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                  placeholder={t("aboutPlaceholder")}
                  value={typeof field.value === "string" ? field.value : ""}
                />
              )}
            />
          </Field>

          <Section description={t("bedsHint")} title={t("beds")}>
            <ul className="divide-y divide-line rounded-lg border border-line">
              {ROOM_BEDS.map((bed) => (
                <li className="flex items-center gap-3 px-3 py-2" key={bed.name}>
                  <BedDouble aria-hidden className="size-4 shrink-0 text-muted" strokeWidth={1.75} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-ink">{bedLabel(bed.name, bed.label)}</span>
                    <span className="block text-xs text-muted">{rooms(`bedSizes.${bed.name as BedName}`)}</span>
                  </span>
                  <Stepper max={20} min={0} name={bed.name} onStep={step} value={values[bed.name]} />
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3">
              <p className="inline-flex h-9 items-center gap-1.5 rounded-md bg-teal-soft px-3 text-sm font-medium text-teal-deep">
                <Users aria-hidden className="size-4" />
                {t("sleeps", { count: sleepsOf(values) })}
              </p>
            </div>
            {warning ? (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-gold-deep" role="status">
                <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
                {warning}
              </p>
            ) : null}
          </Section>

          <Section description={t("amenitiesHint")} title={t("amenities")}>
            <Controller
              control={form.control}
              name="amenities"
              render={({ field }) => (
                <AmenityPicker
                  labelledBy="room-facilities"
                  onChange={(next) => update({ amenities: next })}
                  options={amenityOptions}
                  popular={[]}
                  value={Array.isArray(field.value) ? field.value : []}
                />
              )}
            />
          </Section>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
            <div className="mr-auto flex flex-wrap gap-1.5" role="radiogroup" aria-label={t("availability")}>
              <Chip on={values.status !== "INACTIVE"} onClick={() => update({ status: "ACTIVE" })}>
                {t("available")}
              </Chip>
              <Chip on={values.status === "INACTIVE"} onClick={() => update({ status: "INACTIVE" })}>
                {t("unavailable")}
              </Chip>
            </div>
            <Button onClick={onCancel} size="sm" type="button" variant="ghost">
              {actions("cancel")}
            </Button>
            <Button disabled={isSubmitting} onClick={() => void form.handleSubmit(submit, refuse)()} size="sm" type="button">
              {isSubmitting ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : null}
              {isNew ? rooms("words.add") : rooms("words.save")}
            </Button>
          </div>
        </div>

        <aside className="flex flex-col gap-3 @3xl:sticky @3xl:top-20 @3xl:self-start">
          <p className="text-xs font-medium text-muted">{t("guestView")}</p>
          <RoomCard currency={currency} layout="stacked" photoUrl={firstPhoto} values={values} />
          {firstPhoto ? null : <p className="-mt-1 text-2xs text-gold-deep">{t("photoNudge")}</p>}
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

/** What a week or a month works out at a night, or the price to start from. */
function Field({ label, error, children }: { readonly label: string; readonly error?: string; readonly children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-xs font-medium text-muted">{label}</p>
      {children}
      {error ? <p className="mt-1 text-xs text-heritage">{error}</p> : null}
    </div>
  );
}

function Chip({ on, onClick, children }: { readonly on: boolean; readonly onClick: () => void; readonly children: React.ReactNode }) {
  return (
    <button
      aria-pressed={on}
      className={cn(
        "inline-flex h-8 items-center rounded-md border px-2.5 text-sm transition-colors",
        on ? "border-teal bg-teal-soft text-teal-deep" : "border-line-strong bg-paper text-ink-soft hover:bg-sand hover:text-ink",
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
  const t = useTranslations("forms.rooms.editor");
  const current = Number.parseInt(typeof value === "string" ? value : "0", 10) || 0;
  return (
    <div className="inline-flex h-9 items-center rounded-md border border-line-strong bg-paper">
      <button
        aria-label={t("fewer")}
        className="grid size-9 place-items-center text-muted hover:text-ink disabled:opacity-40"
        disabled={current <= min}
        onClick={() => onStep(name, -1, min, max)}
        type="button"
      >
        <Minus aria-hidden className="size-3.5" />
      </button>
      <span className="w-8 text-center text-sm font-medium text-ink tabular-nums">{current}</span>
      <button
        aria-label={t("more")}
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
