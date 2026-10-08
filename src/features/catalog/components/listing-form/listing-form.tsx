"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, useTransition, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FormProvider,
  useForm,
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
  Loader2,
  Lock,
  Rocket,
  Save,
  Send,
  Eye,
  EyeOff,
  Trash2,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  useDeleteRecordMutation,
  useGetReferenceOptionsQuery,
  useSaveRecordMutation,
  useGetCatalogQuery,
} from "@/features/catalog/api/catalog-api";
import type { CatalogRecord } from "@/features/catalog/api/contracts";
import {
  GalleryManager,
  type PendingPhoto,
} from "@/features/catalog/components/listing-form/gallery-manager";
import { HelpIcon, ListingField } from "@/features/catalog/components/listing-form/listing-field";
import { RoomsManager, type RoomDraft } from "@/features/catalog/components/listing-form/rooms-manager";
import type { RoomSummary } from "@/features/catalog/rooms";
import { Badge } from "@/components/ui/badge";
import { HelpStyleContext } from "@/features/catalog/components/listing-form/help-style";
import { PhonePreview } from "@/features/catalog/components/listing-form/phone-preview";
import { LocationMap } from "@/features/catalog/components/listing-form/location-map";
import {
  LISTING_GALLERIES,
  isFilled,
  listingSteps,
  readinessChecks,
  stepFields,
  type ListingKey,
  type ReadinessCheck,
} from "@/features/catalog/components/listing-form/steps";
import { listPageOf } from "@/features/catalog/all-destinations";
import { kindOf, mainRegion, themeOf } from "@/features/catalog/narrowing";
import { getResource } from "@/features/catalog/resources";
import { progressLabel, useGalleryRows, type UploadProgress } from "@/features/catalog/use-image-upload";
import {
  galleryOf,
  isShown,
  resourceSchema,
  statusOption,
  statusValueOf,
  toFormValues,
  type FormValues,
  type ReferenceOptions,
  type ResourceDefinition,
  type ResourceField,
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

/** A section as the navigator beside the form shows it. */
interface SectionInfo {
  readonly id: string;
  readonly title: string;
  /** The picture that stands for the section in the navigator. */
  readonly icon: LucideIcon;
  /** The places on the page listed under it, whatever their state. */
  readonly rows: readonly CheckRow[];
  /** Not on the page yet: a new listing's kind is still to be chosen. */
  readonly locked: boolean;
}

/** One of the bar's buttons: what it says, its picture, and what it does. */
interface BarAction {
  readonly label: string;
  readonly icon: LucideIcon;
  readonly onPress: () => void;
}

/** Where a section sits in the page, for the checklist to scroll to. */
const sectionDomId = (id: string) => `listing-section-${id}`;

/*
 * Whether the phone preview is put away, remembered in this browser. Read as
 * an external store, so the server renders it shown and the browser's answer
 * replaces that without a second render pass.
 */
const PREVIEW_HIDDEN_KEY = "ams.listing-preview.hidden";
const previewListeners = new Set<() => void>();
function subscribePreview(listener: () => void) {
  previewListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    previewListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}
function readPreviewHidden(): boolean {
  try {
    return localStorage.getItem(PREVIEW_HIDDEN_KEY) === "1";
  } catch {
    /* Private windows and blocked storage: the preview simply shows. */
    return false;
  }
}
function writePreviewHidden(hidden: boolean) {
  try {
    localStorage.setItem(PREVIEW_HIDDEN_KEY, hidden ? "1" : "0");
  } catch {
    /* Not remembered, then. */
  }
  previewListeners.forEach((listener) => listener());
}

/**
 * What the form opens with. An attraction listed on several regions — from
 * before each had one of its own — opens on its theme's, so one choice shows.
 */
function openingValues(
  definition: ResourceDefinition,
  record: ListingFormProps["record"],
  presets: Readonly<FormValues> | undefined,
  options: ReferenceOptions,
): FormValues {
  const values: FormValues = { ...toFormValues(definition, record), ...(record ? {} : presets) };
  const regions = definition.fields.find((field) => field.name === "tourismRegionIds");
  const chosen = values.tourismRegionIds;
  if (regions?.single && Array.isArray(chosen)) {
    values.tourismRegionIds = mainRegion(options["tourism-regions"] ?? [], typeof values.theme === "string" ? values.theme : undefined, chosen);
  }
  return values;
}

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
 * new stay or food listing shows its first section alone until its kind is
 * chosen, because every section after it is written for that kind. An
 * attraction's form is the same for every attraction: its tourism region is
 * chosen in Where it appears. A save that finds a problem scrolls to it.
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
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [saveProgress, setSaveProgress] = useState<UploadProgress | null>(null);
  const [savedHref, setSavedHref] = useState<string | null>(null);
  const [photosUploading, setPhotosUploading] = useState(false);
  /* A new stay's rooms, written once the stay exists — as its gallery is. */
  const [pendingRooms, setPendingRooms] = useState<RoomDraft[]>([]);
  const [saveRoom] = useSaveRecordMutation();
  const hasRooms = definition.key === "stays";
  const galleryDefinition = getResource(LISTING_GALLERIES[definition.key as ListingKey]);
  const addGalleryRows = useGalleryRows(galleryDefinition, galleryOf(galleryDefinition)!);
  const canAddPhotos = Boolean(gallery?.canAdd && canEdit);
  /* The phone preview beside the form, and whether it is put away. */
  const previewHidden = useSyncExternalStore(subscribePreview, readPreviewHidden, () => false);
  const showPreview = (shown: boolean) => writePreviewHidden(!shown);
  /* The gallery's photos, for the dots under the preview's cover: the saved rows, or the ones waiting to be uploaded. */
  const galleryOwner = galleryOf(galleryDefinition)!.owner.name;
  const galleryRows = useGetCatalogQuery(galleryDefinition.key, { skip: !editing });
  const photoCount = editing ? (galleryRows.data ?? []).filter((row) => row[galleryOwner] === record.id).length : pendingPhotos.length;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<FormValues>,
    defaultValues: openingValues(definition, record, presets, referenceOptions),
  });
  const values = useWatch({ control: form.control }) as FormValues;
  const { isSubmitting, isDirty } = form.formState;
  /* What the form is written for: a food's or a stay's type, an attraction's theme. */
  const kindField = definition.key === "destinations" ? "theme" : "type";
  const kind = typeof values[kindField] === "string" && values[kindField] ? (values[kindField] as string) : undefined;
  /* Asked on the form — a stay's type — or worked out by it: an attraction's theme follows its region. */
  const asksKind = !fieldsByName.get(kindField)?.derived;

  /*
   * An attraction's theme is not asked: it is the code of the tourism region
   * chosen in Where it appears, kept for the API and the website's page.
   */
  const regionOptions = options["tourism-regions"];
  const derivesTheme = definition.fields.some((field) => field.name === "theme" && field.derived);
  const chosenRegions = values.tourismRegionIds;
  const themeCode = useMemo(
    () => (derivesTheme && regionOptions ? themeOf(regionOptions, Array.isArray(chosenRegions) ? chosenRegions.map(String) : []) : null),
    [derivesTheme, regionOptions, chosenRegions],
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
    if (themeCode === null) return;
    const current = form.getValues("theme");
    if ((typeof current === "string" ? current : "") !== themeCode) form.setValue("theme", themeCode, { shouldDirty: true });
  }, [themeCode, form]);

  /*
   * A stay's or a food listing's kind is not asked either: it follows the
   * first Type ticked, kept for the API's lists.
   */
  const interestOptions = options.interests;
  const derivesType = definition.fields.some((field) => field.name === "type" && field.derived);
  const chosenInterests = values.interestIds;
  const currentType = typeof values.type === "string" ? values.type : "";
  const typeCode = useMemo(
    () =>
      derivesType && interestOptions
        ? kindOf(interestOptions, Array.isArray(chosenInterests) ? chosenInterests.map(String) : [], currentType)
        : null,
    [derivesType, interestOptions, chosenInterests, currentType],
  );
  useEffect(() => {
    if (typeCode === null) return;
    const current = form.getValues("type");
    if ((typeof current === "string" ? current : "") !== typeCode) form.setValue("type", typeCode, { shouldDirty: true });
  }, [typeCode, form]);
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
  /*
   * The rooms made, for the checklist. Counted here rather than kept among
   * the form's values: counting them is not a change to save, and a stay must
   * not open saying it has one.
   */
  const [made, setMade] = useState<{ readonly rooms: number }>({ rooms: 0 });
  const onRoomSummary = useCallback(
    (summary: RoomSummary) => {
      setMade((now) => (now.rooms === summary.types ? now : { ...now, rooms: summary.types }));
      if (summary.fromPrice !== null && form.getValues("priceFrom") !== String(summary.fromPrice)) {
        form.setValue("priceFrom", String(summary.fromPrice), { shouldDirty: !record });
      }
    },
    [form, record],
  );

  /*
   * A new stay's or food listing's first section stands alone until its kind
   * is chosen: every section after it is written for that kind, and would
   * change under the reader's hands.
   */
  const gateAt = !editing && asksKind && !kind ? steps.findIndex((each) => stepFields(each).includes(kindField)) : -1;
  const gated = gateAt >= 0;
  const open = gated ? steps.slice(0, gateAt + 1) : steps;

  function stepOf(names: readonly string[]): number {
    return steps.findIndex((each) => stepFields(each).some((name) => names.includes(name)));
  }

  /* What the checks read: the form's values, with the rooms counted beside them. */
  const checked: FormValues = { ...values, rooms: made.rooms ? String(made.rooms) : "" };

  /* Each check belongs to the section that holds what it asks for. */
  const checkRows: readonly CheckRow[] = checks.map((check) => ({
    ...check,
    done: check.all ? check.fields.every((name) => isFilled(checked[name])) : check.fields.some((name) => isFilled(checked[name])),
    at: Math.max(0, check.step ? steps.findIndex((each) => each.id === check.step) : stepOf(check.fields)),
  }));

  const virtualFields = new Set(checks.filter((check) => check.virtual).flatMap((check) => check.fields));
  const sections: readonly SectionInfo[] = steps.map((each, index) => {
    const names = stepFields(each);
    /* Where a place sits on the page, so the navigator lists them in the order they are met. */
    const position = (row: CheckRow) => {
      const at = names.indexOf(row.fields[0] ?? "");
      return at === -1 ? names.length : at;
    };
    /* A section that names its own places lists those; the others list their checks, in page order. */
    /* A place is a field shown for this kind, or something the form counts for itself, like the rooms. */
    const own: readonly CheckRow[] | undefined = each.places
      ?.filter((place) => {
        const field = fieldsByName.get(place.field);
        return field ? isShown(field, values, options) : virtualFields.has(place.field);
      })
      .map((place) => ({
        label: place.label,
        fields: [place.field],
        required: fieldsByName.get(place.field)?.required === true,
        done: isFilled(checked[place.field]),
        at: index,
      }));
    return {
      id: each.id,
      title: each.title,
      icon: each.icon,
      /* Its places, always listed — except one that is the section itself, which its title already names. */
      rows:
        own ??
        checkRows
          .filter((row) => row.at === index && row.label !== each.title)
          .sort((a, b) => position(a) - position(b)),
      locked: gated && index > gateAt,
    };
  });
  const current = open.find((each) => each.id === inView) ?? open[0];
  /* Where it stands on the website, for the bar: what is saved, not what a button is about to make it. */
  const standing = record ? statusOption(definition, statusValueOf(definition, record)) : null;

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
  /* Unless a button in the bar says otherwise: a new one, or one handed back for changes, is sent; any other edit only saves. */
  const sendByDefault = offerReview && (!record || request == null || request.status === "DRAFT");

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
   * a pin, the rooms — and marks it for a moment so the eye finds
   * it. A field that is not on the page falls back to its section.
   */
  function scrollToCheck(row: CheckRow) {
    const name =
      row.fields.includes("latitude") && row.fields.includes("longitude")
        ? "pin"
        : (row.fields.find((each) => !isFilled(checked[each])) ?? row.fields[0]);
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

  /** `send`: whether it goes to its reviewer once saved — the bar's button says; null leaves it to the default. */
  async function save(submitted: FormValues, send: boolean | null = null) {
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
        /* The one chosen as the cover is marked as it, so the gallery and the listing agree. */
        const written = await addGalleryRows(
          result.id,
          pendingPhotos.map((photo) => ({ ...photo, cover: photo.key === submitted.coverKey })),
          1,
          setSaveProgress,
        );
        setSaveProgress(null);
        if (written.error) {
          setSavedHref(`/${definition.key}/${result.id}`);
          setBanner(
            `The ${noun} was saved, but ${pendingPhotos.length - written.added} of ${pendingPhotos.length} gallery photos could not be added: ${written.error}`,
          );
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
      if (offerReview && (send ?? sendByDefault) && listingType) {
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

  /*
   * The bar's buttons. Each says what the save should do — which status, and
   * whether it goes to the reviewer — then submits. Someone who cannot publish
   * sends it or keeps a draft; an editor publishes, unpublishes or saves;
   * anyone else only saves.
   */
  function saveAs(status: string | null, send: boolean | null) {
    if (status !== null) form.setValue("status", status, { shouldDirty: true });
    void form.handleSubmit((submitted) => save(submitted, send), refuse)();
  }
  const draftStatus = statusField?.initial ?? "DRAFT";
  const liveStatus = statusField?.live ?? "PUBLISHED";
  let secondary: BarAction | null = null;
  let primary: BarAction;
  if (offerReview) {
    secondary = { label: "Save draft", icon: FilePen, onPress: () => saveAs(editing ? null : draftStatus, false) };
    primary = {
      label: request?.status === "DRAFT" ? "Send back for review" : editing ? "Save and send for review" : "Send for review",
      icon: Send,
      onPress: () => saveAs(editing ? null : draftStatus, true),
    };
  } else if (choosesStatus && statusField) {
    if (editing) {
      secondary = live
        ? { label: "Unpublish", icon: FilePen, onPress: () => saveAs(draftStatus, null) }
        : { label: "Publish", icon: Rocket, onPress: () => saveAs(liveStatus, null) };
      primary = { label: "Save changes", icon: Save, onPress: () => saveAs(null, null) };
    } else {
      secondary = { label: "Save draft", icon: FilePen, onPress: () => saveAs(draftStatus, null) };
      primary = { label: `Publish ${noun}`, icon: Rocket, onPress: () => saveAs(liveStatus, null) };
    }
  } else {
    primary = { label: editing ? "Save changes" : `Create ${noun}`, icon: editing ? Save : Check, onPress: () => saveAs(null, null) };
  }
  const busy = isSubmitting || photosUploading;
  const busyLabel = saveProgress ? progressLabel(saveProgress) : isSubmitting ? "Saving…" : photosUploading ? "Waiting for photos…" : null;

  return (
    <FormProvider {...form}>
      {/* A field's help and a section's tip sit behind an info icon, on every listing form. */}
      <HelpStyleContext value="icon">
        <form
          className={cn(
            "grid items-start gap-x-6 gap-y-4 lg:grid-cols-[12.5rem_minmax(0,1fr)]",
            /* The preview's column is as wide as the preview: nothing when it is put away. */
            "xl:grid-cols-[12.5rem_minmax(0,1fr)_auto]",
          )}
          noValidate
          onKeyDown={(event) => {
            /* A new listing is made by its button alone: Enter in a field does not create it half-written. */
            if (!editing && event.key === "Enter" && event.target instanceof HTMLInputElement) event.preventDefault();
          }}
          onSubmit={(event) => void form.handleSubmit((submitted) => save(submitted), refuse)(event)}
        >
          {/*
           * One bar for everything the page does: where the listing stands, the
           * preview, and the save. It stays at the top while the form scrolls.
           */}
          <div className="z-20 col-span-full -mx-4 bg-background px-4 pt-1 pb-1 md:-mx-6 md:px-6 lg:sticky lg:top-14">
            <div className="panel flex flex-wrap items-center gap-2 px-3 py-2">
              <Link className={buttonVariants({ variant: "ghost", size: "sm" })} href={cancelHref ?? listHref}>
                Cancel
              </Link>
              {editing && isDirty ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                  <span aria-hidden className="size-1.5 rounded-full bg-gold" />
                  Unsaved changes
                </span>
              ) : null}
              <span className="flex-1" />
              {standing ? (
                <Badge dot tone={standing.tone}>
                  {standing.label}
                </Badge>
              ) : !editing ? (
                <Badge>Not saved yet</Badge>
              ) : null}
              {
                <button
                  aria-label={previewHidden ? "Show preview" : "Hide preview"}
                  aria-pressed={!previewHidden}
                  className={cn(
                    "hidden size-8 place-items-center rounded-md text-ink-soft transition-colors hover:bg-sand hover:text-ink xl:grid",
                    !previewHidden && "bg-teal-soft text-teal hover:bg-teal-soft hover:text-teal",
                  )}
                  onClick={() => showPreview(previewHidden)}
                  title={previewHidden ? "Show preview" : "Hide preview"}
                  type="button"
                >
                  {previewHidden ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
                </button>
              }
              {canEdit && !gated ? (
                <>
                  {secondary ? (
                    <Button disabled={busy} onClick={secondary.onPress} size="sm" type="button" variant="secondary">
                      <secondary.icon aria-hidden className="size-3.5" />
                      {secondary.label}
                    </Button>
                  ) : null}
                  <Button disabled={busy} onClick={primary.onPress} size="sm" type="button">
                    {isSubmitting ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : <primary.icon aria-hidden className="size-3.5" />}
                    {busyLabel ?? primary.label}
                  </Button>
                </>
              ) : null}
            </div>
            {banner ? (
              <p className="mt-2 flex items-start gap-2.5 rounded-lg border border-heritage/20 bg-heritage-soft px-3 py-2.5 text-sm text-heritage" role="alert">
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
          </div>

          <aside className="quiet-scroll sticky top-[7.5rem] hidden max-h-[calc(100dvh-8.5rem)] overflow-y-auto lg:block">
            <SectionList current={current.id} onOpen={scrollToCheck} onSelect={scrollToSection} sections={sections} />
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
                className="panel min-w-0 scroll-mt-28 lg:scroll-mt-32"
                id={sectionDomId(each.id)}
                key={each.id}
              >
                <header className="border-b border-line px-5 py-4">
                  <div className="flex items-center gap-1.5">
                    <h2 className="heading text-lg font-semibold text-ink" id={`${sectionDomId(each.id)}-title`}>
                      {each.title}
                    </h2>
                    <HelpIcon id={`${sectionDomId(each.id)}-tip`} label={each.title} text={`${each.tip.title}. ${each.tip.body}`} />
                  </div>
                  <p className="mt-0.5 text-sm text-muted">{each.description}</p>
                </header>

                <div className="divide-y divide-line">

                  {each.review ? (
                    <>
                      <Readiness onOpen={scrollToCheck} rows={checkRows} />
                      {statusField && (!canEdit || (reviewed && (waiting || request?.status === "DRAFT")) || (!choosesStatus && !offerReview)) ? (
                        <FormSection description={`Who can see this ${noun}.`} title="Visibility">
                          {!canEdit ? (
                            <p className="text-sm text-muted">An editor manages publication and changes to this {noun}.</p>
                          ) : reviewed && (waiting || request?.status === "DRAFT") ? (
                            <ReviewNote request={request} reviewer={reviewer ?? ""} waiting={waiting} />
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
                    /* A group whose first field already says its name does not say it twice. */
                    const titled = Boolean(group.title) && fieldsByName.get(group.fields[0] ?? "")?.label !== group.title;
                    /* The map pin: search, the map and the paste box first, then the two numbers they fill. */
                    const pinned = group.fields.includes("latitude") && group.fields.includes("longitude");
                    /* A group whose every field is hidden for this kind — a homestay's star rating — leaves no empty band behind. */
                    if (!pinned && !group.fields.some((name) => { const field = fieldsByName.get(name); return field && isShown(field, values, options); })) return null;
                    const cell = (name: string) => {
                      /* The pin is the coordinates: the map draws their two boxes itself, folded away. */
                      if (pinned && (name === "latitude" || name === "longitude")) return null;
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
                            wide={group.columns !== "one" && group.fields.length === 1}
                          />
                        </div>
                      );
                    };
                    return (
                      <Fragment key={group.title ?? group.fields.join("-")}>
                      <FormSection description={titled ? group.description : undefined} title={titled ? group.title : undefined}>
                        <fieldset
                          className={cn(
                            "grid gap-y-5",
                            group.columns === "fill-fit" ? "gap-x-6 md:grid-cols-[minmax(0,1fr)_auto]" : group.columns === "one" ? "md:grid-cols-1" : "gap-x-4 md:grid-cols-2",
                          )}
                          disabled={!canEdit}
                        >
                          {pinned ? (
                            <div className="contents" data-field="pin">
                              <LocationMap
                                disabled={!canEdit}
                                fills={{ province: fieldsByName.has("provinceId"), address: fieldsByName.has("address") }}
                                provinces={options.provinces ?? []}
                              />
                            </div>
                          ) : null}
                          {group.columns === "fill-fit" ? (
                            /* The first column stacks all but the last field, so they stay together on a phone too. */
                            <>
                              <div className="flex min-w-0 flex-col gap-3">{group.fields.slice(0, -1).map(cell)}</div>
                              {group.fields.slice(-1).map(cell)}
                            </>
                          ) : (
                            group.fields.map(cell)
                          )}
                        </fieldset>
                      </FormSection>
                        {hasRooms && group.rooms ? (
                          <div className="px-5 py-5" data-field="rooms">
                            <RoomsManager
                              amenities={options.amenities ?? []}
                              canEdit={canEdit}
                              currency={typeof values.currency === "string" && values.currency.trim() ? values.currency.trim().toUpperCase() : "USD"}
                              onPendingChange={setPendingRooms}
                              onSummaryChange={onRoomSummary}
                              pending={pendingRooms}
                              pendingPhotos={pendingPhotos.map((photo) => ({ key: photo.key, url: photo.url }))}
                              stayId={record?.id ?? null}
                            />
                          </div>
                        ) : null}
                      </Fragment>
                    );
                  })}

                  {gallery && each.id === "photos" ? (
                    /* Named for the checklist's "Cover photo": the cover is chosen here, among the photos. */
                    <div className="px-5 py-5" data-field="coverKey">
                      {/* The cover has no box of its own: the gallery sets it. Registered, so the form can take a value the API already has. */}
                      <input type="hidden" {...form.register("coverKey")} />
                      <input type="hidden" {...form.register("coverUrl")} />
                      <GalleryManager
                        canAdd={canAddPhotos}
                        canDelete={Boolean(gallery.canDelete && canEdit)}
                        coverKey={typeof values.coverKey === "string" ? values.coverKey : ""}
                        coverUrl={typeof values.coverUrl === "string" ? values.coverUrl : ""}
                        listing={definition.key as ListingKey}
                        listingId={record?.id ?? null}
                        onBusyChange={setPhotosUploading}
                        onPendingChange={setPendingPhotos}
                        onCover={(photo, saved) => {
                          const key = photo?.key ?? "";
                          const url = photo?.url ?? "";
                          if (saved) {
                            /* The API has it already: the form takes the value without a change to save. */
                            form.resetField("coverKey", { defaultValue: key });
                            form.resetField("coverUrl", { defaultValue: url });
                          } else {
                            form.setValue("coverKey", key, { shouldDirty: true });
                            form.setValue("coverUrl", url, { shouldDirty: true });
                          }
                        }}
                        pending={pendingPhotos}
                      />
                    </div>
                  ) : null}

                  {each.review ? (
                    <>
                      <div className="flex flex-col items-center gap-2 px-5 py-5 xl:hidden">
                        <p className="self-start text-xs font-medium text-muted">Preview, as the app shows it</p>
                        <PhonePreview definition={definition} options={options} photos={photoCount} values={values} />
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
                Choose the type above to see the rest of the form. Every section after it is written for that choice.
              </p>
            ) : null}

          </div>

          {
            /* The preview slides in from the right edge and the form widens as it leaves; put away, its column is nothing. */
            <div
              aria-hidden={previewHidden}
              className={cn(
                "quiet-scroll sticky top-[7.5rem] hidden max-h-[calc(100dvh-8.5rem)] self-start overflow-x-hidden overflow-y-auto transition-[width,opacity,margin-left] duration-300 ease-out xl:block",
                previewHidden ? "pointer-events-none -ml-6 w-0 opacity-0" : "ml-0 w-[21.5rem] opacity-100",
              )}
              inert={previewHidden}
            >
              <div className="w-[21.5rem] pb-2">
                <PhonePreview definition={definition} options={options} photos={photoCount} values={values} />
              </div>
            </div>
          }
        </form>
      </HelpStyleContext>
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
 * The navigator beside the form: every section under its own picture, and
 * under it the places on the page worth jumping to, listed whether or not
 * they are filled. A section scrolls to itself, a line to its field. What is
 * still missing is the Review section's business, not this one's.
 */
function SectionList({ sections, current, onSelect, onOpen }: SectionNavProps & { readonly onOpen: (row: CheckRow) => void }) {
  return (
    <nav aria-label="Form sections">
      <p className="mb-2 px-2 text-xs font-medium text-muted">On this page</p>

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
              </button>

              {!section.locked && section.rows.length ? (
                <ul className="mt-0.5 mb-1.5 ml-4.5 flex flex-col border-l border-line pl-2">
                  {section.rows.map((row) => (
                    <li key={row.label}>
                      <button
                        className="w-full rounded px-1.5 py-1 text-left text-xs leading-snug text-muted transition-colors hover:bg-sand-deep hover:text-ink"
                        onClick={() => onOpen(row)}
                        type="button"
                      >
                        {row.label}
                        {row.required ? (
                          <span aria-hidden className="ml-0.5 text-heritage">
                            *
                          </span>
                        ) : null}
                        {row.required ? <span className="sr-only">, required</span> : null}
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

/** The sections as a row of chips that stays under the top bar, where there is no room for the navigator. */
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
                  active ? "border-teal bg-teal-soft text-teal-deep" : "border-line bg-paper text-ink-soft enabled:hover:bg-sand",
                )}
                disabled={section.locked}
                onClick={() => onSelect(section.id)}
                type="button"
              >
                {section.title}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** The whole checklist in one place, before the listing is saved: what is met, and what is still missing. */
function Readiness({ rows, onOpen }: { readonly rows: readonly CheckRow[]; readonly onOpen: (row: CheckRow) => void }) {
  const missingRequired = rows.filter((row) => row.required && !row.done).length;
  const done = rows.filter((row) => row.done).length;

  return (
    <FormSection
      description={`${done} of ${rows.length} details in place. The recommended ones help travellers choose it.`}
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
/** Where a listing stands with its reviewer: waiting, or handed back with a note. The sending itself is a button in the bar. */
function ReviewNote({ reviewer, request, waiting }: { readonly reviewer: string; readonly request: PublishRequestResponse | null; readonly waiting: boolean }) {
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
  if (request?.status === "DRAFT") {
    return (
      <p className="rounded-md border border-gold/30 bg-gold-soft px-3 py-2.5 text-sm text-ink-soft">
        <span className="font-medium text-ink">{request.reviewerName ?? reviewer} asked for changes</span>
        {request.reviewNote ? <>: “{request.reviewNote}”</> : null}. Send it back with the button at the top when it is ready.
      </p>
    );
  }
  return null;
}

