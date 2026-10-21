"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useReducer, useRef, useState, useTransition } from "react";
import { ArrowRight, LoaderCircle, Rocket, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Surface, SurfaceHeader } from "@/components/ui/surface";
import { Textarea } from "@/components/ui/textarea";
import { SegmentedControl } from "@/components/ui/toolbar";
import { LOCALE_NAMES } from "@/i18n/config";
import type { ReferenceOption } from "@/features/catalog/resource";
import { MultiSelectField } from "@/features/catalog/components/fields/multi-select-field";
import { PhotoDropzone } from "@/features/catalog/components/listing-form/cover-dropzone";
import type { DestinationChoice } from "@/features/corridors/api/contracts";
import { useCreateCorridorMutation } from "@/features/corridors/api/corridors-api";
import { settled } from "@/store/api/api-error";
import { ItineraryDaysEditor } from "@/features/corridors/components/itinerary-days-editor";
import { ItineraryMapPanel } from "@/features/corridors/components/itinerary-map-panel";
import {
  FIRST_DAY_KEY,
  blankDay,
  draftReducer,
  firstBackwardsStop,
  inputFrom,
  isUnpublished,
  mapStopsFrom,
  placesWhere,
  stopCount,
  type KnownLeg,
} from "@/features/corridors/itinerary-draft";
import { useItinerarySelection } from "@/features/corridors/use-itinerary-selection";
import { useRoadPreview } from "@/features/corridors/use-road-preview";

interface CorridorCreatorProps {
  readonly destinations: readonly DestinationChoice[];
  /** The Tourism Corridors shelf's interests it can be listed under. */
  readonly interests: readonly ReferenceOption[];
  readonly maps: { readonly apiKey: string | null; readonly mapId: string | null };
  /** Whether this person's corridor may go on the website as it is created. */
  readonly canPublish: boolean;
}

const NO_LEGS: ReadonlyMap<string, KnownLeg> = new Map();

