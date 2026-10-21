"use client";

import { useMemo } from "react";
import Image from "next/image";
import { useFormatter, useTranslations } from "next-intl";
import { ArrowUpRight, ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Surface, SurfaceHeader } from "@/components/ui/surface";
import { WEEKDAYS } from "@/features/catalog/api/contracts";
import type { CatalogRecord } from "@/features/catalog/api/contracts";
import { useGetCatalogQuery, useGetReferenceOptionsQuery } from "@/features/catalog/api/catalog-api";
import { getResource } from "@/features/catalog/resources";
import { mediaPath, type ReferenceKey, type ResourceDefinition, type ResourceKey } from "@/features/catalog/resource";
import { useLocalizedDefinition } from "@/features/catalog/use-resource";
import { useDates } from "@/i18n/use-dates";
import type { PlaceResource } from "./destination-insight";

/* The marks the About editor writes, drawn as the phone preview draws them. */
const STORY_CLASSES =
  "text-sm leading-relaxed text-ink-soft [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-line [&_blockquote]:pl-3 [&_em]:italic [&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_p+p]:mt-2 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5";

const GALLERY: Readonly<Record<PlaceResource, ResourceKey>> = {
  destinations: "destination-media",
  stays: "stay-media",
  foods: "food-media",
  activities: "activity-media",
};

const text = (record: CatalogRecord | undefined, name: string): string | null => {
  const value = record?.[name];
  return typeof value === "string" && value.trim() ? value.trim() : null;
};
const ids = (record: CatalogRecord | undefined, name: string): readonly string[] => {
  const value = record?.[name];
  return Array.isArray(value) ? value.map(String) : [];
};
const number = (record: CatalogRecord | undefined, name: string): number | null => {
  const value = record?.[name];
  const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
};
const retired = (record: CatalogRecord): boolean => record.isActive === false || record.status === "INACTIVE";

/** The label an enum value reads as on the forms, in the reader's language. */
function optionLabel(definition: ResourceDefinition, field: string, value: string | null): string | null {
  if (!value) return null;
  return definition.fields.find((each) => each.name === field)?.options?.find((option) => option.value === value)?.label ?? value;
}

function useMoney(currency: string) {
  const format = useFormatter();
  return (value: number | null): string | null =>
    value == null
      ? null
      : format.number(value, { style: "currency", currency, maximumFractionDigits: Number.isInteger(value) ? 0 : 2 });
}

/** A labelled row of chips; nothing when the list is empty. */
function ChipRow({ label, names }: { readonly label: string; readonly names: readonly string[] }) {
  if (!names.length) return null;
  return (
    <div>
      <p className="text-xs font-medium text-muted">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {names.map((name) => (
          <Badge key={name} tone="neutral">{name}</Badge>
        ))}
      </div>
    </div>
  );
}

/**
 * About: the listing's story as the app tells it, then what it is shelved
 * under — its interests, and for an attraction its regions, categories and tags.
 */
export function AboutPanel({ record, resource }: { readonly record: CatalogRecord; readonly resource: PlaceResource }) {
  const t = useTranslations("stats.detail.content");
  const { data: options } = useGetReferenceOptionsQuery({ resource, include: "fields" });
  const names = (field: string, ref: ReferenceKey): readonly string[] => {
    const labels = new Map((options?.[ref] ?? []).map((option) => [option.value, option.label]));
    return ids(record, field).flatMap((id) => (labels.get(id) ? [labels.get(id)!] : []));
  };
  const story = text(record, "description");
  return (
    <Surface aria-label={t("about")}>
      <SurfaceHeader title={t("about")} />
      <div className="flex flex-col gap-4 p-4">
        {story ? (
          <div className={STORY_CLASSES} dangerouslySetInnerHTML={{ __html: story }} />
        ) : (
          <p className="text-sm text-muted">{t("nothingWritten")}</p>
        )}
        <ChipRow label={t("interests")} names={names("interestIds", "interests")} />
        {resource === "destinations" ? (
          <>
            <ChipRow label={t("regions")} names={names("tourismRegionIds", "tourism-regions")} />
            <ChipRow label={t("categories")} names={names("categoryIds", "categories")} />
            <ChipRow label={t("tags")} names={names("tagIds", "tags")} />
          </>
        ) : null}
        {resource === "stays" ? <ChipRow label={t("facilities")} names={names("amenities", "amenities")} /> : null}
      </div>
    </Surface>
  );
}

