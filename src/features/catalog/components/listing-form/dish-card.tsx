import type { ReactNode } from "react";
import Image from "next/image";
import { Flame, Star, UtensilsCrossed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { FormValues } from "@/features/catalog/resource";
import { dishLine, suitsLine, warningLine } from "@/features/catalog/menu";
import { formatMoney } from "@/features/catalog/components/listing-form/room-card";
import { cn } from "@/lib/utils";

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

interface DishCardProps {
  readonly values: FormValues;
  readonly currency: string;
  /** The first photo's link; the card shows cutlery where there is none. */
  readonly photoUrl?: string;
  /** "Not saved yet", "Off the menu"… beside the course. */
  readonly badge?: ReactNode;
  /** Edit, duplicate, delete: the list's; none in the preview. */
  readonly actions?: ReactNode;
  /** `stacked`: the photo on top, for a narrow column. */
  readonly layout?: "row" | "stacked";
  readonly className?: string;
}

/**
 * A dish as a diner reads one: what it is called in both languages, what is in
 * it, how hot it is and what it costs. The same card lists the menu and
 * previews the dish being written.
 */
export function DishCard({ values, currency, photoUrl, badge, actions, layout = "row", className }: DishCardProps) {
  const stacked = layout === "stacked";
  const name = text(values.name) || "Untitled dish";
  const localName = text(values.localName);
  const pronunciation = text(values.pronunciation);
  const price = Number(text(values.price));
  const priced = text(values.price) !== "" && Number.isFinite(price);
  const spicy = Number(text(values.spiceLevel)) || 0;
  const warns = warningLine(values);
  const suits = suitsLine(values);

  return (
    <div className={cn("@container", className)}>
      <article className={cn("flex overflow-hidden rounded-lg border border-line bg-paper", stacked && "flex-col")}>
        <div className={cn("relative shrink-0 bg-sand-deep", stacked ? "aspect-video w-full" : "w-16 self-stretch")}>
          {photoUrl ? (
            <Image alt="" className="object-cover" fill sizes="64px" src={photoUrl} unoptimized />
          ) : (
            <span className="grid h-full place-items-center text-muted">
              <UtensilsCrossed aria-hidden className={stacked ? "size-6" : "size-4"} strokeWidth={1.5} />
            </span>
          )}
        </div>

        <div className={cn("flex min-w-0 flex-1", stacked ? "flex-col gap-2 p-3" : "items-center gap-3 px-3 py-2")}>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {stacked ? <span className="text-2xs font-semibold tracking-wide text-teal-deep uppercase">{dishLine(values)}</span> : null}
              {values.isSignature === true ? (
                <span className="inline-flex items-center gap-1 text-2xs font-semibold text-gold-deep">
                  <Star aria-hidden className="size-3 fill-current" />
                  Signature
                </span>
              ) : null}
              {badge}
            </div>
            <h4 className={cn("flex flex-wrap items-baseline gap-x-2 text-sm font-semibold text-ink", stacked && "mt-0.5")}>
              {name}
              {localName ? <span className="text-xs font-medium text-ink-soft">{localName}</span> : null}
              {!stacked && pronunciation ? <span className="text-xs font-normal text-muted italic">“{pronunciation}”</span> : null}
            </h4>
            {stacked && pronunciation ? <p className="text-xs text-muted italic">“{pronunciation}”</p> : null}
            {text(values.description) ? (
              <p className={cn("text-xs text-muted", stacked ? "mt-1 line-clamp-2" : "line-clamp-1")}>{text(values.description)}</p>
            ) : null}

            <ul className={cn("flex flex-wrap gap-x-3 gap-y-1 text-2xs", stacked ? "mt-1.5" : "mt-0.5 empty:hidden")}>
              {suits ? <li className="text-success">{suits}</li> : null}
              {warns ? <li className="text-gold-deep">{warns}</li> : null}
              {spicy > 0 ? (
                <li className="inline-flex items-center gap-0.5 text-heritage">
                  {Array.from({ length: spicy }, (_, index) => (
                    <Flame aria-hidden className="size-3" key={index} />
                  ))}
                </li>
              ) : null}
            </ul>
          </div>

          <div className={cn("flex shrink-0", stacked ? "flex-col items-start gap-1 border-t border-line pt-2" : "items-center gap-3")}>
            {priced ? (
              <p className={cn("font-semibold text-ink tabular-nums", stacked ? "text-base" : "text-sm")}>{formatMoney(price, currency)}</p>
            ) : (
              <p className="text-xs text-muted">No price yet</p>
            )}
            {actions ? <div className={cn("flex flex-wrap gap-1", stacked && "mt-auto pt-1")}>{actions}</div> : null}
          </div>
        </div>
      </article>
    </div>
  );
}

/** "Not saved yet" and "Off the menu", the two states a dish in the list can be in besides on it. */
export function DishBadge({ state }: { readonly state: "pending" | "off-menu" }) {
  return state === "pending" ? <Badge tone="warning">Not saved yet</Badge> : <Badge>Off the menu</Badge>;
}
