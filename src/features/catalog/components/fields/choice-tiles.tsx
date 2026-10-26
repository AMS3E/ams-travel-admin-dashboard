"use client";

import {
  BedDouble, Briefcase, Building2, Camera, Check, Compass, Gem, Globe, House, Landmark, Leaf, Map, MapPin,
  Mountain, Route, Shapes, Ship, Soup, Sparkles, Sprout, Star, Sun, Tent, TreePalm, Trees, UtensilsCrossed,
  Waves, type LucideIcon, type LucideProps,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReferenceOption } from "@/features/catalog/resource";
import { InterestGroupPicker } from "./interest-group-picker";
import { cn } from "@/lib/utils";
import type englishForms from "@locales/en/forms.json";

/** A tile's line, by its key under `forms.tiles.hints`. */
type TileHint = keyof typeof englishForms.tiles.hints;

/**
 * What a tile shows beside a choice's name: an icon and one line, so a region,
 * a zone or a group is chosen on its meaning rather than on a word. Keyed by
 * the option's slug (a region's code) or, for a plain list, its value.
 */
interface Tile {
  readonly icon: LucideIcon;
  readonly hint: TileHint;
  /** Shown by the picture an editor uploaded for it (an interest group's), the icon standing in when it has none. */
  readonly pictured?: boolean;
}

/** The tourism regions, which are also the attraction themes; one added since draws the default icon and its own description. */
export const THEME_TILES: Readonly<Record<string, Tile>> = {
  "ANCIENT-CAPITALS": { icon: Landmark, hint: "ANCIENT-CAPITALS" },
  NORTHEASTERN: { icon: Trees, hint: "NORTHEASTERN" },
  "MEKONG-TONLE-SAP": { icon: Ship, hint: "MEKONG-TONLE-SAP" },
  "MOUNTAIN-WATERFALL": { icon: Mountain, hint: "MOUNTAIN-WATERFALL" },
  "COASTAL-ISLAND": { icon: TreePalm, hint: "COASTAL-ISLAND" },
  "URBAN-LIFESTYLE": { icon: Building2, hint: "URBAN-LIFESTYLE" },
  "KHMER-CULINARY": { icon: Soup, hint: "KHMER-CULINARY" },
  "ECO-COMMUNITY": { icon: Sprout, hint: "ECO-COMMUNITY" },
  "LUXURY-TOURISM": { icon: Gem, hint: "LUXURY-TOURISM" },
};

/** The five zones the provinces sit in. */
const ZONE_TILES: Readonly<Record<string, Tile>> = {
  CAPITAL: { icon: Building2, hint: "CAPITAL" },
  ANGKOR: { icon: Landmark, hint: "ANGKOR" },
  NORTHEAST: { icon: Trees, hint: "NORTHEAST" },
  MEKONG: { icon: Ship, hint: "MEKONG" },
  COAST: { icon: Waves, hint: "COAST" },
};

/** The six groups the Interests tab lists interests under; their pictures are set on the Interests page. */
const INTEREST_GROUP_TILES: Readonly<Record<string, Tile>> = {
  "Attraction Sites": { icon: Landmark, hint: "attractionSites", pictured: true },
  Stays: { icon: BedDouble, hint: "stays", pictured: true },
  Food: { icon: UtensilsCrossed, hint: "food", pictured: true },
  Water: { icon: Waves, hint: "water", pictured: true },
  "Activities & Experiences": { icon: Tent, hint: "activities", pictured: true },
  "Tourism Corridors": { icon: Route, hint: "corridors", pictured: true },
};

const TILES: Readonly<Record<string, Tile>> = { ...THEME_TILES, ...ZONE_TILES, ...INTEREST_GROUP_TILES };

const tileOf = (option: ReferenceOption): Tile | undefined => TILES[option.slug ?? option.value] ?? TILES[option.value];

interface ChoiceTilesProps {
  readonly options: readonly ReferenceOption[];
  /** One value, or several when `multiple`. */
  readonly value: string | readonly string[];
  readonly multiple?: boolean;
  readonly onChange: (value: string | string[]) => void;
  readonly labelledBy?: string;
  readonly describedBy?: string;
  readonly invalid?: boolean;
  /** The icon of a card the tables above do not know: a historical period's, a site's. */
  readonly icon?: LucideIcon;
  /** One line per card — the icon and the name, the description on hover — three to a row. */
  readonly compact?: boolean;
}

