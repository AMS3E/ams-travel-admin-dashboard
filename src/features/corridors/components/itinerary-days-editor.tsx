"use client";

import { useTranslations } from "next-intl";
import { Fragment, useState, type Dispatch, type DragEvent } from "react";
import { ArrowDown, ArrowUp, CalendarPlus, ChevronDown, GripVertical, MapPin, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Surface } from "@/components/ui/surface";
import { Textarea } from "@/components/ui/textarea";
import type { DestinationChoice } from "@/features/corridors/api/contracts";
import { DestinationPicker } from "@/features/corridors/components/destination-picker";
import { TRANSPORT_TYPES, formatDistance, formatMinutes, type CorridorsT } from "@/features/corridors/format";
import {
  DEFAULT_TRANSPORT,
  isUnpinned,
  isUnpublished,
  legKey,
  placesWhere,
  type DraftAction,
  type DraftDay,
  type DraftStop,
  type KnownLeg,
} from "@/features/corridors/itinerary-draft";
import { straightLineKm } from "@/features/corridors/route-geometry";
import { cn } from "@/lib/utils";

interface ItineraryDaysEditorProps {
  readonly days: readonly DraftDay[];
  readonly dispatch: Dispatch<DraftAction>;
  /** What a stop can be: every destination in the catalogue. */
  readonly destinations: readonly DestinationChoice[];
  /** Every destination the plan names, by id — the choices, and any saved stop's own. */
  readonly places: ReadonlyMap<string, DestinationChoice>;
  /** The saved road between two stops, while it still fits them. */
  readonly legs: ReadonlyMap<string, KnownLeg>;
  readonly selected: string | null;
  readonly onSelect: (key: string) => void;
}

const newKey = () => crypto.randomUUID();

/**
 * The days of a corridor and the stops in each, as they are planned: search a
 * destination to add it, choose how the traveller gets there, drag stops into
 * order. Times, a title and notes are there for a stop that needs them, folded
 * away until asked for.
 */
