import type { ReactNode } from "react";
import Image from "next/image";
import { BedDouble, Coffee, Maximize2, Mountain, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { FormValues } from "@/features/catalog/resource";
import { ROOM_AMENITIES } from "@/features/catalog/resources";
import { bedLine, sleepsOf, viewLabel } from "@/features/catalog/rooms";
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
  const beds = bedLine(values);
  const sleeps = sleepsOf(values);
  const size = text(values.sizeSqm);
  const view = viewLabel(values.view);
  const price = Number(text(values.pricePerNight));
  const priced = text(values.pricePerNight) !== "" && Number.isFinite(price);
  const amenities = (Array.isArray(values.amenities) ? values.amenities : []).map((slug) => AMENITY_LABELS.get(slug) ?? slug);

  return (
    <div className={cn("@container", className)}>
    <article className={cn("flex overflow-hidden rounded-lg border border-line bg-paper", stacked && "flex-col")}>
      <div className={cn("relative shrink-0 bg-sand-deep", stacked ? "aspect-video w-full" : "w-16 self-stretch")}>
        {photoUrl ? (
          <Image alt="" className="object-cover" fill sizes={stacked ? "320px" : "64px"} src={photoUrl} unoptimized />
        ) : (
          <span className="grid h-full place-items-center gap-1 text-center text-muted">
            <BedDouble aria-hidden className={stacked ? "size-7" : "size-4"} strokeWidth={1.5} />
            {stacked ? <span className="text-3xs font-medium">No photo</span> : null}
          </span>
        )}
      </div>

      <div className={cn("flex min-w-0 flex-1", stacked ? "flex-col gap-2 p-3" : "items-center gap-3 px-3 py-2")}>
        <div className="min-w-0 flex-1">
          {badge ? <div className="flex flex-wrap items-center gap-1.5">{badge}</div> : null}
          <h4 className={cn("line-clamp-2 text-sm font-semibold text-ink", stacked && badge && "mt-0.5")}>{name}</h4>

          <ul className={cn("flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-soft", stacked ? "mt-1.5" : "mt-0.5")}>
            {beds ? (
              <li className="inline-flex items-center gap-1">
                <BedDouble aria-hidden className="size-3.5 text-muted" />
                {beds}
              </li>
            ) : null}
            <li className="inline-flex items-center gap-1">
              <Users aria-hidden className="size-3.5 text-muted" />
              Sleeps {sleeps || "—"}
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
          </ul>

          {stacked && amenities.length ? (
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

        <div className={cn("flex shrink-0", stacked ? "flex-col items-start gap-1 border-t border-line pt-2" : "items-center gap-3")}>
          {priced ? (
            <p className="text-sm text-ink">
              <span className={cn("font-semibold tabular-nums", stacked ? "text-base" : "text-sm")}>{formatMoney(price, currency)}</span>
              <span className="text-xs text-muted"> / night</span>
            </p>
          ) : (
            <p className="text-xs text-muted">No price yet</p>
          )}
          {values.breakfastIncluded === true ? (
            <p className="inline-flex items-center gap-1 text-xs text-success">
              <Coffee aria-hidden className="size-3.5" />
              Breakfast included
            </p>
          ) : null}
          {actions ? <div className={cn("flex flex-wrap gap-1", stacked && "mt-auto pt-1")}>{actions}</div> : null}
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
