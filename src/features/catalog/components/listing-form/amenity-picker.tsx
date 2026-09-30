"use client";

import { useMemo, useState } from "react";
import {
  Accessibility,
  AirVent,
  ArrowUpDown,
  Baby,
  Bath,
  BedSingle,
  BugOff,
  Droplets,
  Footprints,
  Coffee,
  DoorClosed,
  Fan,
  Flame,
  LampDesk,
  Layers,
  Microwave,
  MonitorPlay,
  Moon,
  Refrigerator,
  Shirt,
  Sofa,
  SprayCan,
  VolumeX,
  Wind,
  Wine,
  Car,
  Check,
  Clock,
  Compass,
  ConciergeBell,
  CookingPot,
  DoorOpen,
  Dumbbell,
  EggFried,
  Flower2,
  Heater,
  Laptop,
  Luggage,
  Martini,
  PawPrint,
  Plane,
  Search,
  ShowerHead,
  Sparkles,
  SquareParking,
  Sun,
  Trees,
  Tv,
  Users,
  Utensils,
  Vault,
  WashingMachine,
  Waves,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import type { EnumOption } from "@/features/catalog/resource";
import { alphabetical } from "@/features/catalog/resources";
import { cn } from "@/lib/utils";

const ICONS: Readonly<Record<string, LucideIcon>> = {
  wifi: Wifi,
  "wifi-free": Wifi,
  workspace: Laptop,
  parking: SquareParking,
  "parking-free": SquareParking,
  "airport-shuttle": Plane,
  "car-hire": Car,
  pool: Waves,
  spa: Flower2,
  gym: Dumbbell,
  garden: Trees,
  terrace: Sun,
  breakfast: EggFried,
  restaurant: Utensils,
  bar: Martini,
  "room-service": ConciergeBell,
  kitchen: CookingPot,
  "air-conditioning": AirVent,
  heating: Heater,
  "private-bathroom": Bath,
  balcony: DoorOpen,
  tv: Tv,
  safe: Vault,
  "front-desk-24h": Clock,
  laundry: WashingMachine,
  housekeeping: Sparkles,
  "luggage-storage": Luggage,
  tours: Compass,
  "family-rooms": Users,
  cot: Baby,
  "pets-allowed": PawPrint,
  "step-free-access": Accessibility,
  lift: ArrowUpDown,
  "accessible-bathroom": ShowerHead,
  /* A room's own (RoomAmenities). */
  fan: Fan,
  "mosquito-net": BugOff,
  "blackout-curtains": Moon,
  soundproofing: VolumeX,
  "hot-water": Flame,
  shower: ShowerHead,
  "rain-shower": ShowerHead,
  bidet: Droplets,
  towels: Layers,
  slippers: Footprints,
  iron: Shirt,
  bathtub: Bath,
  hairdryer: Wind,
  toiletries: SprayCan,
  bathrobes: Shirt,
  kettle: Coffee,
  "coffee-machine": Coffee,
  minibar: Wine,
  fridge: Refrigerator,
  kitchenette: CookingPot,
  microwave: Microwave,
  streaming: MonitorPlay,
  desk: LampDesk,
  "private-pool": Waves,
  "seating-area": Sofa,
  wardrobe: DoorClosed,
  "step-free": Accessibility,
  "ground-floor": Layers,
  "cot-available": Baby,
  "extra-bed-available": BedSingle,
};

/** What travellers filter by most, offered first the way booking sites do. */
const MOST_REQUESTED = [
  "wifi-free",
  "parking-free",
  "air-conditioning",
  "pool",
  "breakfast",
  "front-desk-24h",
  "airport-shuttle",
  "family-rooms",
];

interface Amenity {
  readonly value: string;
  readonly group: string;
  readonly label: string;
}

/** The registry labels an amenity `Group · Name`; the group is how it is laid out here. */
function split(option: EnumOption): Amenity {
  const [group, ...rest] = option.label.split(" · ");
  return rest.length
    ? { value: option.value, group, label: rest.join(" · ") }
    : { value: option.value, group: "Other", label: option.label };
}

interface AmenityPickerProps {
  readonly options: readonly EnumOption[];
  readonly value: readonly string[];
  readonly onChange: (value: string[]) => void;
  readonly labelledBy: string;
  /** Offered first; the property's most requested unless a list says otherwise. */
  readonly popular?: readonly string[];
  /** What the list holds, for its search box: "facilities" unless it holds something else. */
  readonly noun?: string;
  /**
   * The list is written in the order it should read — what only this kind of
   * place has, group by group, each group a scale or a sequence — so it is
   * shown that way. Facilities, which are a list of names, stay A to Z.
   */
  readonly ordered?: boolean;
}

/**
 * Facilities as a checklist: the most requested first, then every group with
 * its own heading, each facility a checkbox with its icon. Search narrows all
 * of them at once.
 */
export function AmenityPicker({
  options,
  value,
  onChange,
  labelledBy,
  popular: popularSlugs = MOST_REQUESTED,
  noun = "facilities",
  ordered = false,
}: AmenityPickerProps) {
  const [term, setTerm] = useState("");
  const selected = useMemo(() => new Set(value), [value]);
  /*
   * Groups A to Z, and every facility A to Z within its group — unless the
   * list is already written in the order it should read, when it is left as
   * it is: "Casual, Smart casual, Formal" is a scale, not three names.
   */
  const amenities = useMemo(() => (ordered ? [...options] : alphabetical(options)).map(split), [options, ordered]);
  const needle = term.trim().toLowerCase();

  const groups = useMemo(() => {
    const byGroup = new Map<string, Amenity[]>();
    for (const amenity of amenities) {
      if (needle && !`${amenity.group} ${amenity.label}`.toLowerCase().includes(needle)) continue;
      byGroup.set(amenity.group, [...(byGroup.get(amenity.group) ?? []), amenity]);
    }
    return [...byGroup.entries()];
  }, [amenities, needle]);

  const popular = alphabetical(popularSlugs.flatMap((slug) => amenities.filter((amenity) => amenity.value === slug)));

  function toggle(slug: string) {
    onChange(selected.has(slug) ? value.filter((item) => item !== slug) : [...value, slug]);
  }

  return (
    <div aria-labelledby={labelledBy} className="flex flex-col gap-4" role="group">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-48 flex-1 sm:max-w-xs">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted" />
          <Input
            aria-label={`Search ${noun}`}
            className="h-8 pl-8 text-sm"
            onChange={(event) => setTerm(event.target.value)}
            placeholder={`Search ${noun}…`}
            type="search"
            value={term}
          />
        </div>
        <span className="text-xs text-muted tabular-nums">{value.length} selected</span>
        {value.length ? (
          <button className="text-xs font-medium text-teal-deep hover:underline" onClick={() => onChange([])} type="button">
            Clear all
          </button>
        ) : null}
      </div>

      {!needle && popular.length ? (
        <div>
          <p className="mb-2 text-xs font-medium text-muted">Most requested by guests</p>
          <ul className="flex flex-wrap gap-1.5">
            {popular.map((amenity) => {
              const Icon = ICONS[amenity.value] ?? Check;
              const on = selected.has(amenity.value);
              return (
                <li key={amenity.value}>
                  <button
                    aria-pressed={on}
                    className={cn(
                      "inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-sm transition-colors",
                      on ? "border-teal bg-teal-soft text-teal-deep" : "border-line-strong bg-paper text-ink-soft hover:bg-sand hover:text-ink",
                    )}
                    onClick={() => toggle(amenity.value)}
                    type="button"
                  >
                    {on ? <Check aria-hidden className="size-3.5" strokeWidth={2.5} /> : <Icon aria-hidden className="size-3.5 text-muted" strokeWidth={1.75} />}
                    {amenity.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-line">
        {groups.map(([group, entries]) => {
          const chosen = entries.filter((amenity) => selected.has(amenity.value)).length;
          return (
            <fieldset className="border-line px-3 py-3 not-last:border-b" key={group}>
              <legend className="float-left mb-2 flex w-full items-baseline justify-between text-xs font-medium text-muted">
                <span>{group}</span>
                {chosen ? <span className="text-teal-deep tabular-nums">{chosen} selected</span> : null}
              </legend>
              <ul className="clear-left grid gap-x-4 gap-y-0.5 sm:grid-cols-2 2xl:grid-cols-3">
                {entries.map((amenity) => {
                  /* No stand-in icon: a tick beside an empty checkbox reads as chosen. */
                  const Icon = ICONS[amenity.value];
                  const on = selected.has(amenity.value);
                  return (
                    <li key={amenity.value}>
                      <label className="flex min-h-8 cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1 text-sm text-ink-soft transition-colors hover:bg-sand">
                        <input
                          checked={on}
                          className="size-4 shrink-0 accent-teal"
                          onChange={() => toggle(amenity.value)}
                          type="checkbox"
                        />
                        {Icon ? <Icon aria-hidden className={cn("size-4 shrink-0", on ? "text-teal" : "text-muted")} strokeWidth={1.75} /> : null}
                        <span className={cn("min-w-0 flex-1 leading-snug", on && "text-ink")}>{amenity.label}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          );
        })}
        {groups.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted">Nothing matches “{term}”.</p>
        ) : null}
      </div>
    </div>
  );
}