export function ItineraryDaysEditor({ days, dispatch, destinations, places, legs, selected, onSelect }: ItineraryDaysEditorProps) {
  const t = useTranslations("corridors");
  const [picking, setPicking] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [armed, setArmed] = useState<string | null>(null);
  const [dropAt, setDropAt] = useState<{ readonly day: string; readonly index: number } | null>(null);
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());

  /* Where each stop falls over the whole corridor: its number, and the stop before it. */
  const travelOrder = days.flatMap((day) => day.stops);
  const orderOf = new Map(travelOrder.map((stop, index) => [stop.key, index]));
  const unpinned = placesWhere(days, places, isUnpinned);
  const drafts = placesWhere(days, places, isUnpublished);

  function toggleOpen(key: string) {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  /* --- dragging a stop ------------------------------------------------------------------------ */

  function dragOverStop(event: DragEvent<HTMLElement>, day: string, index: number) {
    if (!dragging) return;
    event.preventDefault();
    const box = event.currentTarget.getBoundingClientRect();
    const after = event.clientY > box.top + box.height / 2;
    setDropAt({ day, index: after ? index + 1 : index });
  }

  function dragOverDay(event: DragEvent<HTMLElement>, day: DraftDay) {
    if (!dragging || event.target !== event.currentTarget) return;
    event.preventDefault();
    setDropAt({ day: day.key, index: day.stops.length });
  }

  function drop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    if (dragging && dropAt) dispatch({ type: "moveStop", stop: dragging, day: dropAt.day, index: dropAt.index });
    endDrag();
  }

  function endDrag() {
    setDragging(null);
    setDropAt(null);
    setArmed(null);
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {unpinned.length > 0 || drafts.length > 0 ? (
        <div className="rounded-lg border border-gold-deep/15 bg-gold-soft px-4 py-3 text-xs text-gold-deep">
          {unpinned.length > 0 ? <p>{t("days.noPin", { names: unpinned.map((place) => place.name).join(", ") })}</p> : null}
          {drafts.length > 0 ? (
            <p className={unpinned.length > 0 ? "mt-1" : undefined}>{t("days.notPublished", { names: drafts.map((place) => place.name).join(", ") })}</p>
          ) : null}
        </div>
      ) : null}

      {days.map((day, dayIndex) => {
        const dayNumber = dayIndex + 1;
        const detailsOpen = open.has(day.key);
        const searching = picking === day.key || day.stops.length === 0;
        return (
          <Surface aria-labelledby={`day-${day.key}`} key={day.key}>
            <header className="flex flex-wrap items-end gap-3 border-b border-line px-4 py-3">
              <h3 className="pb-2 text-md font-semibold whitespace-nowrap text-ink" id={`day-${day.key}`}>
                {t("words.day", { day: dayNumber })}
              </h3>
              <label className="flex min-w-48 flex-1 flex-col gap-1">
                <span className="text-xs font-medium text-muted">{t("words.title")}</span>
                <Input
                  onChange={(event) => dispatch({ type: "editDay", day: day.key, patch: { title: event.target.value } })}
                  placeholder={t("days.titlePlaceholder")}
                  value={day.title}
                />
              </label>
              <label className="flex w-28 flex-col gap-1">
                <span className="text-xs font-medium text-muted">{t("days.starts")}</span>
                <Input
                  className="tabular-nums"
                  onChange={(event) => dispatch({ type: "editDay", day: day.key, patch: { startTime: event.target.value } })}
                  type="time"
                  value={day.startTime}
                />
              </label>
              <div className="flex gap-1 pb-0.5">
                <Button
                  aria-expanded={detailsOpen}
                  aria-label={t("days.detailsLabel", { day: dayNumber })}
                  onClick={() => toggleOpen(day.key)}
                  size="icon-sm"
                  title={t("days.details")}
                  type="button"
                  variant="ghost"
                >
                  <ChevronDown aria-hidden className={cn("size-4 transition-transform", detailsOpen && "rotate-180")} />
                </Button>
                {days.length > 1 ? (
                  <Button
                    aria-label={t("days.removeLabel", { day: dayNumber })}
                    onClick={() => {
                      if (day.stops.length === 0 || window.confirm(t("days.removeConfirm", { day: dayNumber, count: day.stops.length }))) {
                        dispatch({ type: "removeDay", day: day.key });
                      }
                    }}
                    size="icon-sm"
                    title={t("days.remove")}
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </Button>
                ) : null}
              </div>
              {detailsOpen ? (
                <div className="grid w-full gap-3 md:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted">{t("days.description")}</span>
                    <Textarea
                      onChange={(event) => dispatch({ type: "editDay", day: day.key, patch: { description: event.target.value } })}
                      rows={3}
                      value={day.description}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted">{t("days.notes")}</span>
                    <Textarea
                      onChange={(event) => dispatch({ type: "editDay", day: day.key, patch: { notes: event.target.value } })}
                      rows={3}
                      value={day.notes}
                    />
                  </label>
                </div>
              ) : null}
            </header>

            <ol
              aria-label={t("days.stopsLabel", { day: dayNumber })}
              className={cn("flex flex-col px-4", day.stops.length > 0 || dragging ? "min-h-14 py-3" : "py-0")}
              onDragOver={(event) => dragOverDay(event, day)}
              onDrop={drop}
            >
              {day.stops.length === 0 && dragging ? (
                <li className={cn("rounded-md border border-dashed border-line-strong px-3 py-4 text-center text-xs text-muted", dropAt?.day === day.key && "border-teal bg-teal-soft")}>
                  {t("days.drop")}
                </li>
              ) : null}
              {day.stops.map((stop, stopIndex) => {
                const order = orderOf.get(stop.key) ?? 0;
                const from = order > 0 ? travelOrder[order - 1] : null;
                const showDropBefore = dropAt?.day === day.key && dropAt.index === stopIndex && dragging !== stop.key;
                const showDropAfter = dropAt?.day === day.key && dropAt.index === stopIndex + 1 && stopIndex === day.stops.length - 1;
                return (
                  <Fragment key={stop.key}>
                    {from ? (
                      <LegLine
                        apartKm={straightLineKm(places.get(from.destinationId), places.get(stop.destinationId))}
                        dispatch={dispatch}
                        firstOfDay={stopIndex === 0}
                        leg={legs.get(legKey(from.destinationId, stop.destinationId, stop.transportType))}
                        placeName={places.get(stop.destinationId)?.name ?? t("leg.thisStop")}
                        stop={stop}
                        t={t}
                      />
                    ) : null}
                    {showDropBefore ? <li aria-hidden className="my-1 h-0.5 rounded-full bg-teal" /> : null}
                    <StopCard
                      armed={armed === stop.key}
                      dispatch={dispatch}
                      dragging={dragging === stop.key}
                      expanded={open.has(stop.key)}
                      isFirst={order === 0}
                      isLast={order === travelOrder.length - 1}
                      onArm={setArmed}
                      onDragEnd={endDrag}
                      onDragOver={(event) => dragOverStop(event, day.key, stopIndex)}
                      onDragStart={() => setDragging(stop.key)}
                      onDrop={drop}
                      onSelect={onSelect}
                      onToggle={() => toggleOpen(stop.key)}
                      place={places.get(stop.destinationId)}
                      selected={selected === stop.key}
                      sequence={order + 1}
                      stop={stop}
                      t={t}
                    />
                    {showDropAfter ? <li aria-hidden className="my-1 h-0.5 rounded-full bg-teal" /> : null}
                  </Fragment>
                );
              })}
            </ol>

            <div className={cn("px-4 py-3", day.stops.length > 0 && "border-t border-line")}>
              {searching ? (
                <DestinationPicker
                  autoFocus={picking === day.key}
                  destinations={destinations}
                  onClose={day.stops.length > 0 ? () => setPicking(null) : undefined}
                  onPick={(destination) => {
                    const key = newKey();
                    // Not selected: the map keeps the whole plan in view while stops go in.
                    dispatch({ type: "addStop", day: day.key, key, destinationId: destination.id });
                    setPicking(day.key);
                  }}
                  placeholder={
                    day.stops.length === 0
                      ? t("days.searchFirst", { day: dayNumber })
                      : t("days.searchNext", { day: dayNumber })
                  }
                />
              ) : (
                <Button onClick={() => setPicking(day.key)} size="sm" type="button" variant="secondary">
                  <Plus aria-hidden className="size-4" />
                  {t("days.addStop")}
                </Button>
              )}
            </div>
          </Surface>
        );
      })}

      <Button className="self-start" onClick={() => dispatch({ type: "addDay", key: newKey() })} type="button" variant="secondary">
        <CalendarPlus aria-hidden className="size-4" />
        {t("days.addDay", { day: days.length + 1 })}
      </Button>
    </div>
  );
}

