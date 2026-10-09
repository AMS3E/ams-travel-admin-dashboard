"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useReducer, useRef, useState, useTransition } from "react";
import { ArrowRight, LoaderCircle, Rocket, Save } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Surface, SurfaceHeader } from "@/components/ui/surface";
import { Textarea } from "@/components/ui/textarea";
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

/**
 * A new tourism corridor on one page: what it is, then its days and stops
 * with the map beside them, then the extras. One button creates it — with
 * its stops, and published when the person may — and opens it.
 */
export function CorridorCreator({ destinations, interests, maps, canPublish }: CorridorCreatorProps) {
  const router = useRouter();
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

  /** Once creating has been tried, what still needs fixing is said as it is typed, and cleared as it is fixed. */
  const [tried, setTried] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  /** Created, but a later step failed: the corridor exists and is opened, never created twice. */
  const [created, setCreated] = useState<string | null>(null);
  const leaving = useRef(false);

  const places = useMemo(() => new Map(destinations.map((destination) => [destination.id, destination])), [destinations]);
  const legs = useRoadPreview(days, NO_LEGS);
  const mapStops = useMemo(() => mapStopsFrom(days, places, legs), [days, places, legs]);
  const selection = useItinerarySelection(mapStops);
  const stops = stopCount(days);
  const drafts = placesWhere(days, places, isUnpublished);
  const started = Boolean(name.trim() || shortDescription.trim() || cover.key || stops > 0);

  const min = amount(budgetMin);
  const max = amount(budgetMax);
  const nameError = name.trim() ? undefined : "Give the corridor a name.";
  const budgetError = min != null && max != null && max < min ? "The upper end is below the lower end." : undefined;
  const backwards = firstBackwardsStop(days);
  const timesError = backwards ? `Stop ${backwards} leaves before it arrives. Fix its times, then create the corridor.` : undefined;
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
      nameInput.current?.focus();
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
          <SurfaceHeader description="What travellers see on the corridor's card and at the top of its page." title="1. About the corridor" />
          <div className="grid gap-4 px-4 py-4">
            <FormField error={tried ? nameError : undefined} label="Name" required>
              {(control) => (
                <Input
                  {...control}
                  autoFocus
                  maxLength={200}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. 3-Day Mekong Discovery"
                  ref={nameInput}
                  value={name}
                />
              )}
            </FormField>
            <FormField hint="One or two sentences." label="Short description">
              {(control) => (
                <Textarea
                  {...control}
                  maxLength={500}
                  onChange={(event) => setShortDescription(event.target.value)}
                  placeholder="e.g. Up the Mekong from Phnom Penh to Kratie, island by island."
                  rows={2}
                  value={shortDescription}
                />
              )}
            </FormField>
            <FormField hint="Leave it empty and the first stop's photo is used." label="Cover photo">
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
              2. Days and stops
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Search a destination to add it to the day, then the next one. Add another day when the trip moves on. You can
              change all of this later.
            </p>
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
          <SurfaceHeader description="All optional; the website shows whatever is filled in." title="3. More details" />
          <div className="grid gap-4 px-4 py-4">
            <FormField hint="The full story of the trip, shown under the short description." label="Full description">
              {(control) => (
                <Textarea {...control} onChange={(event) => setDescription(event.target.value)} rows={5} value={description} />
              )}
            </FormField>
            <FormField
              hint="Interests from the Tourism Corridors group. A traveller browsing one of them on Explore finds this corridor on its page."
              label="Kinds of trip it suits"
            >
              {(control) =>
                interests.length ? (
                  <MultiSelectField describedBy={control["aria-describedby"]} emptyLabel="No Tourism Corridors interests yet." labelledBy={control["aria-labelledby"]} onChange={setInterestIds} options={interests} value={interestIds} />
                ) : (
                  <p className="text-sm text-muted" id={control.id}>
                    No Tourism Corridors interests yet.{" "}
                    <Link className="font-medium text-teal-deep hover:underline" href="/interests/new?groupName=Tourism%20Corridors" target="_blank">
                      Add one
                    </Link>
                    , then reload this page to choose it.
                  </p>
                )
              }
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField error={tried ? budgetError : undefined} hint="Per person, in US dollars." label="Budget from">
                {(control) => (
                  <Input {...control} inputMode="decimal" min={0} onChange={(event) => setBudgetMin(event.target.value)} placeholder="e.g. 180" step={1} type="number" value={budgetMin} />
                )}
              </FormField>
              <FormField label="Budget up to">
                {(control) => (
                  <Input {...control} inputMode="decimal" min={0} onChange={(event) => setBudgetMax(event.target.value)} placeholder="e.g. 320" step={1} type="number" value={budgetMax} />
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
                {days.length} {days.length === 1 ? "day" : "days"} · {stops} {stops === 1 ? "stop" : "stops"}
                {canPublish && drafts.length > 0 ? " · publish the draft destinations first, or save it as a draft" : ""}
              </p>
              {created ? (
                <Link className={buttonVariants()} href={`/corridors/${created}`}>
                  Open the corridor
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <Link className={buttonVariants({ variant: "ghost" })} href="/corridors">
                    Cancel
                  </Link>
                  {canPublish ? (
                    <>
                      <Button disabled={pending} onClick={() => create(false)} type="button" variant="secondary">
                        {busy === "draft" ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <Save aria-hidden className="size-4" />}
                        Save as draft
                      </Button>
                      <Button
                        disabled={pending || drafts.length > 0}
                        onClick={() => create(true)}
                        title={drafts.length > 0 ? `Publish ${drafts.map((place) => place.name).join(", ")} first` : undefined}
                        type="button"
                      >
                        {busy === "publish" ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <Rocket aria-hidden className="size-4" />}
                        Create and publish
                      </Button>
                    </>
                  ) : (
                    <Button disabled={pending} onClick={() => create(false)} type="button">
                      {busy === "draft" ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <Save aria-hidden className="size-4" />}
                      Create corridor
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
        description="Each stop you add is numbered on the map, with the real road to it from the one before. Click a marker to see the place."
        maps={maps}
        selection={selection}
        stops={mapStops}
      />
    </div>
  );
}