/** A budget box as typed: empty is no figure. */
function amount(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** The Khmer boxes still empty while their English says something. */
function khmerMissing(pairs: readonly (readonly [string, string])[]): number {
  return pairs.filter(([english, khmer]) => english.trim() && !khmer.trim()).length;
}

/**
 * A new tourism corridor on one page: what it is, then its days and stops
 * with the map beside them, then the extras. One button creates it — with
 * its stops, and published when the person may — and opens it.
 */
export function CorridorCreator({ destinations, interests, maps, canPublish }: CorridorCreatorProps) {
  const router = useRouter();
  const t = useTranslations("corridors");
  const languageWords = useTranslations("forms.listing.language");
  const nameInput = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [createCorridor] = useCreateCorridorMutation();
  const [busy, setBusy] = useState<"publish" | "draft" | null>(null);

  const [name, setName] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [cover, setCover] = useState({ key: "", url: "" });
  const [description, setDescription] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [interestIds, setInterestIds] = useState<string[]>([]);
  const [days, dispatch] = useReducer(draftReducer, [blankDay(FIRST_DAY_KEY)]);
  /* The language the text boxes are written in, as on a listing's form: each Khmer box takes its English one's place. */
  const [language, setLanguage] = useState<"en" | "km">("en");
  const [nameKm, setNameKm] = useState("");
  const [shortDescriptionKm, setShortDescriptionKm] = useState("");
  const [descriptionKm, setDescriptionKm] = useState("");
  const missing = khmerMissing([
    [name, nameKm],
    [shortDescription, shortDescriptionKm],
    [description, descriptionKm],
  ]);

  /** Once creating has been tried, what still needs fixing is said as it is typed, and cleared as it is fixed. */
  const [tried, setTried] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  /** Created, but a later step failed: the corridor exists and is opened, never created twice. */
  const [created, setCreated] = useState<string | null>(null);
  const leaving = useRef(false);

  const places = useMemo(() => new Map(destinations.map((destination) => [destination.id, destination])), [destinations]);
  const legs = useRoadPreview(days, NO_LEGS);
  const unknownName = t("words.unknownDestination");
  const mapStops = useMemo(() => mapStopsFrom(days, places, legs, unknownName), [days, places, legs, unknownName]);
  const selection = useItinerarySelection(mapStops);
  const stops = stopCount(days);
  const drafts = placesWhere(days, places, isUnpublished);
  const started = Boolean(name.trim() || nameKm.trim() || shortDescription.trim() || cover.key || stops > 0);

  const min = amount(budgetMin);
  const max = amount(budgetMax);
  const nameError = name.trim() ? undefined : t("creator.nameRequired");
  const budgetError = min != null && max != null && max < min ? t("creator.budgetBackwards") : undefined;
  const backwards = firstBackwardsStop(days);
  const timesError = backwards ? t("creator.timesBackwards", { stop: backwards }) : undefined;
  const shownProblem = problem ?? (tried ? timesError : undefined);

  /* Leaving with a half-made corridor asks first. */
  useEffect(() => {
    if (!started || created) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (!leaving.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [started, created]);

  function create(publish: boolean) {
    setTried(true);
    setProblem(null);
    if (nameError) {
      /* The English name is the one required: show it, then put the cursor in it. */
      setLanguage("en");
      requestAnimationFrame(() => nameInput.current?.focus());
      return;
    }
    if (budgetError || timesError) return;

    setBusy(publish ? "publish" : "draft");
    startTransition(async () => {
      const result = await settled(createCorridor({
        overview: {
          name: name.trim(),
          shortDescription: shortDescription.trim() || null,
          description: description.trim() || null,
          coverKey: cover.key || null,
          estimatedBudgetMin: min,
          estimatedBudgetMax: max,
          interestIds,
          nameKm: nameKm.trim() || null,
          shortDescriptionKm: shortDescriptionKm.trim() || null,
          descriptionKm: descriptionKm.trim() || null,
        },
        // An untouched Day 1 is no plan yet: the corridor starts with no days.
        days: stops > 0 ? inputFrom(days) : [],
        publish,
      }).unwrap());
      setBusy(null);
      if (result.ok) {
        leaving.current = true;
        router.push(`/corridors/${result.id}`);
        router.refresh();
        return;
      }
      setProblem(result.message);
      if ("id" in result && result.id) setCreated(result.id);
    });
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <div className="flex min-w-0 flex-col gap-5">
        <Surface>
          <SurfaceHeader
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <SegmentedControl
                  label={languageWords("label")}
                  onChange={setLanguage}
                  options={[
                    { value: "en", label: LOCALE_NAMES.en },
                    { value: "km", label: LOCALE_NAMES.km },
                  ]}
                  value={language}
                />
                <Badge dot tone={missing ? "warning" : "success"}>
                  {missing ? languageWords("missing", { count: missing }) : languageWords("complete")}
                </Badge>
              </div>
            }
            description={t("creator.about.description")}
            title={t("creator.about.title")}
          />
          <div className="grid gap-4 px-4 py-4">
            {language === "en" ? (
              <FormField error={tried ? nameError : undefined} key="name" label={t("creator.name")} required>
                {(control) => (
                  <Input
                    {...control}
                    autoFocus
                    maxLength={200}
                    onChange={(event) => setName(event.target.value)}
                    placeholder={t("creator.namePlaceholder")}
                    ref={nameInput}
                    value={name}
                  />
                )}
              </FormField>
            ) : (
              <FormField hint={t("creator.khmerHint")} key="nameKm" label={t("creator.nameKm")}>
                {(control) => (
                  <Input
                    {...control}
                    lang="km"
                    maxLength={200}
                    onChange={(event) => setNameKm(event.target.value)}
                    placeholder={t("creator.nameKmPlaceholder")}
                    value={nameKm}
                  />
                )}
              </FormField>
            )}
            {language === "en" ? (
              <FormField hint={t("creator.shortDescriptionHint")} key="shortDescription" label={t("creator.shortDescription")}>
                {(control) => (
                  <Textarea
                    {...control}
                    maxLength={500}
                    onChange={(event) => setShortDescription(event.target.value)}
                    placeholder={t("creator.shortDescriptionPlaceholder")}
                    rows={2}
                    value={shortDescription}
                  />
                )}
              </FormField>
            ) : (
              <FormField hint={t("creator.shortDescriptionHint")} key="shortDescriptionKm" label={t("creator.shortDescriptionKm")}>
                {(control) => (
                  <Textarea
                    {...control}
                    lang="km"
                    maxLength={500}
                    onChange={(event) => setShortDescriptionKm(event.target.value)}
                    rows={2}
                    value={shortDescriptionKm}
                  />
                )}
              </FormField>
            )}
            <FormField hint={t("creator.coverHint")} label={t("creator.cover")}>
              {(control) => (
                <PhotoDropzone
                  category="corridor"
                  describedBy={control["aria-describedby"]}
                  id={control.id}
                  onChange={(key, url) => setCover({ key, url })}
                  previewUrl={cover.url}
                  value={cover.key}
                />
              )}
            </FormField>
          </div>
        </Surface>

        <section aria-labelledby="corridor-plan" className="flex flex-col gap-3">
          <div>
            <h2 className="text-md font-semibold text-ink" id="corridor-plan">
              {t("creator.plan.title")}
            </h2>
            <p className="mt-0.5 text-xs text-muted">{t("creator.plan.description")}</p>
          </div>
          <ItineraryDaysEditor
            days={days}
            destinations={destinations}
            dispatch={dispatch}
            legs={legs}
            onSelect={selection.selectStop}
            places={places}
            selected={selection.selected}
          />
        </section>

        <Surface>
          <SurfaceHeader description={t("creator.more.description")} title={t("creator.more.title")} />
          <div className="grid gap-4 px-4 py-4">
            {language === "en" ? (
              <FormField hint={t("creator.fullDescriptionHint")} key="description" label={t("creator.fullDescription")}>
                {(control) => (
                  <Textarea {...control} onChange={(event) => setDescription(event.target.value)} rows={5} value={description} />
                )}
              </FormField>
            ) : (
              <FormField hint={t("creator.fullDescriptionHint")} key="descriptionKm" label={t("creator.fullDescriptionKm")}>
                {(control) => (
                  <Textarea {...control} lang="km" onChange={(event) => setDescriptionKm(event.target.value)} rows={5} value={descriptionKm} />
                )}
              </FormField>
            )}
            <FormField hint={t("creator.interestsHint")} label={t("creator.interests")}>
              {(control) =>
                interests.length ? (
                  <MultiSelectField describedBy={control["aria-describedby"]} emptyLabel={t("creator.noInterests")} labelledBy={control["aria-labelledby"]} onChange={setInterestIds} options={interests} value={interestIds} />
                ) : (
                  <p className="text-sm text-muted" id={control.id}>
                    {t.rich("creator.noInterestsAdd", {
                      link: (chunks) => (
                        <Link className="font-medium text-teal-deep hover:underline" href="/interests/new?groupName=Tourism%20Corridors" target="_blank">
                          {chunks}
                        </Link>
                      ),
                    })}
                  </p>
                )
              }
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField error={tried ? budgetError : undefined} hint={t("creator.budgetHint")} label={t("creator.budgetFrom")}>
                {(control) => (
                  <Input {...control} inputMode="decimal" min={0} onChange={(event) => setBudgetMin(event.target.value)} placeholder={t("creator.budgetFromPlaceholder")} step={1} type="number" value={budgetMin} />
                )}
              </FormField>
              <FormField label={t("creator.budgetUpTo")}>
                {(control) => (
                  <Input {...control} inputMode="decimal" min={0} onChange={(event) => setBudgetMax(event.target.value)} placeholder={t("creator.budgetUpToPlaceholder")} step={1} type="number" value={budgetMax} />
                )}
              </FormField>
            </div>
          </div>
        </Surface>

        <div className="shell-backdrop bottom-0 z-20 pb-3 md:sticky">
          <Surface>
            {shownProblem ? (
              <p className="border-b border-heritage/15 bg-heritage-soft px-4 py-2 text-xs text-heritage" role="alert">
                {shownProblem}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <p className="text-xs text-muted tabular-nums">
                {t("words.daysStops", { days: days.length, stops })}
                {canPublish && drafts.length > 0 ? ` · ${t("creator.publishDraftsFirst")}` : ""}
              </p>
              {created ? (
                <Link className={buttonVariants()} href={`/corridors/${created}`}>
                  {t("creator.open")}
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <Link className={buttonVariants({ variant: "ghost" })} href="/corridors">
                    {t("words.cancel")}
                  </Link>
                  {canPublish ? (
                    <>
                      <Button disabled={pending} onClick={() => create(false)} type="button" variant="secondary">
                        {busy === "draft" ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <Save aria-hidden className="size-4" />}
                        {t("creator.saveDraft")}
                      </Button>
                      <Button
                        disabled={pending || drafts.length > 0}
                        onClick={() => create(true)}
                        title={drafts.length > 0 ? t("creator.publishFirst", { names: drafts.map((place) => place.name).join(", ") }) : undefined}
                        type="button"
                      >
                        {busy === "publish" ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <Rocket aria-hidden className="size-4" />}
                        {t("creator.createPublish")}
                      </Button>
                    </>
                  ) : (
                    <Button disabled={pending} onClick={() => create(false)} type="button">
                      {busy === "draft" ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <Save aria-hidden className="size-4" />}
                      {t("creator.create")}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Surface>
        </div>
      </div>

      <ItineraryMapPanel
        days={days.length}
        description={t("creator.mapDescription")}
        maps={maps}
        selection={selection}
        stops={mapStops}
      />
    </div>
  );
}