/** A choice as cards: a region, a zone or a group, each with its icon and what it holds. */
export function ChoiceTiles({ options, value, multiple = false, onChange, labelledBy, describedBy, invalid, icon, compact = false }: ChoiceTilesProps) {
  const t = useTranslations("forms.tiles");
  const chosen = new Set(Array.isArray(value) ? value : value ? [value] : []);
  function toggle(option: string) {
    if (!multiple) return onChange(option);
    onChange(chosen.has(option) ? [...chosen].filter((each) => each !== option) : [...chosen, option]);
  }
  /* The interest groups: each card shows the group's picture, and its picture can be changed from it. */
  if (options.length > 0 && options.every((option) => tileOf(option)?.pictured)) {
    return (
      <InterestGroupPicker
        chosen={chosen}
        describedBy={describedBy}
        hintOf={(option) => t(`hints.${tileOf(option)!.hint}`)}
        iconOf={(option) => tileOf(option)!.icon}
        invalid={invalid}
        labelledBy={labelledBy}
        multiple={multiple}
        onToggle={toggle}
        options={options}
      />
    );
  }
  return (
    <div
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      aria-labelledby={labelledBy}
      className={cn("grid gap-2", compact ? "grid-cols-2 xl:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3")}
      role={multiple ? "group" : "radiogroup"}
    >
      {options.map((option) => {
        const tile = tileOf(option);
        const Icon = tile?.icon ?? icon ?? Shapes;
        const hint = tile ? t(`hints.${tile.hint}`) : option.detail;
        const selected = chosen.has(option.value);
        return (
          <button
            aria-checked={multiple ? undefined : selected}
            aria-pressed={multiple ? selected : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg border text-left transition-colors",
              compact ? "px-2.5 py-2" : "px-3 py-2.5",
              selected ? "border-teal bg-teal-soft/50 ring-1 ring-teal" : "border-line-strong bg-paper hover:bg-sand",
            )}
            key={option.value}
            onClick={() => toggle(option.value)}
            role={multiple ? undefined : "radio"}
            title={compact ? hint : undefined}
            type="button"
          >
            <Icon aria-hidden className={cn("size-5 shrink-0", selected ? "text-teal" : "text-muted")} strokeWidth={1.75} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-ink">
                {option.label}
                {option.inactive ? <span className="text-muted"> {t("retired")}</span> : null}
              </span>
              {hint && !compact ? <span className="block text-xs leading-snug text-muted">{hint}</span> : null}
            </span>
            <span
              aria-hidden
              className={cn(
                "grid size-4 shrink-0 place-items-center border",
                multiple ? "rounded" : "rounded-full",
                selected ? "border-teal bg-teal" : "border-line-strong bg-paper",
              )}
            >
              {selected ? <span className={cn("bg-white", multiple ? "size-2 rounded-sm" : "size-1.5 rounded-full")} /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * The icons the website draws for an interest, by the names it knows
 * (`ICON_NAMES` in the website's travel types); a test keeps the two in step.
 * Each is named under `forms.tiles.icons`.
 */
export const ICON_CHOICES: readonly { readonly value: keyof typeof englishForms.tiles.icons; readonly icon: LucideIcon }[] = [
  { value: "briefcase", icon: Briefcase },
  { value: "building", icon: Building2 },
  { value: "camera", icon: Camera },
  { value: "compass", icon: Compass },
  { value: "globe", icon: Globe },
  { value: "home", icon: House },
  { value: "leaf", icon: Leaf },
  { value: "map", icon: Map },
  { value: "mountain", icon: Mountain },
  { value: "pin", icon: MapPin },
  { value: "route", icon: Route },
  { value: "sparkles", icon: Sparkles },
  { value: "star", icon: Star },
  { value: "sun", icon: Sun },
  { value: "temple", icon: Landmark },
  { value: "tree", icon: Trees },
  { value: "utensils", icon: UtensilsCrossed },
  { value: "waves", icon: Waves },
];

const ICON_BY_KEY: Readonly<Record<string, LucideIcon>> = Object.fromEntries(ICON_CHOICES.map((choice) => [choice.value, choice.icon]));

/** The icon the website draws for a key: a compass when there is none, as the website does. */
export function KeyIcon({ iconKey, ...props }: LucideProps & { readonly iconKey?: string }) {
  const Icon = ICON_BY_KEY[iconKey ?? ""] ?? Compass;
  return <Icon {...props} />;
}

/** An icon chosen from the ones the website draws, as one tight row with the chosen one named under it. */
export function IconPicker({
  value,
  onChange,
  labelledBy,
  describedBy,
}: {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly labelledBy?: string;
  readonly describedBy?: string;
}) {
  const t = useTranslations("forms.tiles");
  const chosen = ICON_CHOICES.find((choice) => choice.value === value);
  return (
    <div className="flex flex-col gap-1.5">
      <div aria-describedby={describedBy} aria-labelledby={labelledBy} className="flex flex-wrap gap-1" role="radiogroup">
        {ICON_CHOICES.map((choice) => {
          const selected = choice.value === value;
          return (
            <button
              aria-checked={selected}
              aria-label={t(`icons.${choice.value}`)}
              className={cn(
                "grid size-9 place-items-center rounded-md border transition-colors",
                selected ? "border-teal bg-teal-soft/50 ring-1 ring-teal" : "border-line bg-paper hover:bg-sand",
              )}
              key={choice.value}
              onClick={() => onChange(selected ? "" : choice.value)}
              role="radio"
              title={t(`icons.${choice.value}`)}
              type="button"
            >
              <choice.icon aria-hidden className={cn("size-4.5", selected ? "text-teal" : "text-ink-soft")} strokeWidth={1.75} />
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted">
        {chosen ? t(`icons.${chosen.value}`) : value ? t("keptAsSaved", { value }) : t("noIcon")}
      </p>
    </div>
  );
}

/** Small on/off chips with All and None: an interest's tourism regions. */
export function ChipToggles({
  options,
  value,
  onChange,
  labelledBy,
  describedBy,
}: {
  readonly options: readonly ReferenceOption[];
  readonly value: readonly string[];
  readonly onChange: (value: string[]) => void;
  readonly labelledBy?: string;
  readonly describedBy?: string;
}) {
  const t = useTranslations("forms.tiles");
  const chosen = new Set(value);
  const live = options.filter((option) => !option.inactive || chosen.has(option.value));
  function toggle(option: string) {
    onChange(chosen.has(option) ? value.filter((each) => each !== option) : [...value, option]);
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-muted">{t("chosenCount", { count: chosen.size, total: live.length })}</span>
        <span className="flex items-center gap-1.5">
          <button
            className="font-medium text-teal hover:underline disabled:text-muted disabled:no-underline"
            disabled={live.every((option) => chosen.has(option.value))}
            onClick={() => onChange(live.map((option) => option.value))}
            type="button"
          >
            {t("all")}
          </button>
          <span aria-hidden className="text-line-strong">·</span>
          <button
            className="font-medium text-teal hover:underline disabled:text-muted disabled:no-underline"
            disabled={chosen.size === 0}
            onClick={() => onChange([])}
            type="button"
          >
            {t("none")}
          </button>
        </span>
      </div>
      <div aria-describedby={describedBy} aria-labelledby={labelledBy} className="flex flex-wrap gap-1.5" role="group">
        {live.map((option) => {
          const selected = chosen.has(option.value);
          const Icon = tileOf(option)?.icon ?? Shapes;
          return (
            <button
              aria-pressed={selected}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                selected ? "border-teal bg-teal-soft/50 text-ink ring-1 ring-teal" : "border-line-strong bg-paper text-ink-soft hover:bg-sand",
              )}
              key={option.value}
              onClick={() => toggle(option.value)}
              type="button"
            >
              <Icon aria-hidden className={cn("size-3.5 shrink-0", selected ? "text-teal" : "text-muted")} strokeWidth={1.75} />
              {option.label}
              {option.inactive ? <span className="text-muted">{t("retired")}</span> : null}
              {selected ? <Check aria-hidden className="size-3 shrink-0 text-teal" strokeWidth={2.5} /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
