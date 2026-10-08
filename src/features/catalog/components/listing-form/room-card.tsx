import type { ReactNode } from "react";
import Image from "next/image";
import { BedDouble, Building2, Coffee, LayoutGrid, Maximize2, Mountain, ShowerHead, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { FormValues } from "@/features/catalog/resource";
import { ROOM_AMENITIES } from "@/features/catalog/resources";
import { bedLine, floorLabel, hasOwnLayout, layoutLine, roomTypeLabel, sleepsOf, viewLabel } from "@/features/catalog/rooms";
import { cn } from "@/lib/utils";

/** A price in the stay's currency, or the bare figure for a code Intl does not know. */
export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

const AMENITY_LABELS = new Map(ROOM_AMENITIES.map((option) => [option.value, option.label.split(" · ").pop() ?? option.label]));

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

interface RoomCardProps {
  readonly values: FormValues;
  readonly currency: string;
  /** The first photo's link; the card shows a bed where there is none. */
  readonly photoUrl?: string;
  /** "Not saved yet", "Hidden"… beside the type. */
  readonly badge?: ReactNode;
  /** Edit, duplicate, delete: the list's; none in the preview. */
  readonly actions?: ReactNode;
  /** `stacked`: the photo on top and the price below, for a narrow column. */
  readonly layout?: "row" | "stacked";
  readonly className?: string;
}

/**
 * A room as a traveller reads one: what it is, who it sleeps and in which
 * beds, what it has, and the price with the terms that come with it. The same
 * card lists the rooms and previews the one being written.
 */
export function RoomCard({ values, currency, photoUrl, badge, actions, layout = "row", className }: RoomCardProps) {
  const stacked = layout === "stacked";
  const name = text(values.name) || "Untitled room";
  const count = Number.parseInt(text(values.roomCount) || "1", 10) || 1;
  const beds = bedLine(values);
  const sleeps = sleepsOf(values);
  const dorm = values.roomType === "DORM_BED";
  const size = text(values.sizeSqm);
  const view = viewLabel(values.view);
  const price = Number(text(values.pricePerNight));
  const priced = text(values.pricePerNight) !== "" && Number.isFinite(price);
  const amenities = (Array.isArray(values.amenities) ? values.amenities : []).map((slug) => AMENITY_LABELS.get(slug) ?? slug);
  const layoutOf = hasOwnLayout(values) ? layoutLine(values) : "";
  const floor = floorLabel(values.floor);
  const weekly = Number(text(values.weeklyPrice));
  const monthly = Number(text(values.monthlyPrice));

  return (
    <div className={cn("@container", className)}>
    <article className={cn("flex overflow-hidden rounded-lg border border-line bg-paper", stacked && "flex-col")}>
      <div className={cn("relative shrink-0 bg-sand-deep", stacked ? "aspect-video w-full" : "hidden w-32 @lg:block")}>
        {photoUrl ? (
          <Image alt="" className="object-cover" fill sizes="128px" src={photoUrl} unoptimized />
        ) : (
          <span className="grid h-full place-items-center gap-1 text-center text-muted">
            <BedDouble aria-hidden className="size-7" strokeWidth={1.5} />
            <span className="text-3xs font-medium">No photo</span>
          </span>
        )}
      </div>

      <div className={cn("flex min-w-0 flex-1 flex-col gap-2 p-3", !stacked && "@2xl:flex-row @2xl:gap-4")}>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-2xs font-semibold tracking-wide text-teal-deep uppercase">{roomTypeLabel(values.roomType)}</span>
            {count > 1 ? <span className="text-2xs text-muted tabular-nums">· {count} {dorm ? "beds" : "rooms"}</span> : null}
            {badge}
          </div>
          <h4 className="mt-0.5 line-clamp-2 text-sm font-semibold text-ink">{name}</h4>
          {text(values.highlight) ? <p className="mt-0.5 line-clamp-1 text-xs text-muted">{text(values.highlight)}</p> : null}

          <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-soft">
            {beds ? (
              <li className="inline-flex items-center gap-1">
                <BedDouble aria-hidden className="size-3.5 text-muted" />
                {beds}
              </li>
            ) : null}
            <li className="inline-flex items-center gap-1">
              <Users aria-hidden className="size-3.5 text-muted" />
              {dorm ? "1 guest per bed" : `Sleeps ${sleeps || "—"}`}
            </li>
            {size ? (
              <li className="inline-flex items-center gap-1">
                <Maximize2 aria-hidden className="size-3.5 text-muted" />
                {size} m²
              </li>
            ) : null}
            {view ? (
              <li className="inline-flex items-center gap-1">
                <Mountain aria-hidden className="size-3.5 text-muted" />
                {view}
              </li>
            ) : null}
            {layoutOf ? (
              <li className="inline-flex items-center gap-1">
                <LayoutGrid aria-hidden className="size-3.5 text-muted" />
                {layoutOf}
              </li>
            ) : null}
            {floor ? (
              <li className="inline-flex items-center gap-1">
                <Building2 aria-hidden className="size-3.5 text-muted" />
                {floor}
                {values.liftAccess !== true && Number(text(values.floor)) > 0 ? ", stairs only" : ""}
              </li>
            ) : null}
            {values.hasWindow === false ? (
              <li className="inline-flex items-center gap-1 text-gold-deep">No window</li>
            ) : null}
            {values.bathroom === "SHARED" ? (
              <li className="inline-flex items-center gap-1">
                <ShowerHead aria-hidden className="size-3.5 text-muted" />
                Shared bathroom
              </li>
            ) : null}
          </ul>

          {amenities.length ? (
            <ul className="mt-2 flex flex-wrap gap-1">
              {amenities.slice(0, 5).map((label) => (
                <li className="rounded-sm bg-sand px-1.5 py-0.5 text-2xs text-ink-soft" key={label}>
                  {label}
                </li>
              ))}
              {amenities.length > 5 ? <li className="px-1 py-0.5 text-2xs text-muted">+{amenities.length - 5} more</li> : null}
            </ul>
          ) : null}
        </div>

        <div
          className={cn(
            "flex shrink-0 flex-col items-start gap-1 border-line",
            stacked ? "border-t pt-2" : "border-t pt-2 @2xl:w-44 @2xl:items-end @2xl:border-t-0 @2xl:border-l @2xl:pt-0 @2xl:pl-4 @2xl:text-right",
          )}
        >
          {priced ? (
            <p className="text-sm text-ink">
              <span className="text-base font-semibold tabular-nums">{formatMoney(price, currency)}</span>
              <span className="text-xs text-muted"> / night</span>
            </p>
          ) : (
            <p className="text-xs text-muted">No price yet</p>
          )}
          {text(values.weeklyPrice) && Number.isFinite(weekly) ? (
            <p className="text-xs text-muted tabular-nums">{formatMoney(weekly, currency)} / week</p>
          ) : null}
          {text(values.monthlyPrice) && Number.isFinite(monthly) ? (
            <p className="text-xs text-muted tabular-nums">{formatMoney(monthly, currency)} / month</p>
          ) : null}
          {values.breakfastIncluded === true ? (
            <p className="inline-flex items-center gap-1 text-xs text-success">
              <Coffee aria-hidden className="size-3.5" />
              Breakfast included
            </p>
          ) : null}
          {actions ? <div className="mt-auto flex flex-wrap gap-1 pt-1 @2xl:justify-end">{actions}</div> : null}
        </div>
      </div>
    </article>
    </div>
  );
}

/** "Not saved yet" and "Hidden", the two states a room in the list can be in besides bookable. */
export function RoomBadge({ state }: { readonly state: "pending" | "off-sale" }) {
  return state === "pending" ? <Badge tone="warning">Not saved yet</Badge> : <Badge>Hidden from guests</Badge>;
}