/**
 * Between two stops: how the traveller gets to the second, and how far it is —
 * by road once the route is worked out, until then as the crow flies.
 */
function LegLine({
  stop,
  leg,
  apartKm,
  firstOfDay,
  placeName,
  dispatch,
  t,
}: {
  readonly stop: DraftStop;
  readonly leg: KnownLeg | undefined;
  readonly apartKm: number | null;
  readonly firstOfDay: boolean;
  readonly placeName: string;
  readonly dispatch: Dispatch<DraftAction>;
  readonly t: CorridorsT;
}) {
  const fromDayBefore = (text: string) => (firstOfDay ? `${text} · ${t("leg.fromDayBefore")}` : text);
  const samePlace = (leg ? leg.distanceKm === 0 : apartKm != null && apartKm < 0.05)
    ? firstOfDay
      ? t("leg.startsWhereEnded")
      : t("words.samePlace")
    : null;
  const distance =
    samePlace ??
    (leg
      ? fromDayBefore(`${formatDistance(t, leg.distanceKm)} · ${formatMinutes(t, leg.minutes)}`)
      : apartKm != null
        ? fromDayBefore(t("leg.straight", { distance: formatDistance(t, apartKm) }))
        : t("leg.unknown"));

  return (
    <li className="flex flex-wrap items-center gap-2 py-1.5 pl-9 text-xs text-muted">
      <ArrowDown aria-hidden className="size-3.5" />
      <Select
        aria-label={t("leg.howTo", { place: placeName })}
        className="h-7 w-32 py-0 text-xs"
        onChange={(event) => dispatch({ type: "editStop", stop: stop.key, patch: { transportType: event.target.value as DraftStop["transportType"] } })}
        value={stop.transportType || DEFAULT_TRANSPORT}
      >
        {TRANSPORT_TYPES.map((type) => (
          <option key={type} value={type}>
            {t(`transport.${type}`)}
          </option>
        ))}
      </Select>
      <span>{distance}</span>
    </li>
  );
}

