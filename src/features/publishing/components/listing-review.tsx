import Image from "next/image";
import { ExternalLink, ImageIcon } from "lucide-react";
import { Surface, SurfaceHeader } from "@/components/ui/surface";
import type { FormValues, ReferenceOptions, ResourceDefinition } from "@/features/catalog/resource";
import { RoomBadge, RoomCard } from "@/features/catalog/components/listing-form/room-card";
import { listingSteps, type ListingStep } from "@/features/catalog/components/listing-form/steps";
import { reviewGroups, type ReviewRow } from "@/features/publishing/review";
import { cn } from "@/lib/utils";

/** A photo of the listing: its stored key, and where it is read. */
export interface ReviewPhoto {
  readonly key: string;
  readonly url: string;
}

/** A room, with its first photo. */
export interface ReviewItem {
  readonly id: string;
  readonly values: FormValues;
  readonly photoUrl?: string;
}

interface ListingReviewProps {
  readonly definition: ResourceDefinition;
  /** A stay's or a food listing's type, an attraction's theme: the form's own words follow it. */
  readonly kind?: string;
  readonly values: FormValues;
  readonly options: ReferenceOptions;
  readonly cover: string | null;
  readonly photos: readonly ReviewPhoto[];
  readonly rooms: readonly ReviewItem[];
  readonly currency: string;
}

/**
 * Everything the author sent, read-only, in the order of the form they filled
 * in — so a reviewer reads the listing before deciding on it, rather than a
 * name in a queue. Photos first, as travellers meet them; then each step,
 * with what was left empty marked where it would have been.
 */
export function ListingReview({ definition, kind, values, options, cover, photos, rooms, currency }: ListingReviewProps) {
  const steps = listingSteps(definition, kind).filter((step) => !step.review);

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <Photos cover={cover} photos={photos} />
      {steps.map((step) =>
        step.id === "rooms" ? (
          <ItemsStep empty="No rooms added yet. A stay is booked by its rooms." items={rooms} key={step.id} step={step}>
            {(room) => (
              <RoomCard
                badge={room.values.status === "INACTIVE" ? <RoomBadge state="off-sale" /> : undefined}
                currency={currency}
                photoUrl={room.photoUrl}
                values={room.values}
              />
            )}
          </ItemsStep>
        ) : (
          <AnswersStep definition={definition} key={step.id} options={options} step={step} values={values} />
        ),
      )}
    </div>
  );
}

function Photos({ cover, photos }: { readonly cover: string | null; readonly photos: readonly ReviewPhoto[] }) {
  const count = photos.length;
  return (
    <Surface aria-labelledby="review-photos">
      <SurfaceHeader
        description={`${cover ? "A cover photo" : "No cover photo"} and ${count ? `${count} more ${count === 1 ? "photo" : "photos"}` : "no other photos"}`}
        id="review-photos"
        title="Photos"
      />
      <div className="grid gap-3 p-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <figure className="relative aspect-16/10 overflow-hidden rounded-md border border-line bg-sand-deep">
          {cover ? (
            <Image alt="Cover photo" className="object-cover" fill sizes="(min-width: 1024px) 480px, 100vw" src={cover} unoptimized />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted">
              <ImageIcon aria-hidden className="size-5" strokeWidth={1.75} />
              <span className="text-xs">No cover photo</span>
            </div>
          )}
          <figcaption className="absolute bottom-2 left-2 rounded bg-scrim px-1.5 py-0.5 text-2xs font-medium text-white">Cover</figcaption>
        </figure>
        {count ? (
          <ul className="grid grid-cols-3 content-start gap-2">
            {photos.map((photo) => (
              <li className="relative aspect-4/3 overflow-hidden rounded-md border border-line bg-sand-deep" key={photo.key}>
                <a aria-label="Open the photo" href={photo.url} rel="noreferrer" target="_blank">
                  <Image alt="" className="object-cover" fill sizes="160px" src={photo.url} unoptimized />
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="self-center text-center text-sm text-muted">No other photos yet.</p>
        )}
      </div>
    </Surface>
  );
}

/** One step's answers, as a list of what was asked and what was said. */
function AnswersStep({ definition, step, values, options }: {
  readonly definition: ResourceDefinition;
  readonly step: ListingStep;
  readonly values: FormValues;
  readonly options: ReferenceOptions;
}) {
  const groups = reviewGroups(definition, step, values, options);
  if (!groups.length) return null;
  const rows = groups.flatMap((group) => group.rows);
  const missing = rows.filter((row) => row.value === null).length;
  const map = step.id === "location" ? mapLink(values) : null;

  return (
    <Surface aria-labelledby={`review-${step.id}`}>
      <SurfaceHeader
        actions={map ? (
          <a className="inline-flex items-center gap-1 text-xs font-medium text-teal-deep hover:underline" href={map} rel="noreferrer" target="_blank">
            Open the pin on a map
            <ExternalLink aria-hidden className="size-3" />
          </a>
        ) : undefined}
        description={missing ? `${missing} of ${rows.length} not given` : "Everything answered"}
        id={`review-${step.id}`}
        title={step.title}
      />
      <div className="divide-y divide-line">
        {groups.map((group, index) => (
          <div className="px-4 py-3" key={group.title ?? index}>
            {group.title ? <h3 className="mb-2 text-xs font-semibold text-ink-soft">{group.title}</h3> : null}
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {group.rows.map((row) => <Answer key={row.name} row={row} />)}
            </dl>
          </div>
        ))}
      </div>
    </Surface>
  );
}

function Answer({ row }: { readonly row: ReviewRow }) {
  const list = Array.isArray(row.value) ? row.value : null;
  const wide = row.prose || (list !== null && list.length > 3);
  return (
    <div className={cn("min-w-0", wide && "sm:col-span-2")}>
      <dt className="text-xs text-muted">{row.label}</dt>
      <dd className="mt-0.5 text-sm text-ink">
        {row.value === null ? (
          <span className={row.required ? "font-medium text-heritage" : "text-muted"}>{row.required ? "Missing — required" : "Not given"}</span>
        ) : list ? (
          <ul className="flex flex-wrap gap-1.5">
            {list.map((item) => (
              <li className="rounded border border-line bg-sand px-1.5 py-0.5 text-xs text-ink-soft" key={item}>{item}</li>
            ))}
          </ul>
        ) : row.href ? (
          <a className="break-all text-teal-deep hover:underline" href={row.href} rel="noreferrer" target="_blank">{row.value}</a>
        ) : (
          <span className={cn("break-words", row.prose && "whitespace-pre-line")}>{row.value}</span>
        )}
      </dd>
    </div>
  );
}

/** Rooms: each as the traveller's card shows it. */
function ItemsStep({ step, items, empty, children }: {
  readonly step: ListingStep;
  readonly items: readonly ReviewItem[];
  readonly empty: string;
  readonly children: (item: ReviewItem) => React.ReactNode;
}) {
  return (
    <Surface aria-labelledby={`review-${step.id}`}>
      <SurfaceHeader description={items.length ? `${items.length} added` : "None added"} id={`review-${step.id}`} title={step.title} />
      {items.length ? (
        <ul className="flex flex-col gap-3 p-4">
          {items.map((item) => <li key={item.id}>{children(item)}</li>)}
        </ul>
      ) : (
        <p className="px-4 py-6 text-center text-sm text-heritage">{empty}</p>
      )}
    </Surface>
  );
}

/** The pin on OpenStreetMap, when it has one. */
function mapLink(values: FormValues): string | null {
  const lat = Number(values.latitude);
  const lng = Number(values.longitude);
  if (!values.latitude || !values.longitude || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;
}
