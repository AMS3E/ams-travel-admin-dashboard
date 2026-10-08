"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm, useWatch, type Resolver } from "react-hook-form";
import { ImagePlus, Loader2, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SaveResult } from "@/features/catalog/form-state";
import { mediaPath, resourceSchema, type FormValues, type ResourceDefinition } from "@/features/catalog/resource";
import type { MenuWords } from "@/features/catalog/menu";
import { IMAGE_ACCEPT, MAX_IMAGE_BYTES, imageProblem, prepareImage } from "@/features/catalog/media-upload";
import { useUploadMedia } from "@/features/media/api/media-api";
import { apiErrorMessage } from "@/store/api/api-error";
import { DishCard } from "@/features/catalog/components/listing-form/dish-card";
import type { GalleryPhoto } from "@/features/catalog/components/listing-form/room-editor";
import { cn } from "@/lib/utils";

interface DishEditorProps {
  readonly definition: ResourceDefinition;
  readonly initial: FormValues;
  readonly currency: string;
  /** RESTAURANT, CAFE…: which course headings this menu is printed under. */
  readonly foodType: string;
  /** What one thing on this menu is called — a dish, an item — and an example to type over. */
  readonly words: MenuWords;
  /** The listing's gallery, for the links of photos chosen from it before photos were uploaded here. */
  readonly photos: readonly GalleryPhoto[];
  /** The image category the dish's own photos are uploaded under. */
  readonly category: string;
  /** The headings this menu already has, offered as the dish's category. */
  readonly sections: readonly string[];
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
export function DishEditor({ definition, initial, currency, words, photos, category, sections, isNew, onSave, onCancel }: DishEditorProps) {
  const schema = useMemo(() => resourceSchema(definition), [definition]);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<FormValues>,
    defaultValues: initial,
  });
  const values = useWatch({ control: form.control }) as FormValues;
  const { errors, isSubmitting } = form.formState;
  const [banner, setBanner] = useState<string | null>(null);

  const chosenPhotos = Array.isArray(values.photoKeys) ? values.photoKeys : [];
  /* Photos uploaded here, by key, so they can be shown before the dish is saved. */
  const [uploaded, setUploaded] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(0);
  const [photoProblem, setPhotoProblem] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadMedia = useUploadMedia();
  const urlOf = (key: string) => uploaded[key] ?? photos.find((photo) => photo.key === key)?.url ?? mediaPath(key);
  const firstPhoto = chosenPhotos[0] ? urlOf(chosenPhotos[0]) : undefined;

  function set(name: string, value: FormValues[string]) {
    form.setValue(name, value, { shouldDirty: true, shouldValidate: Boolean(errors[name]) });
  }

  /** Photos dropped or picked: each is checked, shrunk if huge, uploaded, and added to the dish in the order given. */
  async function addPhotos(files: readonly File[]) {
    if (!files.length) return;
    setPhotoProblem(null);
    setUploading((count) => count + files.length);
    const keys: string[] = [];
    const problems: string[] = [];
    for (const picked of files) {
      const problem = imageProblem(picked);
      if (problem) {
        problems.push(problem);
        continue;
      }
      try {
        const file = await prepareImage(picked);
        if (file.size > MAX_IMAGE_BYTES) {
          problems.push(`${picked.name} is still larger than 8 MB after resizing.`);
          continue;
        }
        const body = new FormData();
        body.set("file", file, file.name);
        body.set("category", category);
        const payload = await uploadMedia(body);
        keys.push(payload.key);
        setUploaded((map) => ({ ...map, [payload.key]: payload.uri || mediaPath(payload.key) }));
      } catch (error) {
        problems.push(`${picked.name}: ${apiErrorMessage(error)}`);
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
    const shown = new Set(["name", "localName", "section", "description", "price"]);
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

            <Field label="Photos">
              <p className="-mt-0.5 mb-2 text-xs text-muted">Uploaded here, for this {words.one}. The first one leads it.</p>
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
                    <span className="absolute top-1 left-1 grid size-5 place-items-center rounded-full bg-teal text-2xs font-semibold text-white tabular-nums">
                      {at + 1}
                    </span>
                    <button
                      aria-label={`Remove photo ${at + 1}`}
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
                  {uploading > 0 ? "Uploading…" : "Add photo"}
                </button>
              </div>
              {photoProblem ? (
                <p className="mt-2 flex items-start gap-1.5 text-xs text-heritage" role="alert">
                  <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
                  {photoProblem}
                </p>
              ) : null}
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field error={errors.name?.message as string | undefined} label="Name on the menu">
                <Input {...form.register("name")} aria-invalid={Boolean(errors.name)} maxLength={150} placeholder={`e.g. ${words.example}`} />
              </Field>
              <Field error={errors.localName?.message as string | undefined} label="Name in Khmer">
                <Input {...form.register("localName")} maxLength={150} placeholder={words.exampleKm || "Khmer name"} />
                <p className="mt-1 text-xs text-muted">What a traveller points at to order.</p>
              </Field>
              <Field error={errors.price?.message as string | undefined} label="Price">
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs text-muted">{currency}</span>
                  <Input {...form.register("price")} className="pl-12" inputMode="decimal" placeholder="e.g. 6.50" />
                </div>
              </Field>
              <Field error={errors.section?.message as string | undefined} label="Category">
                <Input {...form.register("section")} list="dish-sections" maxLength={100} placeholder="e.g. Soups" />
                <datalist id="dish-sections">
                  {sections.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
                <p className="mt-1 text-xs text-muted">The heading it is printed under. Pick one you have, or write a new one.</p>
              </Field>
              <div className="sm:col-span-2">
                <Field error={errors.description?.message as string | undefined} label={`Describe the ${words.one}`}>
                  <Textarea {...form.register("description")} placeholder="How it is cooked and what comes with it…" rows={3} />
                </Field>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
              <div className="mr-auto flex flex-wrap gap-1.5" role="radiogroup" aria-label="Availability">
                <Chip on={values.status !== "INACTIVE"} onClick={() => set("status", "ACTIVE")}>
                  Available
                </Chip>
                <Chip on={values.status === "INACTIVE"} onClick={() => set("status", "INACTIVE")}>
                  Unavailable
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
          </aside>
        </div>
      </div>
    </FormProvider>
  );
}

/* -------------------------------------------------------------------------- */


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

