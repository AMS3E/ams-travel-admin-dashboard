"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, FormProvider, useForm, useWatch, type Resolver } from "react-hook-form";
import {
  BedDouble,
  BedSingle,
  Building,
  Castle,
  CircleCheck,
  CircleDashed,
  Crown,
  House,
  ImagePlus,
  LayoutGrid,
  Loader2,
  Minus,
  Plus,
  Sparkles,
  Tent,
  TreePalm,
  TriangleAlert,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SaveResult } from "@/features/catalog/form-state";
import { mediaPath, resourceSchema, type FormValues, type ResourceDefinition } from "@/features/catalog/resource";
import { ROOM_AMENITIES, ROOM_BATHROOMS, ROOM_BEDS, ROOM_HOUSEKEEPING, ROOM_PAYMENT_TERMS, ROOM_TYPES, ROOM_VIEWS, alphabetical } from "@/features/catalog/resources";
import {
  CANCELLATION_CHOICES,
  ROOM_GRADES,
  ROOM_WORDS,
  cancellationLabel,
  capacityWarning,
  floorLabel,
  layoutLine,
  longStayWarning,
  perNightOver,
  roomChecklist,
  sleepsOf,
  suggestMonthly,
  suggestName,
  suggestWeekly,
  withBedsFor,
  type RoomGrade,
  type RoomWords,
} from "@/features/catalog/rooms";
import { AmenityPicker } from "@/features/catalog/components/listing-form/amenity-picker";
import { RoomCard, formatMoney } from "@/features/catalog/components/listing-form/room-card";
import { cn } from "@/lib/utils";

export interface GalleryPhoto {
  readonly key: string;
  readonly url: string;
}

const TYPE_ICONS: Readonly<Record<string, LucideIcon>> = {
  SINGLE: BedSingle,
  DOUBLE: BedDouble,
  TWIN: BedSingle,
  TWIN_DOUBLE: BedDouble,
  TRIPLE: Users,
  QUADRUPLE: Users,
  FAMILY: Users,
  SUITE: Crown,
  STUDIO: Building,
  APARTMENT: Building,
  BUNGALOW: TreePalm,
  VILLA: Castle,
  DORM_BED: Tent,
  DORM_ROOM: House,
};

/** What guests ask of a room first, offered before the full list. */
const ROOM_MOST_REQUESTED = ["air-conditioning", "wifi", "hot-water", "tv", "balcony", "kettle", "safe", "mosquito-net"];

