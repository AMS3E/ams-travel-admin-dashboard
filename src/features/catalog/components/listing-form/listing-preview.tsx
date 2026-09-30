"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageIcon, MapPin, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  mediaPath,
  statusOption,
  type FormValues,
  type ReferenceOptions,
  type ResourceDefinition,
} from "@/features/catalog/resource";
import { cn } from "@/lib/utils";

interface ListingPreviewProps {
  readonly definition: ResourceDefinition;
  readonly values: FormValues;
  readonly options: ReferenceOptions;
  readonly className?: string;
}

function text(value: FormValues[string] | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function price(amount: string, currency: string): string | null {
  const parsed = Number(amount);
  if (!amount || !Number.isFinite(parsed)) return null;
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: parsed % 1 ? 2 : 0,
    }).format(parsed);
  } catch {
    return `${parsed} ${currency}`.trim();
  }
}

/**
 * The listing roughly as a traveller's card shows it, redrawn as the form
 * fills in: cover, name, where it is, the pitch, and what it costs.
 */
export function ListingPreview({ definition, values, options, className }: ListingPreviewProps) {
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);
  const coverKey = text(values.coverKey);
  const cover = text(values.coverUrl) || (coverKey ? mediaPath(coverKey) : "");
  const showCover = Boolean(cover) && brokenSrc !== cover;

  const name = text(values.name) || `Untitled ${definition.label.toLowerCase()}`;
  const typeField = definition.fields.find((field) => field.name === "type");
  const type = typeField?.options?.find((option) => option.value === values.type)?.label;
  const place =
    options.destinations?.find((option) => option.value === values.destinationId)?.label ??
    options.provinces?.find((option) => option.value === values.provinceId)?.label ??
    null;
  const address = text(values.address);
  const pitch = text(values.shortDescription);
  const stars = Math.round(Number(values.starRating) || 0);
  const from = price(text(values.priceFrom), text(values.currency).toUpperCase());
  const range = text(values.priceRange);
  const firstCategory = (Array.isArray(values.categoryIds) ? values.categoryIds : [])
    .map((id) => options.categories?.find((option) => option.value === id)?.label)
    .find(Boolean);
  const status = statusOption(definition, typeof values.status === "string" ? values.status : null);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted">Preview</p>
        {status ? (
          <Badge dot tone={status.tone}>
            {status.label}
          </Badge>
        ) : null}
      </div>

      <article className="overflow-hidden rounded-lg border border-line bg-paper">
        <div className="relative aspect-16/10 bg-sand-deep">
          {showCover ? (
            <Image alt="" className="object-cover" fill onError={() => setBrokenSrc(cover)} sizes="272px" src={cover} unoptimized />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted">
              <ImageIcon aria-hidden className="size-5" strokeWidth={1.75} />
              <span className="text-2xs">No cover photo</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5 p-3">
          {type || firstCategory ? <p className="text-2xs font-medium text-muted">{type ?? firstCategory}</p> : null}
          <div className="flex items-start justify-between gap-2">
            <h3 className={cn("text-sm leading-snug font-semibold", text(values.name) ? "text-ink" : "text-muted")}>{name}</h3>
            {stars ? (
              <span aria-label={`${stars} stars`} className="flex shrink-0 gap-px pt-0.5">
                {Array.from({ length: stars }, (_, index) => (
                  <Star aria-hidden className="size-3 fill-gold text-gold" key={index} />
                ))}
              </span>
            ) : null}
          </div>
          {place || address ? (
            <p className="flex items-start gap-1 text-xs text-muted">
              <MapPin aria-hidden className="mt-0.5 size-3 shrink-0" />
              <span className="line-clamp-2">{[address, place].filter(Boolean).join(" · ")}</span>
            </p>
          ) : null}
          <p className={cn("line-clamp-3 text-xs leading-relaxed", pitch ? "text-ink-soft" : "text-muted/80")}>
            {pitch || "The short description appears here."}
          </p>
          {from || range || values.isFeatured === true || values.isLocalSpecialty === true ? (
            <div className="mt-1 flex items-center justify-between gap-2 border-t border-line pt-2">
              <span className="flex flex-wrap gap-1">
                {values.isFeatured === true ? <Badge tone="info">Featured</Badge> : null}
                {values.isLocalSpecialty === true ? <Badge>Local speciality</Badge> : null}
              </span>
              {from ? (
                <span className="text-xs text-muted">
                  From <span className="font-semibold text-ink">{from}</span>
                </span>
              ) : range ? (
                <span className="text-xs font-semibold text-ink">{range}</span>
              ) : null}
            </div>
          ) : null}
        </div>
      </article>
    </div>
  );
}
