"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FormProvider,
  useForm,
  useFormContext,
  useWatch,
  type FieldErrors,
  type Resolver,
} from "react-hook-form";
import {
  Check,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  FilePen,
  Lightbulb,
  Loader2,
  Lock,
  Rocket,
  Save,
  Send,
  Trash2,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  useDeleteRecordMutation,
  useGetReferenceOptionsQuery,
  useSaveRecordMutation,
} from "@/features/catalog/api/catalog-api";
import type { CatalogRecord } from "@/features/catalog/api/contracts";
import {
  GalleryDropContext,
  GalleryManager,
  type GalleryHandle,
  type PendingPhoto,
} from "@/features/catalog/components/listing-form/gallery-manager";
import { ListingField } from "@/features/catalog/components/listing-form/listing-field";
import { RoomsManager, type RoomDraft } from "@/features/catalog/components/listing-form/rooms-manager";
import { MenuManager, type DishDraft } from "@/features/catalog/components/listing-form/menu-manager";
import type { MenuSummary } from "@/features/catalog/menu";
import type { RoomSummary } from "@/features/catalog/rooms";
import { ListingPreview } from "@/features/catalog/components/listing-form/listing-preview";
import { LocationMap } from "@/features/catalog/components/listing-form/location-map";
import {
  LISTING_GALLERIES,
  isFilled,
  listingSteps,
  readinessChecks,
  stepFields,
  type ListingKey,
  type ListingStep,
  type ReadinessCheck,
} from "@/features/catalog/components/listing-form/steps";
import { listPageOf } from "@/features/catalog/all-destinations";
import { derivedRegions } from "@/features/catalog/narrowing";
import { getResource } from "@/features/catalog/resources";
import { progressLabel, useGalleryRows, type UploadProgress } from "@/features/catalog/use-image-upload";
import {
  galleryOf,
  isShown,
  resourceSchema,
  statusChoices,
  statusOption,
  statusValueOf,
  toFormValues,
  type FormValues,
  type ReferenceOptions,
  type ResourceDefinition,
  type ResourceField,
  type StatusOption,
} from "@/features/catalog/resource";
import { useGetPublishRequestsQuery, useSubmitPublishRequestMutation } from "@/features/publishing/api/publishing-api";
import { lastActivityOf, listingTypeOf, type PublishRequestResponse } from "@/features/publishing/api/contracts";
import { apiErrorMessage } from "@/store/api/api-error";
import { cn } from "@/lib/utils";

interface ListingFormProps {
  readonly definition: ResourceDefinition;
  /** `null` when creating. */
  readonly record: CatalogRecord | null;
  readonly referenceOptions: ReferenceOptions;
  readonly canDelete?: boolean;
  readonly canEdit?: boolean;
  readonly canSetStatus?: boolean;
  /** Creating: the new listing may go live at once, and the last section offers Published or Draft. */
  readonly canPublishOnCreate?: boolean;
  readonly afterSaveHref?: string;
  readonly presets?: Readonly<FormValues>;
  readonly cancelHref?: string;
  /** What this person may do to the listing's photo gallery; absent hides it. */
  readonly gallery?: { readonly canAdd: boolean; readonly canDelete: boolean };
  /**
   * Who decides this person's destinations — "a BDO", "an editor" — when they
   * cannot publish themselves. The last section then sends it for review.
   */
  readonly reviewer?: string;
  /**
   * Opened from a review, to correct the listing before deciding on it: saving
   * goes back to the review, and whether it goes live is that decision's to
   * say, not this form's.
   */
  readonly reviewHref?: string;
}

/** One line of the checklist as the form stands: whether it is met, and the section it belongs to. */
type CheckRow = ReadinessCheck & { readonly done: boolean; readonly at: number };

/** A section as the checklist beside the form shows it. */
interface SectionInfo {
  readonly id: string;
  readonly title: string;
  /** The picture that stands for the section in the checklist. */
  readonly icon: LucideIcon;
  /** `done` once every check of its own is met; a section with none stays `todo`. */
  readonly state: "done" | "error" | "todo";
  /** Its checks still to do, listed under it. */
  readonly missing: readonly CheckRow[];
  /** Not on the page yet: a new listing's kind is still to be chosen. */
  readonly locked: boolean;
}

/** Where a section sits in the page, for the checklist to scroll to. */
const sectionDomId = (id: string) => `listing-section-${id}`;

/**
 * A destination, a stay or a food listing, written on one page.
 *
 * Every section is on the page at once — its heading and its groups of fields
 * divided by hairlines — with the checklist beside it: each section, and under
 * it what is still missing. Selecting either scrolls to the section. A
 * destination also has its live preview and the tip for the section in view
 * set back on the right. Underneath it is the catalogue form it replaces: the
 * same registry fields, Zod schema, server action and request body, so what
 * gets saved does not change.
 *
 * Creating and editing are the same page, saved by the button at its foot. A
 * new listing shows its first section alone until its kind is chosen — a
 * destination's theme, a food listing's type — because every section after it
 * is written for that kind. A save that finds a problem scrolls to it.
 */