interface RoomEditorProps {
  readonly definition: ResourceDefinition;
  readonly initial: FormValues;
  readonly initialGrade: RoomGrade;
  readonly currency: string;
  /** The stay's gallery, to choose this room's photos from. */
  readonly photos: readonly GalleryPhoto[];
  readonly isNew: boolean;
  /** Saved into the stay's list; null when the list holds it until the stay is saved. */
  readonly onSave: (values: FormValues) => Promise<SaveResult>;
  readonly onCancel: () => void;
  /** What this kind of stay calls what it lets — a dorm, a villa (see ROOM_WORDS). */
  readonly words?: RoomWords;
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
  definition,
  initial,
  initialGrade,
  currency,
  photos,
  isNew,
  onSave,
  onCancel,
  words = ROOM_WORDS.OTHER,
}: RoomEditorProps) {
  const schema = useMemo(() => resourceSchema(definition), [definition]);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<FormValues>,
    defaultValues: initial,
  });
  const values = useWatch({ control: form.control }) as FormValues;
  const { errors, isSubmitting } = form.formState;
  const [grade, setGrade] = useState<RoomGrade>(initialGrade);
  /* The name follows the room until someone types their own; an existing room's is theirs already. */
  const [nameOwned, setNameOwned] = useState(!isNew);
  const [bedsOwned, setBedsOwned] = useState(!isNew);
  const [adultsOwned, setAdultsOwned] = useState(!isNew);
  const [banner, setBanner] = useState<string | null>(null);

  const suggested = suggestName(values, grade);
  const warning = capacityWarning(values);
  const checklist = roomChecklist(values);
  const chosenPhotos = Array.isArray(values.photoKeys) ? values.photoKeys : [];
  const firstPhoto = photos.find((photo) => photo.key === chosenPhotos[0])?.url ?? (chosenPhotos[0] ? mediaPath(chosenPhotos[0]) : undefined);

  function set(name: string, value: FormValues[string]) {
    form.setValue(name, value, { shouldDirty: true, shouldValidate: Boolean(errors[name]) });
  }

  /** Values changed elsewhere in the room, with the name following while it is not the host's own. */
  function update(next: FormValues, nextGrade = grade) {
    for (const [name, value] of Object.entries(next)) {
      if (values[name] !== value) set(name, value);
    }
    if (!nameOwned) set("name", suggestName({ ...values, ...next }, nextGrade));
  }

  function chooseType(roomType: string) {
    if (bedsOwned) {
      update({ roomType });
      return;
    }
    const withBeds = withBedsFor(values, roomType);
    update(adultsOwned ? { ...withBeds, maxAdults: values.maxAdults } : withBeds);
  }

  function step(name: string, delta: number, min: number, max: number) {
    const current = Number.parseInt(typeof values[name] === "string" ? (values[name] as string) : "0", 10) || 0;
    const next = String(Math.min(max, Math.max(min, current + delta)));
    if (ROOM_BEDS.some((bed) => bed.name === name)) {
      setBedsOwned(true);
      const withBed = { ...values, [name]: next };
      /* The guests follow the beds until the host sets them. */
      const adults = String(Math.max(1, values.roomType === "DORM_BED" ? 1 : sleepsOf(withBed)));
      update({ [name]: next, ...(adultsOwned ? {} : { maxAdults: adults }) });
      return;
    }
    if (name === "maxAdults") setAdultsOwned(true);
    update({ [name]: next });
  }

  /** A problem with a field this editor does not show — said, rather than failing quietly. */
  function refuse(invalid: Record<string, { message?: unknown } | undefined>) {
    const shown = new Set([
      "name", "sizeSqm", "pricePerNight", "highlight", "extraBedPrice", "cotPrice", "childrenFreeUnderAge",
      "highSeasonPrice", "weeklyPrice", "monthlyPrice", "depositPercent", "floor",
    ]);
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

          <Section title={words.what}>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-5" role="radiogroup" aria-label="Room type">
              {alphabetical(ROOM_TYPES).map((option) => {
                const Icon = TYPE_ICONS[option.value] ?? BedDouble;
                const on = values.roomType === option.value;
                return (
                  <button
                    aria-checked={on}
                    className={cn(
                      "flex h-9 items-center gap-2 rounded-md border px-2.5 text-left text-sm transition-colors",
                      on ? "border-teal bg-teal-soft font-medium text-teal-deep" : "border-line-strong bg-paper text-ink-soft hover:bg-sand",
                    )}
                    key={option.value}
                    onClick={() => chooseType(option.value)}
                    role="radio"
                    type="button"
                  >
                    <Icon aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
                    <span className="truncate">{option.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs font-medium text-muted">Word before the name</span>
              {ROOM_GRADES.map((each) => (
                <Chip
                  key={each || "none"}
                  on={grade === each}
                  onClick={() => {
                    setGrade(each);
                    if (!nameOwned) set("name", suggestName(values, each));
                  }}
                >
                  {each || "None"}
                </Chip>
              ))}
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
              <Field error={errors.name?.message as string | undefined} label="Room name">
                <Input
                  {...form.register("name", { onChange: () => setNameOwned(true) })}
                  aria-invalid={Boolean(errors.name)}
                  maxLength={150}
                  placeholder={suggested}
                />
                {values.name !== suggested ? (
                  <button
                    className="mt-1.5 inline-flex items-center gap-1 text-xs text-teal-deep hover:underline"
                    onClick={() => {
                      set("name", suggested);
                      setNameOwned(false);
                    }}
                    type="button"
                  >
                    <Sparkles aria-hidden className="size-3.5" />
                    Use “{suggested}”
                  </button>
                ) : (
                  <p className="mt-1.5 text-xs text-muted">Written from the grade, beds and view until you type your own.</p>
                )}
              </Field>
              <Field label={values.roomType === "DORM_BED" ? "Beds in this dorm" : "How many rooms like this"}>
                <Stepper max={500} min={1} name="roomCount" onStep={step} value={values.roomCount} />
              </Field>
            </div>
            <div className="mt-4">
              <Field error={errors.highlight?.message as string | undefined} label="Highlight — one line that makes it stand out">
                <Input {...form.register("highlight")} maxLength={150} placeholder="e.g. Corner room with the sunset over the Mekong" />
              </Field>
            </div>
          </Section>

          <Section
            description={values.roomType === "DORM_BED" ? "The beds in the dorm; each guest books one." : "Every bed in the room, and the most guests it takes."}
            title="Beds and guests"
          >
            <ul className="divide-y divide-line rounded-lg border border-line">
              {ROOM_BEDS.map((bed) => (
                <li className="flex items-center gap-3 px-3 py-2" key={bed.name}>
                  <BedDouble aria-hidden className="size-4 shrink-0 text-muted" strokeWidth={1.75} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-ink">{bed.label}</span>
                    <span className="block text-xs text-muted">{bed.size}</span>
                  </span>
                  <Stepper max={20} min={0} name={bed.name} onStep={step} value={values[bed.name]} />
                </li>
              ))}
            </ul>

            <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-3">
              <Field label="Adults">
                <Stepper max={40} min={1} name="maxAdults" onStep={step} value={values.maxAdults} />
              </Field>
              <Field label="Children">
                <Stepper max={20} min={0} name="maxChildren" onStep={step} value={values.maxChildren} />
              </Field>
              <p className="inline-flex h-9 items-center gap-1.5 rounded-md bg-teal-soft px-3 text-sm font-medium text-teal-deep">
                <Users aria-hidden className="size-4" />
                The beds sleep {sleepsOf(values)}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-3">
              <Field label="Extra beds you can add">
                <Stepper max={4} min={0} name="extraBeds" onStep={step} value={values.extraBeds} />
              </Field>
              {Number(values.extraBeds) > 0 ? (
                <Field error={errors.extraBedPrice?.message as string | undefined} label="Extra bed, per night">
                  <div className="relative w-40">
                    <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs text-muted">{currency}</span>
                    <Input {...form.register("extraBedPrice")} className="pl-12" inputMode="decimal" placeholder="e.g. 10" />
                  </div>
                </Field>
              ) : null}
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-3">
              <Field label="Cots you can add">
                <Stepper max={4} min={0} name="cots" onStep={step} value={values.cots} />
              </Field>
              {Number(values.cots) > 0 ? (
                <Field error={errors.cotPrice?.message as string | undefined} label="Cot, per night">
                  <div className="relative w-40">
                    <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs text-muted">{currency}</span>
                    <Input {...form.register("cotPrice")} className="pl-12" inputMode="decimal" placeholder="Free" />
                  </div>
                </Field>
              ) : null}
              <Field error={errors.childrenFreeUnderAge?.message as string | undefined} label="Children stay free under">
                <div className="relative w-36">
                  <Input {...form.register("childrenFreeUnderAge")} className="pr-14" inputMode="numeric" placeholder="Nobody" />
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted">years</span>
                </div>
              </Field>
            </div>
            {Number(values.childrenFreeUnderAge) > 0 ? (
              <p className="mt-1.5 text-xs text-muted">
                Children under {Number(values.childrenFreeUnderAge)} sleep in the beds already there at no charge.
              </p>
            ) : null}
            {warning ? (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-gold-deep" role="status">
                <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
                {warning}
              </p>
            ) : null}
          </Section>

          <Section title={words.like}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field error={errors.sizeSqm?.message as string | undefined} label="Size">
                <div className="relative">
                  <Input {...form.register("sizeSqm")} className="pr-10" inputMode="decimal" placeholder="e.g. 28" />
                  <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted">m²</span>
                </div>
                {Number(values.sizeSqm) > 0 ? (
                  <p className="mt-1 text-xs text-muted tabular-nums">About {Math.round(Number(values.sizeSqm) * 10.764)} sq ft</p>
                ) : null}
              </Field>
              <Field label="Bathroom">
                <div className="flex gap-1.5">
                  {alphabetical(ROOM_BATHROOMS).map((option) => (
                    <Chip key={option.value} on={values.bathroom === option.value} onClick={() => update({ bathroom: option.value })}>
                      {option.label}
                    </Chip>
                  ))}
                </div>
              </Field>
            </div>
            <div className="mt-4">
              <p className="mb-1.5 text-xs font-medium text-muted">View</p>
              <div className="flex flex-wrap gap-1.5">
                <Chip on={!values.view} onClick={() => update({ view: "" })}>
                  No particular view
                </Chip>
                {alphabetical(ROOM_VIEWS).map((option) => (
                  <Chip key={option.value} on={values.view === option.value} onClick={() => update({ view: option.value })}>
                    {option.label}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs font-medium text-muted">Window</span>
              <Chip on={values.hasWindow !== false} onClick={() => update({ hasWindow: true })}>
                Has a window
              </Chip>
              <Chip on={values.hasWindow === false} onClick={() => update({ hasWindow: false })}>
                No window
              </Chip>
            </div>
            <label className="mt-3 flex items-center gap-2.5 text-sm text-ink-soft">
              <input {...form.register("smokingAllowed")} className="size-4 accent-teal" type="checkbox" />
              Smoking allowed in this room
            </label>
          </Section>

          <Section description="What is inside it, where it is in the building, and how it is looked after." title="How it is laid out">
            <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
              <Field label="Bedrooms">
                <Stepper max={20} min={0} name="bedrooms" onStep={step} value={values.bedrooms} />
              </Field>
              <Field label="Living rooms">
                <Stepper max={10} min={0} name="livingRooms" onStep={step} value={values.livingRooms} />
              </Field>
              <Field label="Bathrooms">
                <Stepper max={20} min={0} name="bathroomCount" onStep={step} value={values.bathroomCount} />
              </Field>
              {layoutLine(values) ? (
                <p className="inline-flex h-9 items-center gap-1.5 rounded-md bg-teal-soft px-3 text-sm font-medium text-teal-deep">
                  <LayoutGrid aria-hidden className="size-4" />
                  {layoutLine(values)}
                </p>
              ) : null}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field error={errors.floor?.message as string | undefined} label="Floor">
                <Input {...form.register("floor")} inputMode="numeric" placeholder="Ground floor is 0" />
                <p className="mt-1 text-xs text-muted">
                  {floorLabel(values.floor) || "Left open — rooms like this are on different floors."}
                </p>
              </Field>
              <Field label="Lift">
                <div className="flex gap-1.5">
                  <Chip on={values.liftAccess === true} onClick={() => update({ liftAccess: true })}>
                    A lift reaches it
                  </Chip>
                  <Chip on={values.liftAccess !== true} onClick={() => update({ liftAccess: false })}>
                    Stairs only
                  </Chip>
                </div>
                {values.liftAccess !== true && Number(values.floor) > 0 ? (
                  <p className="mt-1 text-xs text-gold-deep">Guests will read “{floorLabel(values.floor)}, stairs only”.</p>
                ) : null}
              </Field>
            </div>
            <div className="mt-4">
              <p className="mb-1.5 text-xs font-medium text-muted">Cleaning during the stay</p>
              <div className="flex flex-wrap gap-1.5">
                <Chip on={!values.housekeeping} onClick={() => update({ housekeeping: "" })}>
                  Not said
                </Chip>
                {ROOM_HOUSEKEEPING.map((option) => (
                  <Chip key={option.value} on={values.housekeeping === option.value} onClick={() => update({ housekeeping: option.value })}>
                    {option.label}
                  </Chip>
                ))}
              </div>
            </div>
          </Section>

          <Section description="Only what every room like this has. Guests filter rooms by these." title="What does it have?">
            <Controller
              control={form.control}
              name="amenities"
              render={({ field }) => (
                <AmenityPicker
                  labelledBy="room-facilities"
                  onChange={(next) => update({ amenities: next })}
                  options={ROOM_AMENITIES}
                  popular={ROOM_MOST_REQUESTED}
                  value={Array.isArray(field.value) ? field.value : []}
                />
              )}
            />
          </Section>

          <Section description="The cheapest bookable room becomes the “From” price guests see for this stay." title="Price and terms">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field error={errors.pricePerNight?.message as string | undefined} label="Price per night">
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs text-muted">{currency}</span>
                  <Input {...form.register("pricePerNight")} className="pl-12" inputMode="decimal" placeholder="e.g. 45" />
                </div>
              </Field>
              <label className="flex items-center gap-2.5 self-end pb-2 text-sm text-ink-soft">
                <input {...form.register("breakfastIncluded")} className="size-4 accent-teal" type="checkbox" />
                Breakfast included in the price
              </label>
              <Field error={errors.highSeasonPrice?.message as string | undefined} label="High-season price (Nov–Apr)">
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs text-muted">{currency}</span>
                  <Input {...form.register("highSeasonPrice")} className="pl-12" inputMode="decimal" placeholder="Same all year" />
                </div>
              </Field>
              <label className="flex items-center gap-2.5 self-end pb-2 text-sm text-ink-soft">
                <input {...form.register("taxesIncluded")} className="size-4 accent-teal" type="checkbox" />
                Taxes included in the price
              </label>
            </div>
            <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3">
              <Field label="Shortest stay (nights)">
                <Stepper max={60} min={1} name="minNights" onStep={step} value={values.minNights} />
              </Field>
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted">Payment</p>
                <div className="flex flex-wrap gap-1.5">
                  {ROOM_PAYMENT_TERMS.map((option) => (
                    <Chip key={option.value} on={values.paymentTerms === option.value} onClick={() => update({ paymentTerms: option.value })}>
                      {option.label}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field error={errors.weeklyPrice?.message as string | undefined} label="Price per week">
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs text-muted">{currency}</span>
                  <Input {...form.register("weeklyPrice")} className="pl-12" inputMode="decimal" placeholder="No weekly rate" />
                </div>
                <LongStayHint currency={currency} nights={7} onUse={() => set("weeklyPrice", suggestWeekly(values))} suggestion={suggestWeekly(values)} value={values.weeklyPrice} />
              </Field>
              <Field error={errors.monthlyPrice?.message as string | undefined} label="Price per month">
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs text-muted">{currency}</span>
                  <Input {...form.register("monthlyPrice")} className="pl-12" inputMode="decimal" placeholder="No monthly rate" />
                </div>
                <LongStayHint currency={currency} nights={30} onUse={() => set("monthlyPrice", suggestMonthly(values))} suggestion={suggestMonthly(values)} value={values.monthlyPrice} />
              </Field>
            </div>
            {longStayWarning(values) ? (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-gold-deep" role="status">
                <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
                {longStayWarning(values)}
              </p>
            ) : null}
            {values.paymentTerms === "DEPOSIT" ? (
              <div className="mt-4">
                <Field error={errors.depositPercent?.message as string | undefined} label="Deposit to book">
                  <div className="relative w-36">
                    <Input {...form.register("depositPercent")} className="pr-8" inputMode="numeric" placeholder="e.g. 30" />
                    <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted">%</span>
                  </div>
                </Field>
              </div>
            ) : null}
            <div className="mt-4">
              <p className="mb-1.5 text-xs font-medium text-muted">Cancellation</p>
              <div className="flex flex-wrap gap-1.5">
                {CANCELLATION_CHOICES.map((days) => (
                  <Chip key={days || "none"} on={(values.freeCancellationDays ?? "") === days} onClick={() => update({ freeCancellationDays: days })}>
                    {days === "" ? "Non-refundable" : days === "0" ? "Free until arrival" : `Free until ${days} ${days === "1" ? "day" : "days"} before`}
                  </Chip>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-muted">{cancellationLabel(values.freeCancellationDays)}.</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Shown to guests">
              <Chip on={values.status !== "INACTIVE"} onClick={() => update({ status: "ACTIVE" })}>
                Guests can book it
              </Chip>
              <Chip on={values.status === "INACTIVE"} onClick={() => update({ status: "INACTIVE" })}>
                Hidden from guests for now
              </Chip>
            </div>
          </Section>

          <Section description="Chosen from the stay's gallery, so nothing is uploaded twice. The first one leads the room's card." title="Photos">
            {photos.length && chosenPhotos.length === 0 ? (
              <p className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-gold/40 bg-gold-soft px-3 py-2 text-sm text-gold-deep" role="status">
                <TriangleAlert aria-hidden className="size-4 shrink-0" />
                No photo chosen yet — guests will see this room without a picture.
                <button
                  className="font-semibold underline underline-offset-2"
                  onClick={() => update({ photoKeys: [photos[0].key] })}
                  type="button"
                >
                  Use the first gallery photo
                </button>
              </p>
            ) : null}
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
                          update({ photoKeys: at >= 0 ? chosenPhotos.filter((key) => key !== photo.key) : [...chosenPhotos, photo.key] })
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
                Add photos in the stay&apos;s Photos step; they appear here to choose from.
              </p>
            )}
          </Section>

          <Section title="Anything else guests should know?">
            <Textarea {...form.register("description")} placeholder="The layout, the light, what makes it the one to choose…" rows={3} />
          </Section>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
            <Button onClick={onCancel} size="sm" type="button" variant="ghost">
              Cancel
            </Button>
            <Button disabled={isSubmitting} onClick={() => void form.handleSubmit(submit, refuse)()} size="sm" type="button">
              {isSubmitting ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : null}
              {isNew ? words.add : words.save}
            </Button>
          </div>
        </div>

        <aside className="flex flex-col gap-3 @3xl:sticky @3xl:top-20 @3xl:self-start">
          <p className="text-xs font-medium text-muted">How guests will see it</p>
          <RoomCard currency={currency} layout="stacked" photoUrl={firstPhoto} values={values} />
          {firstPhoto ? null : <p className="-mt-1 text-2xs text-gold-deep">Rooms with a photo are chosen far more often than ones without.</p>}
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

/** What a week or a month works out at a night, or the price to start from. */
function LongStayHint({
  value,
  suggestion,
  nights,
  currency,
  onUse,
}: {
  readonly value: FormValues[string] | undefined;
  readonly suggestion: string;
  readonly nights: number;
  readonly currency: string;
  readonly onUse: () => void;
}) {
  const nightly = perNightOver(typeof value === "string" ? value : "", nights);
  if (nightly) return <p className="mt-1 text-xs text-muted tabular-nums">Works out at {formatMoney(Number(nightly), currency)} a night.</p>;
  if (!suggestion) return null;
  return (
    <button className="mt-1 inline-flex items-center gap-1 text-xs text-teal-deep hover:underline" onClick={onUse} type="button">
      <Sparkles aria-hidden className="size-3.5" />
      Use {formatMoney(Number(suggestion), currency)}
    </button>
  );
}

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
  const current = Number.parseInt(typeof value === "string" ? value : "0", 10) || 0;
  return (
    <div className="inline-flex h-9 items-center rounded-md border border-line-strong bg-paper">
      <button
        aria-label={`One fewer`}
        className="grid size-9 place-items-center text-muted hover:text-ink disabled:opacity-40"
        disabled={current <= min}
        onClick={() => onStep(name, -1, min, max)}
        type="button"
      >
        <Minus aria-hidden className="size-3.5" />
      </button>
      <span className="w-8 text-center text-sm font-medium text-ink tabular-nums">{current}</span>
      <button
        aria-label={`One more`}
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