/** The photos the gallery holds, newest-made order as the API lists them. */
export function PhotosPanel({ id, resource }: { readonly id: string; readonly resource: PlaceResource }) {
  const t = useTranslations("stats.detail.content");
  const format = useFormatter();
  const { data } = useGetCatalogQuery(GALLERY[resource]);
  const photos = useMemo(
    () =>
      (data ?? [])
        .filter((row) => String(row.ownerId ?? "") === id)
        .map((row) => {
          const key = String(row.mediaKey ?? "");
          return { key, url: String(row.mediaUrl ?? "") || mediaPath(key) };
        })
        .filter((photo) => photo.url),
    [data, id],
  );
  return (
    <Surface aria-label={t("photos")}>
      <SurfaceHeader
        actions={photos.length ? <span className="text-xs text-muted tabular-nums">{format.number(photos.length)}</span> : null}
        title={t("photos")}
      />
      {photos.length ? (
        <ul className="flex flex-wrap gap-2 p-4">
          {photos.slice(0, 12).map((photo) => (
            <li key={photo.key}>
              <Image alt="" className="size-20 rounded-md object-cover ring-1 ring-line" height={80} src={photo.url} unoptimized width={80} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-6 text-center text-sm text-muted">{t("noPhotos")}</p>
      )}
    </Surface>
  );
}

/** A stay's rooms: each type with its guests, size and the prices the quote reads. */
export function RoomsPanel({ stayId, currency }: { readonly stayId: string; readonly currency: string }) {
  const t = useTranslations("stats.detail.content");
  const format = useFormatter();
  const money = useMoney(currency);
  const definition = useLocalizedDefinition(getResource("stay-rooms"));
  const { data } = useGetCatalogQuery("stay-rooms");
  const rooms = useMemo(
    () =>
      (data ?? [])
        .filter((row) => String(row.stayId ?? "") === stayId)
        .toSorted((a, b) => (number(a, "sortOrder") ?? 0) - (number(b, "sortOrder") ?? 0)),
    [data, stayId],
  );
  return (
    <Surface aria-label={t("rooms")}>
      <SurfaceHeader
        actions={rooms.length ? <span className="text-xs text-muted tabular-nums">{format.number(rooms.length)}</span> : null}
        description={t("roomsDescription")}
        title={t("rooms")}
      />
      {rooms.length ? (
        <ul className="divide-y divide-line">
          {rooms.map((room) => {
            const photo = ids(room, "photoKeys")[0];
            const gone = retired(room);
            const night = money(number(room, "pricePerNight"));
            const weekend = money(number(room, "weekendPrice"));
            const adults = number(room, "maxAdults");
            const children = number(room, "maxChildren");
            const size = number(room, "sizeSqm");
            return (
              <li className={`flex flex-wrap items-start gap-3 p-4 ${gone ? "opacity-60" : ""}`} key={room.id}>
                {photo ? (
                  <Image alt="" className="size-16 shrink-0 rounded-md object-cover ring-1 ring-line" height={64} src={mediaPath(photo)} unoptimized width={64} />
                ) : (
                  <span className="grid size-16 shrink-0 place-items-center rounded-md bg-sand-deep text-muted">
                    <ImageIcon aria-hidden className="size-5" strokeWidth={1.75} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
                    {text(room, "name")}
                    {gone ? <Badge tone="neutral">{t("retired")}</Badge> : null}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {[
                      optionLabel(definition, "roomType", text(room, "roomType")),
                      adults != null ? t("adults", { count: adults }) : null,
                      children ? t("children", { count: children }) : null,
                      size != null ? t("sizeSqm", { size: format.number(size) }) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {room.breakfastIncluded === true ? <Badge className="mt-1.5" tone="success">{t("breakfast")}</Badge> : null}
                </div>
                {night ? (
                  <div className="text-right">
                    <p className="text-sm font-semibold text-ink tabular-nums">{night}</p>
                    <p className="text-xs text-muted">{t("perNight")}</p>
                    {weekend ? <p className="mt-0.5 text-xs text-muted tabular-nums">{t("weekendPrice", { price: weekend })}</p> : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="px-4 py-6 text-center text-sm text-muted">{t("noRooms")}</p>
      )}
    </Surface>
  );
}

const CONTACTS = [
  { field: "phone", word: "contactPhone", href: (value: string) => `tel:${value.replace(/\s+/g, "")}` },
  { field: "contactEmail", word: "contactEmail", href: (value: string) => `mailto:${value}` },
  { field: "website", word: "contactWebsite", href: (value: string) => (value.startsWith("http") ? value : `https://${value}`) },
  { field: "telegram", word: "contactTelegram", href: (value: string) => (value.startsWith("http") ? value : `https://t.me/${value.replace(/^@/, "")}`) },
  { field: "whatsapp", word: "contactWhatsapp", href: (value: string) => (value.startsWith("http") ? value : null) },
  { field: "facebookUrl", word: "contactFacebook", href: (value: string) => (value.startsWith("http") ? value : `https://${value}`) },
] as const;

/** The day the place's clock is on, as the hours grid keys days. */
function cambodiaToday(): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "Asia/Phnom_Penh" }).format(new Date()).toLowerCase().slice(0, 3);
}

/**
 * At a glance: the small facts the listing carries — its type, stars, hours,
 * prices, payment and contact — each row only when the form has an answer.
 */
export function FactsPanel({ record, resource }: { readonly record: CatalogRecord; readonly resource: PlaceResource }) {
  const t = useTranslations("stats.detail.content");
  const { dates } = useDates();
  const definition = useLocalizedDefinition(getResource(resource));
  const money = useMoney(text(record, "currency") ?? "USD");

  const rows: { readonly label: string; readonly value: React.ReactNode }[] = [];
  const type = optionLabel(definition, "type", text(record, "type"));
  if (type) rows.push({ label: t("type"), value: type });
  const stars = number(record, "starRating");
  if (stars) rows.push({ label: t("starsLabel"), value: t("stars", { count: stars }) });
  const checkIn = text(record, "checkInFrom");
  if (checkIn) rows.push({ label: t("checkInFrom"), value: checkIn.slice(0, 5) });
  const checkOut = text(record, "checkOutUntil");
  if (checkOut) rows.push({ label: t("checkOutUntil"), value: checkOut.slice(0, 5) });
  const priceRange = optionLabel(definition, "priceRange", text(record, "priceRange"));
  if (priceRange) rows.push({ label: t("priceRange"), value: priceRange });
  const meal = money(number(record, "averageMealPrice"));
  if (meal) rows.push({ label: t("averageMeal"), value: meal });
  const payments = ids(record, "paymentMethods")
    .map((value) => optionLabel(definition, "paymentMethods", value))
    .filter(Boolean);
  if (payments.length) rows.push({ label: t("payments"), value: payments.join(", ") });
  for (const contact of CONTACTS) {
    const value = text(record, contact.field);
    if (!value) continue;
    const href = contact.href(value);
    rows.push({
      label: t(contact.word),
      value: href ? (
        <a className="break-all text-teal-deep hover:underline" href={href} rel="noreferrer" target="_blank">
          {value}
        </a>
      ) : (
        value
      ),
    });
  }

  const hoursValue = record.openingHours;
  const hours = hoursValue && typeof hoursValue === "object" && !Array.isArray(hoursValue) ? (hoursValue as Record<string, unknown>) : null;
  const anyHours = hours && WEEKDAYS.some((day) => typeof hours[day] === "string" && hours[day]);
  const today = cambodiaToday();
  const latitude = number(record, "latitude");
  const longitude = number(record, "longitude");

  if (!rows.length && !anyHours && latitude == null) return null;
  return (
    <Surface aria-label={t("facts")}>
      <SurfaceHeader title={t("facts")} />
      <div className="flex flex-col gap-3 p-4">
        {rows.length ? (
          <dl className="flex flex-col gap-1.5">
            {rows.map((row, index) => (
              <div className="flex items-baseline justify-between gap-3" key={index}>
                <dt className="shrink-0 text-xs text-muted">{row.label}</dt>
                <dd className="text-right text-sm text-ink-soft">{row.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {anyHours ? (
          <div>
            <p className="text-xs font-medium text-muted">{t("hours")}</p>
            <dl className="mt-1.5 flex flex-col gap-1">
              {WEEKDAYS.map((day, index) => {
                const line = typeof hours![day] === "string" ? (hours![day] as string) : "";
                const now = day === today;
                return (
                  <div className={`flex items-baseline justify-between gap-3 ${now ? "font-semibold text-ink" : "text-ink-soft"}`} key={day}>
                    <dt className="text-xs">{dates.weekdays[(index + 1) % 7]}</dt>
                    <dd className="text-xs tabular-nums">{!line || line === "closed" ? t("closed") : line}</dd>
                  </div>
                );
              })}
            </dl>
          </div>
        ) : null}
        {latitude != null && longitude != null ? (
          <a
            className="inline-flex items-center gap-1 text-xs font-medium text-teal-deep hover:underline"
            href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`}
            rel="noreferrer"
            target="_blank"
          >
            {t("mapPin")}
            <ArrowUpRight aria-hidden className="size-3" />
          </a>
        ) : null}
      </div>
    </Surface>
  );
}