export function ListingForm({
  definition,
  record,
  referenceOptions,
  canDelete = true,
  canEdit = true,
  canSetStatus = true,
  canPublishOnCreate = false,
  afterSaveHref,
  presets,
  cancelHref,
  gallery,
  reviewer,
  reviewHref,
}: ListingFormProps) {
  const router = useRouter();
  const [saveRecord] = useSaveRecordMutation();
  const [submitForReview] = useSubmitPublishRequestMutation();
  const [deleteRecord] = useDeleteRecordMutation();
  const { data: liveOptions } = useGetReferenceOptionsQuery({ resource: definition.key, include: "fields" });
  const options = liveOptions ?? referenceOptions;
  const editing = record != null;
  /* A stay or a food listing goes back to its tab of All Destinations. */
  const listHref = listPageOf(definition.key);
  const noun = definition.label.toLowerCase();

  const fieldsByName = useMemo(() => new Map(definition.fields.map((field) => [field.name, field])), [definition]);
  const schema = useMemo(() => resourceSchema(definition), [definition]);

  /** For a field that follows another — an attraction's categories follow its theme's region — the rows it names. */
  function narrowingOptions(field: ResourceField) {
    if (field.narrowedBy?.from) return options[field.narrowedBy.from] ?? [];
    const followed = field.narrowedBy ? fieldsByName.get(field.narrowedBy.field) : undefined;
    return followed?.ref ? (options[followed.ref] ?? []) : undefined;
  }

  /* The section in view, once the page has been scrolled; the first until then. */
  const [inView, setInView] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, startDelete] = useTransition();
  const galleryHandle = useRef<GalleryHandle>(null);
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [saveProgress, setSaveProgress] = useState<UploadProgress | null>(null);
  const [savedHref, setSavedHref] = useState<string | null>(null);
  const [photosUploading, setPhotosUploading] = useState(false);
  /* A new stay's rooms, written once the stay exists — as its gallery is. */
  const [pendingRooms, setPendingRooms] = useState<RoomDraft[]>([]);
  /* A new food listing's dishes, likewise. */
  const [pendingDishes, setPendingDishes] = useState<DishDraft[]>([]);
  const [saveRoom] = useSaveRecordMutation();
  const hasRooms = definition.key === "stays";
  const hasMenu = definition.key === "foods";
  const galleryDefinition = getResource(LISTING_GALLERIES[definition.key as ListingKey]);
  const addGalleryRows = useGalleryRows(galleryDefinition, galleryOf(galleryDefinition)!);
  const canAddPhotos = Boolean(gallery?.canAdd && canEdit);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<FormValues>,
    defaultValues: { ...toFormValues(definition, record), ...(record ? {} : presets) },
  });
  const values = useWatch({ control: form.control }) as FormValues;
  const { errors, isSubmitting, isDirty } = form.formState;
  /* What the form is written for: a food's or a stay's type, an attraction's theme. */
  const kindField = definition.key === "destinations" ? "theme" : "type";
  const kind = typeof values[kindField] === "string" && values[kindField] ? (values[kindField] as string) : undefined;

  /*
   * An attraction's tourism regions are not asked. It is listed on its theme's
   * region, and on each region one of its categories belongs to; Where it
   * appears offers only the theme's own categories, tags and interests.
   */
  const regionOptions = options["tourism-regions"];
  const derivesRegions = definition.fields.some((field) => field.name === "tourismRegionIds" && field.derived);
  const chosenCategories = values.categoryIds;
  const listedIn = useMemo(
    () =>
      derivesRegions && regionOptions?.length
        ? derivedRegions(regionOptions, kind, Array.isArray(chosenCategories) ? chosenCategories.map(String) : [])
        : null,
    [derivesRegions, regionOptions, kind, chosenCategories],
  );
  /*
   * A tag that asks which — an ancient site's King, Century — takes its answer
   * with it when it is unticked, so nothing is kept that the page cannot show.
   */
  const askedByTag = definition.fields
    .filter((field) => field.visibleWhen?.bySlug && isShown(field, values, options))
    .map((field) => field.name)
    .join(",");
  const lastAsked = useRef<string | null>(null);
  useEffect(() => {
    const before = lastAsked.current;
    lastAsked.current = askedByTag;
    if (before === null) return;
    const now = new Set(askedByTag.split(","));
    for (const name of before.split(",").filter(Boolean)) {
      if (!now.has(name)) form.setValue(name, [], { shouldDirty: true });
    }
  }, [askedByTag, form]);

  useEffect(() => {
    if (!listedIn) return;
    const chosen = form.getValues("tourismRegionIds");
    const current = Array.isArray(chosen) ? chosen.map(String) : [];
    const same = current.length === listedIn.length && listedIn.every((id) => current.includes(id));
    if (!same) form.setValue("tourismRegionIds", listedIn, { shouldDirty: true });
  }, [listedIn, form]);
  /* A cafe is asked what it serves, a bar what it pours: the steps follow the type chosen. */
  /* Someone who cannot publish is not asked whether it goes live, but whether to send it. */
  /* An attraction, a stay or a food listing: each goes to its author's reviewer the same way. */
  const listingType = listingTypeOf(definition.key);
  const steps = listingSteps(definition, kind).map((each) =>
    each.review && reviewer && listingType
      ? {
          ...each,
          title: "Review & send",
          question: "Ready to send for review?",
          description: `Check what is still missing, then send it to ${reviewer}. It goes on the website once they approve it.`,
          tip: {
            title: "What happens next",
            body: `${reviewer.charAt(0).toUpperCase()}${reviewer.slice(1)} approves it, asks for changes, or rejects it with a reason — you see the answer on your Requests page. You can keep editing it while it waits.`,
          },
        }
      : each,
  );
  const checks = readinessChecks(definition, kind);

  /**
   * The rooms' count for the checklist, and their price for the preview: the
   * cheapest room on sale is the stay's "From" price, which the API also sets.
   * A saved stay's form is not made dirty by it — nothing is left to save.
   */
  const onRoomSummary = useCallback(
    (summary: RoomSummary) => {
      form.setValue("rooms", summary.types ? String(summary.types) : "");
      if (summary.fromPrice !== null && form.getValues("priceFrom") !== String(summary.fromPrice)) {
        form.setValue("priceFrom", String(summary.fromPrice), { shouldDirty: !record });
      }
    },
    [form, record],
  );

  /**
   * The dishes' count for the checklist, and their price for the preview: the
   * cheapest dish on the menu is the listing's "From" price, which the API also sets.
   */
  const onMenuSummary = useCallback(
    (summary: MenuSummary) => {
      form.setValue("dishes", summary.dishes ? String(summary.dishes) : "");
      if (summary.fromPrice !== null && form.getValues("priceFrom") !== String(summary.fromPrice)) {
        form.setValue("priceFrom", String(summary.fromPrice), { shouldDirty: !record });
      }
    },
    [form, record],
  );

  /*
   * A new listing's first section stands alone until its kind is chosen: every
   * section after it is written for that kind, and would change under the
   * reader's hands.
   */
  const gateAt = !editing && !kind ? steps.findIndex((each) => stepFields(each).includes(kindField)) : -1;
  const gated = gateAt >= 0;
  const open = gated ? steps.slice(0, gateAt + 1) : steps;
  /* Rooms and dishes need the room: a stay or a food listing has no preview column, and its tips come inline. */
  const wide = hasRooms || hasMenu;

  function stepOf(names: readonly string[]): number {
    return steps.findIndex((each) => stepFields(each).some((name) => names.includes(name)));
  }

  /* Each check belongs to the section that holds what it asks for. */
  const checkRows: readonly CheckRow[] = checks.map((check) => ({
    ...check,
    done: check.all ? check.fields.every((name) => isFilled(values[name])) : check.fields.some((name) => isFilled(values[name])),
    at: Math.max(0, check.step ? steps.findIndex((each) => each.id === check.step) : stepOf(check.fields)),
  }));

  const sections: readonly SectionInfo[] = steps.map((each, index) => {
    const names = stepFields(each);
    const own = checkRows.filter((row) => row.at === index);
    const missing = own.filter((row) => !row.done);
    const required = names.some((name) => fieldsByName.get(name)?.required && !isFilled(values[name]));
    return {
      id: each.id,
      title: each.title,
      icon: each.icon,
      state:
        names.some((name) => errors[name]) || (each.review && errors.status)
          ? "error"
          : own.length > 0 && missing.length === 0 && !required
            ? "done"
            : "todo",
      missing,
      locked: gated && index > gateAt,
    };
  });
  const current = open.find((each) => each.id === inView) ?? open[0];

  /* The section in view is the last one whose heading has reached the upper third of the window. */
  const openIds = open.map((each) => each.id).join(",");
  useEffect(() => {
    const ids = openIds.split(",");
    let frame = 0;
    const measure = () => {
      frame = 0;
      const atEnd = window.scrollY > 0 && window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      const line = Math.max(120, window.innerHeight / 3);
      let found = ids[0];
      for (const id of ids) {
        const top = document.getElementById(sectionDomId(id))?.getBoundingClientRect().top;
        if (top !== undefined && top <= line) found = id;
      }
      setInView(atEnd ? ids[ids.length - 1] : found);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [openIds]);

  const statusField = definition.status;
  const goingLive = statusField != null && values.status === statusField.live;
  const choosesStatus = editing ? canSetStatus : canPublishOnCreate;

  /*
   * A listing whose author cannot publish goes to its reviewer from here:
   * a partner's to a BDO, a contributor's to an editor. Where an earlier
   * request stands decides what is offered — nothing while one waits.
   */
  const reviewed = Boolean(reviewer) && listingType !== null && canEdit;
  const requests = useGetPublishRequestsQuery({ mine: true }, { skip: !reviewed || !record });
  const request = record ? latestRequest(requests.data ?? [], record.id) : null;
  const waiting = request?.status === "PENDING_REVIEW";
  const live = record != null && statusField != null && statusValueOf(definition, record) === statusField.live;
  const offerReview = reviewed && !waiting && !live && (!record || !requests.isLoading);
  const [sendChoice, setSendChoice] = useState<boolean | null>(null);
  /* A new one, or one handed back for changes, is sent unless kept back; any other edit only saves. */
  const sendForReview = offerReview && (sendChoice ?? (!record || request == null || request.status === "DRAFT"));

  /** Scrolls to a section; `toProblem` stops on the first field in it marked in red instead. */
  function scrollToSection(id: string, toProblem = false) {
    requestAnimationFrame(() => {
      const section = document.getElementById(sectionDomId(id));
      const problem = toProblem ? section?.querySelector('[role="alert"]') : null;
      if (problem) problem.scrollIntoView({ behavior: "smooth", block: "center" });
      else section?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  /**
   * Scrolls to what a check asks for — its first field still empty, the map for
   * a pin, the rooms or the menu — and marks it for a moment so the eye finds
   * it. A field that is not on the page falls back to its section.
   */
  function scrollToCheck(row: CheckRow) {
    const name =
      row.fields.includes("latitude") && row.fields.includes("longitude")
        ? "pin"
        : (row.fields.find((each) => !isFilled(values[each])) ?? row.fields[0]);
    const section = document.getElementById(sectionDomId(steps[row.at].id));
    const holder = section?.querySelector(`[data-field="${name}"]`);
    /* A field's holder has no box of its own (`contents`): the field inside it is what is scrolled to. */
    const target = holder && holder.getClientRects().length === 0 ? holder.firstElementChild : holder;
    if (!target) {
      scrollToSection(steps[row.at].id);
      return;
    }
    const box = target.getBoundingClientRect();
    /* Centred when it fits; when it is taller than the window, its top just under the top bar. */
    const above = Math.max((window.innerHeight - box.height) / 2, 128);
    window.scrollTo({ top: window.scrollY + box.top - above, behavior: "smooth" });
    const tint = "color-mix(in srgb, var(--color-teal) 16%, transparent)";
    target.animate(
      [
        { backgroundColor: tint, boxShadow: `0 0 0 8px ${tint}`, borderRadius: "6px" },
        { backgroundColor: tint, boxShadow: `0 0 0 8px ${tint}`, borderRadius: "6px", offset: 0.6 },
        { backgroundColor: "transparent", boxShadow: "0 0 0 8px transparent", borderRadius: "6px" },
      ],
      { duration: 1800, easing: "ease-out" },
    );
  }

  async function save(submitted: FormValues) {
    if (!canEdit) return;
    setBanner(null);
    let result;
    try {
      result = await saveRecord({
        resource: definition.key,
        ...(record ? { id: record.id } : {}),
        values: submitted,
      }).unwrap();
    } catch (error) {
      setBanner(apiErrorMessage(error));
      return;
    }

    if (result.ok) {
      /* A new listing's gallery could not be written before it existed; it can now. */
      if (!record && pendingPhotos.length && canAddPhotos) {
        const written = await addGalleryRows(result.id, pendingPhotos, 1, setSaveProgress);
        setSaveProgress(null);
        if (written.error) {
          setSavedHref(`/${definition.key}/${result.id}`);
          setBanner(
            `The ${noun} was saved, but ${pendingPhotos.length - written.added} of ${pendingPhotos.length} gallery photos could not be added: ${written.error}`,
          );
          return;
        }
      }
      /* Its menu likewise, after the photos the dishes point at. */
      if (!record && hasMenu && pendingDishes.length) {
        const failed: string[] = [];
        for (const [index, draft] of pendingDishes.entries()) {
          setSaveProgress({ phase: "saving", done: index, total: pendingDishes.length });
          try {
            const written = await saveRoom({ resource: "food-menu-items", values: { ...draft.values, foodId: result.id } }).unwrap();
            if (!written.ok) failed.push(`${String(draft.values.name)}: ${written.message}`);
          } catch (error) {
            failed.push(`${String(draft.values.name)}: ${apiErrorMessage(error)}`);
          }
        }
        setSaveProgress(null);
        if (failed.length) {
          setSavedHref(`/${definition.key}/${result.id}`);
          setBanner(`The ${noun} was saved, but ${failed.length} of ${pendingDishes.length} dishes could not be: ${failed.join("; ")}`);
          return;
        }
      }
      /* Its rooms likewise, after the photos they point at. */
      if (!record && hasRooms && pendingRooms.length) {
        const failed: string[] = [];
        for (const [index, draft] of pendingRooms.entries()) {
          setSaveProgress({ phase: "saving", done: index, total: pendingRooms.length });
          try {
            const written = await saveRoom({ resource: "stay-rooms", values: { ...draft.values, stayId: result.id } }).unwrap();
            if (!written.ok) failed.push(`${String(draft.values.name)}: ${written.message}`);
          } catch (error) {
            failed.push(`${String(draft.values.name)}: ${apiErrorMessage(error)}`);
          }
        }
        setSaveProgress(null);
        if (failed.length) {
          setSavedHref(`/${definition.key}/${result.id}`);
          setBanner(`The ${noun} was saved, but ${failed.length} of ${pendingRooms.length} rooms could not be: ${failed.join("; ")}`);
          return;
        }
      }
      /* Last, once everything it holds is saved: into the reviewer's queue. */
      if (sendForReview && listingType) {
        try {
          await submitForReview({ targetType: listingType, targetId: result.id }).unwrap();
        } catch (error) {
          setSavedHref(`/${definition.key}/${result.id}`);
          setBanner(`The ${noun} was saved as a draft, but it could not be sent to ${reviewer}: ${apiErrorMessage(error)}`);
          return;
        }
      }
      router.push(afterSaveHref ?? listHref);
      router.refresh();
      return;
    }

    const fieldErrors = result.fieldErrors ?? {};
    for (const [name, message] of Object.entries(fieldErrors)) {
      form.setError(name, { message });
    }
    const at = stepOf(Object.keys(fieldErrors));
    if (at >= 0) scrollToSection(steps[at].id, true);
    setBanner(result.message);
  }

  function refuse(invalid: FieldErrors<FormValues>) {
    /* The first section holding a problem; the status lives in the last. */
    const first = stepOf(Object.keys(invalid));
    const target = first >= 0 ? first : invalid.status ? steps.length - 1 : -1;
    if (target >= 0) scrollToSection(steps[target].id, true);
    setBanner("A few details need attention before this can be saved — they are marked in red.");
  }

  function destroy() {
    if (!record) return;
    setBanner(null);
    setConfirmingDelete(false);
    startDelete(async () => {
      try {
        await deleteRecord({ resource: definition.key, id: record.id }).unwrap();
        router.push(listHref);
        router.refresh();
      } catch (error) {
        setBanner(apiErrorMessage(error));
      }
    });
  }

  const primaryLabel = sendForReview
    ? editing
      ? "Save and send for review"
      : "Create and send for review"
    : editing
      ? "Save changes"
      : goingLive && canPublishOnCreate
        ? `Publish ${noun}`
        : `Create ${noun}`;

  return (
    <FormProvider {...form}>
      <GalleryDropContext value={canAddPhotos ? (files) => galleryHandle.current?.addFiles(files) : null}>
        <form
          className={cn(
            "grid items-start gap-6 lg:grid-cols-[12.5rem_minmax(0,1fr)]",
            !wide && "xl:grid-cols-[12.5rem_minmax(0,1fr)_17rem]",
          )}
          noValidate
          onKeyDown={(event) => {
            /* A new listing is made by its button alone: Enter in a field does not create it half-written. */
            if (!editing && event.key === "Enter" && event.target instanceof HTMLInputElement) event.preventDefault();
          }}
          onSubmit={(event) => void form.handleSubmit(save, refuse)(event)}
        >
          <aside className="quiet-scroll sticky top-20 hidden max-h-[calc(100dvh-6rem)] overflow-y-auto lg:block">
            <SectionList
              current={current.id}
              done={checkRows.filter((row) => row.done).length}
              onOpen={scrollToCheck}
              onSelect={scrollToSection}
              sections={sections}
              total={checkRows.length}
            />
          </aside>

          <div className="flex min-w-0 flex-col gap-4">
            <SectionChips current={current.id} onSelect={scrollToSection} sections={sections} />

            {!canEdit ? (
              <p className="flex items-start gap-2.5 rounded-lg border border-line bg-sand px-3 py-2.5 text-sm text-ink-soft" role="status">
                <Lock aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
                This {noun} is read-only for your account. Contributors can edit their own unpublished drafts.
              </p>
            ) : null}

            {open.map((each) => (
              <section
                aria-labelledby={`${sectionDomId(each.id)}-title`}
                className="panel min-w-0 scroll-mt-28 lg:scroll-mt-20"
                id={sectionDomId(each.id)}
                key={each.id}
              >
                <header className="border-b border-line px-5 py-4">
                  <h2 className="heading text-lg font-semibold text-ink" id={`${sectionDomId(each.id)}-title`}>
                    {each.title}
                  </h2>
                  <p className="mt-0.5 text-sm text-muted">{each.description}</p>
                </header>

                <div className="divide-y divide-line">
                  <Tip className={cn("px-5 py-3", !wide && "xl:hidden")} step={each} />

                  {each.review ? (
                    <>
                      <Readiness onOpen={scrollToCheck} rows={checkRows} />
                      {statusField ? (
                        <FormSection description={`Who can see this ${noun} once it is saved.`} title="Visibility">
                          {!canEdit ? (
                            <p className="text-sm text-muted">An editor manages publication and changes to this {noun}.</p>
                          ) : reviewed && (offerReview || waiting) ? (
                            <ReviewChoice
                              noun={noun}
                              onChange={setSendChoice}
                              request={request}
                              reviewer={reviewer ?? ""}
                              send={sendForReview}
                              waiting={waiting}
                            />
                          ) : choosesStatus ? (
                            <StatusChoices
                              liveLabel={editing && statusValueOf(definition, record) === statusField.live ? "Published" : "Publish now"}
                              options={
                                editing
                                  ? statusChoices(definition, statusValueOf(definition, record))
                                  : statusChoices(definition, null).filter(
                                      (option) => option.value === statusField.live || option.value === statusField.initial,
                                    )
                              }
                            />
                          ) : (
                            <p className="flex items-start gap-2.5 rounded-md bg-sand px-3 py-2.5 text-sm text-ink-soft">
                              <FilePen aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
                              <span>
                                {reviewHref
                                  ? `You are correcting this ${noun} before deciding on it. Save your changes, then approve it, send it back or reject it on the review.`
                                  : editing
                                  ? `Currently ${statusOption(definition, statusValueOf(definition, record))?.label.toLowerCase() ?? "unknown"}. Whether it is on the website is decided by a reviewer, not here.`
                                  : canSetStatus
                                    ? `New ${definition.labelPlural.toLowerCase()} start as drafts. You can publish it once it exists.`
                                    : `It is saved as a draft. Whether it is on the website is decided by a reviewer, not here.`}
                                {listingType && !canSetStatus && !reviewer && !reviewHref ? " Submit it from the publishing screen when it is ready." : ""}
                              </span>
                            </p>
                          )}
                        </FormSection>
                      ) : null}
                    </>
                  ) : null}

                  {each.groups.map((group) => {
                    /* A lone field already names the group; saying it twice is noise. */
                    const titled = group.title && !(group.fields.length === 1 && fieldsByName.get(group.fields[0])?.label === group.title);
                    /* The map pin: search, the map and the paste box first, then the two numbers they fill. */
                    const pinned = group.fields.includes("latitude") && group.fields.includes("longitude");
                    return (
                      <FormSection description={titled ? group.description : undefined} key={group.title ?? group.fields.join("-")} title={titled ? group.title : undefined}>
                        <fieldset className="grid gap-x-4 gap-y-5 md:grid-cols-2" disabled={!canEdit}>
                          {pinned ? (
                            <div className="contents" data-field="pin">
                              <LocationMap disabled={!canEdit} />
                            </div>
                          ) : null}
                          {group.fields.map((name) => {
                            const field = fieldsByName.get(name);
                            if (!field || !isShown(field, values, options)) return null;
                            return (
                              /* Named, so a check can scroll to its field; `contents` leaves the grid to the field itself. */
                              <div className="contents" data-field={name} key={name}>
                                <ListingField
                                  field={field}
                                  locked={editing && field.createOnly === true}
                                  narrowing={narrowingOptions(field)}
                                  options={field.ref ? (options[field.ref] ?? []) : []}
                                  pathPrefix={`/${definition.key}/`}
                                  wide={group.fields.length === 1}
                                />
                              </div>
                            );
                          })}
                        </fieldset>
                      </FormSection>
                    );
                  })}

                  {hasRooms && each.id === "rooms" ? (
                    <div className="px-5 py-5" data-field="rooms">
                      <RoomsManager
                        canEdit={canEdit}
                        currency={typeof values.currency === "string" && values.currency.trim() ? values.currency.trim().toUpperCase() : "USD"}
                        onPendingChange={setPendingRooms}
                        onSummaryChange={onRoomSummary}
                        pending={pendingRooms}
                        pendingPhotos={pendingPhotos.map((photo) => ({ key: photo.key, url: photo.url }))}
                        stayId={record?.id ?? null}
                        stayType={typeof values.type === "string" ? values.type : "OTHER"}
                      />
                    </div>
                  ) : null}

                  {hasMenu && each.id === "menu" ? (
                    <div className="px-5 py-5" data-field="dishes">
                      <MenuManager
                        averageMealPrice={values.averageMealPrice}
                        canEdit={canEdit}
                        currency={typeof values.currency === "string" && values.currency.trim() ? values.currency.trim().toUpperCase() : "USD"}
                        foodId={record?.id ?? null}
                        foodType={typeof values.type === "string" ? values.type : "OTHER"}
                        onPendingChange={setPendingDishes}
                        onSummaryChange={onMenuSummary}
                        pending={pendingDishes}
                        pendingPhotos={pendingPhotos.map((photo) => ({ key: photo.key, url: photo.url }))}
                      />
                    </div>
                  ) : null}

                  {gallery && each.id === "photos" ? (
                    <div className="px-5 py-5">
                      <div className="mb-4">
                        <h3 className="text-sm font-semibold text-ink">Gallery</h3>
                        <p className="mt-0.5 text-xs text-muted">
                          Every photo travellers can page through. Select as many as you like — they upload while you carry on.
                        </p>
                      </div>
                      <GalleryManager
                        canAdd={canAddPhotos}
                        canDelete={Boolean(gallery.canDelete && canEdit)}
                        coverKey={typeof values.coverKey === "string" ? values.coverKey : ""}
                        handle={galleryHandle}
                        listing={definition.key as ListingKey}
                        listingId={record?.id ?? null}
                        onBusyChange={setPhotosUploading}
                        onPendingChange={setPendingPhotos}
                        onUseAsCover={(photo) => {
                          form.setValue("coverKey", photo.key, { shouldDirty: true });
                          form.setValue("coverUrl", photo.url, { shouldDirty: true });
                        }}
                        pending={pendingPhotos}
                      />
                    </div>
                  ) : null}

                  {each.review ? (
                    <>
                      <div className={cn("px-5 py-5", !wide && "xl:hidden")}>
                        <ListingPreview definition={definition} options={options} values={values} />
                      </div>
                      {editing && canDelete ? (
                        <FormSection description="It is removed from the website and the dashboard for good. This cannot be undone." title={`Delete this ${noun}`}>
                          <div className="flex flex-wrap items-center gap-2">
                            {confirmingDelete ? (
                              <>
                                <span className="text-sm text-ink">Delete permanently?</span>
                                <Button disabled={deleting} onClick={destroy} size="sm" type="button" variant="destructive">
                                  {deleting ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : <Trash2 aria-hidden className="size-3.5" />}
                                  Yes, delete
                                </Button>
                                <Button onClick={() => setConfirmingDelete(false)} size="sm" type="button" variant="ghost">
                                  Keep it
                                </Button>
                              </>
                            ) : (
                              <Button
                                className="text-heritage hover:bg-heritage-soft hover:text-heritage"
                                onClick={() => setConfirmingDelete(true)}
                                size="sm"
                                type="button"
                                variant="secondary"
                              >
                                <Trash2 aria-hidden className="size-3.5" />
                                Delete {noun}
                              </Button>
                            )}
                          </div>
                        </FormSection>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </section>
            ))}

            {gated ? (
              <p className="rounded-xl border border-dashed border-line-strong px-5 py-4 text-sm text-muted">
                {definition.key === "destinations" ? "Choose a theme above" : "Choose the type above"} to see the rest of the form. Every
                section after it is written for that choice.
              </p>
            ) : null}

            {/*
             * The actions stay at the foot of the window over a band of the page's own ground, and
             * what a save found sits with the button that was pressed, wherever the page is scrolled to.
             */}
            <div className={cn("flex flex-col gap-2", !gated && "sticky bottom-0 z-10 bg-background pt-2 pb-3")}>
              {banner ? (
                <p className="flex items-start gap-2.5 rounded-lg border border-heritage/20 bg-heritage-soft px-3 py-2.5 text-sm text-heritage" role="alert">
                  <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                  <span>
                    {banner}
                    {savedHref ? (
                      <>
                        {" "}
                        <Link className="font-medium underline underline-offset-2" href={savedHref}>
                          Open the saved {noun}
                        </Link>{" "}
                        to add them again.
                      </>
                    ) : null}
                  </span>
                </p>
              ) : null}

              <footer className="panel flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                <div className="flex items-center gap-3">
                  <Link className={buttonVariants({ variant: "ghost", size: "sm" })} href={cancelHref ?? listHref}>
                    Cancel
                  </Link>
                  {editing && isDirty ? (
                    <span className="hidden items-center gap-1.5 text-xs text-muted sm:inline-flex">
                      <span aria-hidden className="size-1.5 rounded-full bg-gold" />
                      Unsaved changes
                    </span>
                  ) : null}
                </div>

                {canEdit && !gated ? (
                  <Button disabled={isSubmitting || photosUploading} size="sm" type="submit">
                    {isSubmitting ? (
                      <Loader2 aria-hidden className="size-3.5 animate-spin" />
                    ) : editing ? (
                      <Save aria-hidden className="size-3.5" />
                    ) : goingLive && canPublishOnCreate ? (
                      <Rocket aria-hidden className="size-3.5" />
                    ) : (
                      <Check aria-hidden className="size-3.5" />
                    )}
                    {saveProgress ? progressLabel(saveProgress) : isSubmitting ? "Saving…" : photosUploading ? "Waiting for photos…" : primaryLabel}
                  </Button>
                ) : null}
              </footer>
            </div>
          </div>

          {!wide ? (
            <aside className="sticky top-20 hidden flex-col gap-4 xl:flex">
              <ListingPreview definition={definition} options={options} values={values} />
              <Tip className="rounded-lg border border-line bg-paper px-3 py-3" step={current} />
            </aside>
          ) : null}
        </form>
      </GalleryDropContext>
    </FormProvider>
  );
}

/* -------------------------------------------------------------------------- */

function FormSection({
  title,
  description,
  children,
}: {
  readonly title?: string;
  readonly description?: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="px-5 py-5">
      {title ? (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

interface SectionNavProps {
  readonly sections: readonly SectionInfo[];
  /** The section in view. */
  readonly current: string;
  readonly onSelect: (id: string) => void;
}

/**
 * The checklist beside the form: every section under its own picture, ticked
 * at the end of its row once its own checks are met, and under it what is
 * still missing. A section scrolls to itself, a missing line to its field.
 */
function SectionList({
  sections,
  current,
  onSelect,
  onOpen,
  done,
  total,
}: SectionNavProps & { readonly onOpen: (row: CheckRow) => void; readonly done: number; readonly total: number }) {
  return (
    <nav aria-label="Form sections">
      <p className="mb-2 flex items-baseline justify-between px-2 text-xs">
        <span className="font-medium text-muted">Checklist</span>
        <span className="font-medium text-ink tabular-nums">
          {done} of {total} done
        </span>
      </p>

      <ol className="flex flex-col gap-0.5">
        {sections.map((section) => {
          const active = section.id === current;
          const Icon = section.icon;
          return (
            <li key={section.id}>
              <button
                aria-current={active ? "true" : undefined}
                className={cn(
                  "flex h-9 w-full items-center gap-2.5 rounded-md px-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                  active ? "bg-teal-soft font-medium text-teal-deep" : "text-ink-soft enabled:hover:bg-sand-deep enabled:hover:text-ink",
                )}
                disabled={section.locked}
                onClick={() => onSelect(section.id)}
                type="button"
              >
                <Icon aria-hidden className={cn("size-5 shrink-0 p-px", active ? "text-teal-deep" : "text-muted")} strokeWidth={1.75} />
                <span className="min-w-0 flex-1 truncate">{section.title}</span>
                {section.state === "error" ? (
                  <CircleAlert aria-hidden className="size-4 shrink-0 text-heritage" />
                ) : section.state === "done" ? (
                  <span className="grid size-4 shrink-0 place-items-center rounded-full bg-success-strong text-white">
                    <Check aria-hidden className="size-2.5" strokeWidth={3} />
                  </span>
                ) : null}
                <span className="sr-only">
                  {section.state === "error" ? ", needs attention" : section.state === "done" ? ", complete" : ""}
                </span>
              </button>

              {!section.locked && section.missing.length ? (
                <ul className="mt-0.5 mb-1.5 ml-4.5 flex flex-col border-l border-line pl-2">
                  {section.missing.map((row) => (
                    <li key={row.label}>
                      <button
                        className="w-full rounded px-1.5 py-1 text-left text-xs leading-snug text-muted transition-colors hover:bg-sand-deep hover:text-ink"
                        onClick={() => onOpen(row)}
                        type="button"
                      >
                        {row.label}
                        {row.required ? <span className="font-medium text-heritage"> · required</span> : null}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** The sections as a row of chips that stays under the top bar, where there is no room for the checklist. */
function SectionChips({ sections, current, onSelect }: SectionNavProps) {
  const list = useRef<HTMLOListElement>(null);

  /* Keep the chip of the section in view centred, without touching the page's own scroll. */
  useEffect(() => {
    const bar = list.current;
    const chip = bar?.querySelector<HTMLElement>("[aria-current]");
    if (!bar || !chip) return;
    const offset = chip.getBoundingClientRect().left - bar.getBoundingClientRect().left;
    bar.scrollBy({ left: offset - (bar.clientWidth - chip.clientWidth) / 2, behavior: "smooth" });
  }, [current]);

  return (
    <nav aria-label="Form sections" className="sticky top-14 z-20 -mx-4 bg-background px-4 py-2 md:-mx-6 md:px-6 lg:hidden">
      <ol className="no-scrollbar flex gap-1 overflow-x-auto" ref={list}>
        {sections.map((section) => {
          const active = section.id === current;
          return (
            <li className="shrink-0" key={section.id}>
              <button
                aria-current={active ? "true" : undefined}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                  active
                    ? "border-teal bg-teal-soft text-teal-deep"
                    : section.state === "error"
                      ? "border-heritage/30 bg-heritage-soft text-heritage"
                      : "border-line bg-paper text-ink-soft enabled:hover:bg-sand",
                )}
                disabled={section.locked}
                onClick={() => onSelect(section.id)}
                type="button"
              >
                {section.state === "done" ? <Check aria-hidden className="size-3 text-success" strokeWidth={3} /> : null}
                {section.state === "error" ? <CircleAlert aria-hidden className="size-3" /> : null}
                {section.title}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function Tip({ step, className }: { readonly step: ListingStep; readonly className?: string }) {
  return (
    <aside className={cn("flex gap-2.5", className)}>
      <Lightbulb aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" strokeWidth={1.75} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{step.tip.title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">{step.tip.body}</p>
      </div>
    </aside>
  );
}

/** The whole checklist in one place, before the listing is saved: what is met, and what is still missing. */
function Readiness({ rows, onOpen }: { readonly rows: readonly CheckRow[]; readonly onOpen: (row: CheckRow) => void }) {
  const missingRequired = rows.filter((row) => row.required && !row.done).length;
  const done = rows.filter((row) => row.done).length;

  return (
    <FormSection
      description={`${done} of ${rows.length} checks done. Recommended details help travellers choose it.`}
      title={missingRequired ? `${missingRequired} required detail${missingRequired === 1 ? "" : "s"} missing` : "Everything required is in place"}
    >
      <ul className="grid gap-x-6 sm:grid-cols-2">
        {rows.map((row) => (
          <li className="flex h-10 items-center gap-2.5 border-b border-line" key={row.label}>
            {row.done ? (
              <CircleCheck aria-hidden className="size-4 shrink-0 text-success" />
            ) : row.required ? (
              <CircleAlert aria-hidden className="size-4 shrink-0 text-heritage" />
            ) : (
              <CircleDashed aria-hidden className="size-4 shrink-0 text-muted" />
            )}
            <span className={cn("min-w-0 flex-1 truncate text-sm", row.done ? "text-ink-soft" : "text-ink")}>{row.label}</span>
            {row.done ? (
              <span className="text-xs text-muted">Done</span>
            ) : (
              <button
                className={cn("text-xs font-medium hover:underline", row.required ? "text-heritage" : "text-teal-deep")}
                onClick={() => onOpen(row)}
                type="button"
              >
                {row.required ? "Required · Add" : "Add"}
              </button>
            )}
          </li>
        ))}
      </ul>
    </FormSection>
  );
}

const STATUS_TEXT: Readonly<Record<string, string>> = {
  PUBLISHED: "Travellers can find it on the website as soon as it is saved.",
  DRAFT: "Only the dashboard can see it until it is published.",
  ARCHIVED: "Taken off the website, and kept here for the record.",
};

/** This listing's most recent request, sent or answered. */
function latestRequest(requests: readonly PublishRequestResponse[], listingId: string): PublishRequestResponse | null {
  return requests
    .filter((request) => request.targetId === listingId)
    .reduce<PublishRequestResponse | null>(
      (latest, request) => (!latest || Date.parse(lastActivityOf(request)) > Date.parse(lastActivityOf(latest)) ? request : latest),
      null,
    );
}

/**
 * Whether saving sends the destination to its reviewer — or, while it waits,
 * that it is waiting. What the reviewer last said is shown with the choice.
 */
function ReviewChoice({ noun, reviewer, request, waiting, send, onChange }: {
  readonly noun: string;
  readonly reviewer: string;
  readonly request: PublishRequestResponse | null;
  readonly waiting: boolean;
  readonly send: boolean;
  readonly onChange: (send: boolean) => void;
}) {
  if (waiting && request) {
    return (
      <p className="flex items-start gap-2.5 rounded-md bg-sand px-3 py-2.5 text-sm text-ink-soft" role="status">
        <Send aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
        <span>
          Waiting for {reviewer} to review it, since {new Date(request.requestedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}. You
          can keep changing it — {reviewer.replace(/^an? /, "the ")} reviews what is saved.
        </span>
      </p>
    );
  }
  const handedBack = request?.status === "DRAFT";
  const choices = [
    {
      value: true,
      title: handedBack ? `Send it back to ${reviewer}` : `Send to ${reviewer} for review`,
      hint: handedBack
        ? "With your changes, so they can approve it."
        : `It goes into their queue as soon as it is saved, and onto the website once they approve it.`,
    },
    { value: false, title: "Keep as a draft", hint: `Only you can see it. Send the ${noun} later from your Requests page.` },
  ];
  return (
    <div className="flex flex-col gap-3">
      {handedBack && request?.reviewNote ? (
        <p className="rounded-md border border-gold/30 bg-gold-soft px-3 py-2.5 text-sm text-ink-soft">
          <span className="font-medium text-ink">{request.reviewerName ?? reviewer} asked for changes:</span> “{request.reviewNote}”
        </p>
      ) : null}
      <div aria-label="Review" className="grid gap-2 sm:grid-cols-2" role="radiogroup">
        {choices.map((choice) => (
          <label
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-line-strong bg-paper px-3 py-3 transition-colors hover:bg-sand has-checked:border-teal has-checked:bg-teal-soft/50"
            key={String(choice.value)}
          >
            <input
              checked={send === choice.value}
              className="mt-0.5 size-4 shrink-0 accent-teal"
              name="send-for-review"
              onChange={() => onChange(choice.value)}
              type="radio"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-ink">{choice.title}</span>
              <span className="mt-0.5 block text-xs text-muted">{choice.hint}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function StatusChoices({ options, liveLabel }: { readonly options: readonly StatusOption[]; readonly liveLabel: string }) {
  const { register } = useFormContext<FormValues>();

  return (
    <div aria-label="Visibility" className="grid gap-2 sm:grid-cols-2" role="radiogroup">
      {options.map((option) => {
        const live = option.value === "PUBLISHED";
        return (
          <label
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-line-strong bg-paper px-3 py-3 transition-colors hover:bg-sand has-checked:border-teal has-checked:bg-teal-soft/50"
            key={option.value}
          >
            <input {...register("status")} className="mt-0.5 size-4 shrink-0 accent-teal" type="radio" value={option.value} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-ink">{live ? liveLabel : option.label}</span>
              <span className="mt-0.5 block text-xs text-muted">{STATUS_TEXT[option.value] ?? option.hint}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