/** "Arrive 08:00 · Leave 09:30 · Stay 1 h 30 min", from what is filled in. */
function timesOf(stop: DraftStop, t: CorridorsT): string {
  const minutes = Number(stop.duration);
  return [
    stop.arrivalTime ? t("words.arrive", { time: stop.arrivalTime }) : null,
    stop.departureTime ? t("words.leave", { time: stop.departureTime }) : null,
    stop.duration.trim() && !Number.isNaN(minutes) ? t("words.stay", { time: formatMinutes(t, minutes) }) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

interface StopCardProps {
  readonly stop: DraftStop;
  readonly place: DestinationChoice | undefined;
  readonly sequence: number;
  readonly isFirst: boolean;
  readonly isLast: boolean;
  readonly selected: boolean;
  readonly expanded: boolean;
  readonly armed: boolean;
  readonly dragging: boolean;
  readonly dispatch: Dispatch<DraftAction>;
  readonly onSelect: (key: string) => void;
  readonly onToggle: () => void;
  readonly onArm: (key: string | null) => void;
  readonly onDragStart: () => void;
  readonly onDragOver: (event: DragEvent<HTMLElement>) => void;
  readonly onDrop: (event: DragEvent<HTMLElement>) => void;
  readonly onDragEnd: () => void;
  readonly t: CorridorsT;
}

function StopCard({
  stop,
  place,
  sequence,
  isFirst,
  isLast,
  selected,
  expanded,
  armed,
  dragging,
  dispatch,
  onSelect,
  onToggle,
  onArm,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  t,
}: StopCardProps) {
  const name = place?.name ?? t("words.unknownDestination");
  const times = timesOf(stop, t);
  const extras = [stop.title && t("stop.quotedTitle", { title: stop.title }), (stop.description || stop.notes) && t("stop.notesAdded")]
    .filter(Boolean)
    .join(" · ");
  const edit = (patch: Partial<Omit<DraftStop, "key">>) => dispatch({ type: "editStop", stop: stop.key, patch });

  return (
    <li
      className={cn(
        "rounded-lg border bg-paper transition-colors",
        selected ? "border-teal ring-2 ring-teal/15" : "border-line",
        dragging && "opacity-50",
      )}
      draggable={armed}
      id={`stop-${stop.key}`}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", stop.key);
        onDragStart();
      }}
      onDrop={onDrop}
    >
      <div className="flex items-start gap-2 px-3 py-2.5">
        <button
          aria-label={t("stop.dragLabel", { name })}
          className="mt-1.5 cursor-grab touch-none rounded-sm text-muted hover:text-ink active:cursor-grabbing"
          onPointerDown={() => onArm(stop.key)}
          onPointerUp={() => onArm(null)}
          type="button"
        >
          <GripVertical aria-hidden className="size-4" />
        </button>
        <button
          aria-label={t("stop.showLabel", { name })}
          className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-md border border-line bg-sand"
          onClick={() => onSelect(stop.key)}
          type="button"
        >
          {place?.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- a small thumbnail from the API's media path
            <img alt="" className="size-full object-cover" loading="lazy" src={place.coverUrl} />
          ) : (
            <MapPin aria-hidden className="size-5 text-muted" />
          )}
          <span
            className={cn(
              "absolute top-1 left-1 grid h-5 min-w-5 place-items-center rounded-full border border-white px-1 text-2xs font-semibold",
              selected ? "bg-inverse text-inverse-foreground" : "bg-primary text-primary-foreground",
            )}
          >
            {sequence}
          </span>
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <button
              className="truncate text-left text-sm font-semibold text-ink hover:text-teal-deep"
              onClick={() => onSelect(stop.key)}
              type="button"
            >
              {name}
            </button>
            {isFirst ? <Badge>{t("stop.start")}</Badge> : null}
            {place && isUnpinned(place) ? <Badge tone="warning">{t("words.noMapPin")}</Badge> : null}
            {place && isUnpublished(place) ? <Badge>{t("words.draft")}</Badge> : null}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted">
            {[place?.provinceName ?? t("words.noProvince"), ...(place?.categories ?? [])].join(" · ")}
            {" · "}
            <a
              className="font-medium text-teal-deep hover:underline"
              href={`/destinations/${stop.destinationId}`}
              rel="noreferrer"
              target="_blank"
            >
              {t("stop.viewDestination")}
            </a>
          </p>
          {place?.shortDescription ? <p className="mt-1 line-clamp-2 text-xs text-ink-soft">{place.shortDescription}</p> : null}

          <button
            aria-expanded={expanded}
            className="mt-1.5 inline-flex max-w-full items-center gap-1 text-left text-xs text-ink-soft hover:text-ink"
            onClick={onToggle}
            type="button"
          >
            <ChevronDown aria-hidden className={cn("size-3.5 shrink-0 transition-transform", expanded && "rotate-180")} />
            <span className="truncate tabular-nums">
              {expanded ? t("stop.hide") : [times, extras].filter(Boolean).join(" · ") || t("stop.add")}
            </span>
          </button>

          {expanded ? (
            <div className="mt-2 grid gap-2 pb-1">
              <div className="grid grid-cols-3 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-2xs font-medium text-muted">{t("stop.arrival")}</span>
                  <Input className="h-8 tabular-nums" onChange={(event) => edit({ arrivalTime: event.target.value })} type="time" value={stop.arrivalTime} />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-2xs font-medium text-muted">{t("stop.departure")}</span>
                  <Input
                    aria-invalid={Boolean(stop.arrivalTime && stop.departureTime && stop.departureTime < stop.arrivalTime) || undefined}
                    className="h-8 tabular-nums"
                    onChange={(event) => edit({ departureTime: event.target.value })}
                    type="time"
                    value={stop.departureTime}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-2xs font-medium text-muted">{t("stop.stayMinutes")}</span>
                  <Input
                    className="h-8 tabular-nums"
                    inputMode="numeric"
                    max={1440}
                    min={0}
                    onChange={(event) => edit({ duration: event.target.value })}
                    step={5}
                    type="number"
                    value={stop.duration}
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-2xs font-medium text-muted">{t("words.title")}</span>
                <Input
                  className="h-8"
                  maxLength={200}
                  onChange={(event) => edit({ title: event.target.value })}
                  placeholder={t("stop.titlePlaceholder")}
                  value={stop.title}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-2xs font-medium text-muted">{t("stop.what")}</span>
                <Textarea onChange={(event) => edit({ description: event.target.value })} rows={2} value={stop.description} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-2xs font-medium text-muted">{t("stop.notes")}</span>
                <Textarea maxLength={4000} onChange={(event) => edit({ notes: event.target.value })} rows={2} value={stop.notes} />
              </label>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 gap-0.5">
          <Button
            aria-label={t("stop.earlier", { name })}
            disabled={isFirst}
            onClick={() => dispatch({ type: "shiftStop", stop: stop.key, by: -1 })}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <ArrowUp aria-hidden className="size-4" />
          </Button>
          <Button
            aria-label={t("stop.later", { name })}
            disabled={isLast}
            onClick={() => dispatch({ type: "shiftStop", stop: stop.key, by: 1 })}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <ArrowDown aria-hidden className="size-4" />
          </Button>
          <Button
            aria-label={t("stop.remove", { name })}
            onClick={() => dispatch({ type: "removeStop", stop: stop.key })}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <Trash2 aria-hidden className="size-4" />
          </Button>
        </div>
      </div>
    </li>
  );
}
