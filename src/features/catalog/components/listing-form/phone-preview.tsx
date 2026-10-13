"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import MarkdownIt from "markdown-it";
import { ArrowLeft, Heart, ImageIcon, Images, MapPin, Quote, Share, Tag } from "lucide-react";
import { mediaPath, type FormValues, type ReferenceOption, type ReferenceOptions, type ResourceDefinition } from "@/features/catalog/resource";
import { cn } from "@/lib/utils";

/*
 * A listing's page as the app shows it, redrawn as the form fills in: the
 * cover with its gallery dots, the name, what it is in a few words, an
 * attraction's slogan, the long text and the map with its pin. What travellers
 * add — ratings, reviews, nearby places — is not here, since the form cannot
 * fill it. A stay and a place to eat are drawn on the attraction's screen,
 * until the app has screens of their own to draw from.
 *
 * Drawn after the app's design, not the dashboard's: its purple, its cards.
 */

interface PhonePreviewProps {
  readonly definition: ResourceDefinition;
  readonly values: FormValues;
  readonly options: ReferenceOptions;
  /** Photos in the gallery, the cover among them, for the dots under the cover. */
  readonly photos: number;
  readonly className?: string;
}

const PURPLE = "#6b4ee6";
/* About is Markdown. Raw HTML in it is shown as text, never drawn. */
const markdown = new MarkdownIt({ html: false, linkify: false, breaks: false });
const SCREEN_WIDTH = 324;
/** The map card: a little taller than wide, as the app has it. */
const MAP_WIDTH = SCREEN_WIDTH - 32;
const MAP_HEIGHT = 250;
const TILE = 256;
const ZOOM = 15;

function text(value: FormValues[string] | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function coordinate(value: FormValues[string] | undefined, limit: number): number | null {
  const parsed = Number(text(value));
  return text(value) && Number.isFinite(parsed) && Math.abs(parsed) <= limit ? parsed : null;
}

/** The map tile a point falls on, as fractional tile coordinates (the whole part names the tile). */
function tileOf(latitude: number, longitude: number): { readonly x: number; readonly y: number } {
  const scale = 2 ** ZOOM;
  const radians = (latitude * Math.PI) / 180;
  return {
    x: ((longitude + 180) / 360) * scale,
    y: ((1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2) * scale,
  };
}

/**
 * The map around the pin as a still: the nine tiles around the point, laid so
 * the point sits in the middle. The same tiles the form's map draws, with
 * nothing to drag or zoom.
 */
function StillMap({ latitude, longitude, name, cover }: { latitude: number; longitude: number; name: string; cover: string }) {
  const { x, y } = tileOf(latitude, longitude);
  const centre = { x: Math.floor(x), y: Math.floor(y) };
  const left = MAP_WIDTH / 2 - (x - centre.x + 1) * TILE;
  const top = MAP_HEIGHT / 2 - (y - centre.y + 1) * TILE;
  const tiles = [-1, 0, 1].flatMap((dy) => [-1, 0, 1].map((dx) => ({ dx, dy })));
  return (
    <div className="relative overflow-hidden bg-[#e8eef5]" style={{ width: MAP_WIDTH, height: MAP_HEIGHT }}>
      <div aria-hidden className="absolute" style={{ left, top, width: TILE * 3, height: TILE * 3 }}>
        {tiles.map(({ dx, dy }) => (
          <Image
            alt=""
            className="absolute"
            height={TILE}
            key={`${dx}:${dy}`}
            src={`https://tile.openstreetmap.org/${ZOOM}/${centre.x + dx}/${centre.y + dy}.png`}
            style={{ left: (dx + 1) * TILE, top: (dy + 1) * TILE }}
            unoptimized
            width={TILE}
          />
        ))}
      </div>
      {/* The pin: the cover in a white ring, the name beneath, as the app draws it. */}
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-[60%] flex-col items-center">
        <span className="relative grid size-11 place-items-center overflow-hidden rounded-full border-[3px] border-white bg-[#d7ccf8] shadow-md">
          {cover ? <Image alt="" className="object-cover" fill sizes="44px" src={cover} unoptimized /> : <MapPin aria-hidden className="size-5 text-[#6b4ee6]" />}
        </span>
        <span className="mt-1 size-1.5 rounded-full bg-[#6b4ee6]" />
        <span className="mt-0.5 rounded bg-white/80 px-1 text-[10px] font-bold tracking-wide text-[#1d1d24] uppercase">{name}</span>
      </div>
      <span className="absolute right-1 bottom-0.5 text-[8px] text-[#555]">© OpenStreetMap</span>
    </div>
  );
}

export function PhonePreview({ definition, values, options, photos, className }: PhonePreviewProps) {
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);
  const coverKey = text(values.coverKey);
  const cover = text(values.coverUrl) || (coverKey ? mediaPath(coverKey) : "");
  const showCover = Boolean(cover) && brokenSrc !== cover;

  const name = text(values.name);
  const slogan = text(values.slogan);
  const sloganBy = text(values.sloganBy);
  const description = text(values.description);
  const story = useMemo(() => (description ? markdown.render(description) : ""), [description]);
  const labelsOf = (field: string, list: readonly ReferenceOption[] | undefined): string[] =>
    (Array.isArray(values[field]) ? (values[field] as readonly string[]) : [])
      .map((id) => list?.find((option) => option.value === id)?.label)
      .filter((label): label is string => Boolean(label));
  /* What it is, in a few words: an attraction's categories; a stay's or a place's kinds, from the taxonomy. */
  const attraction = definition.key === "destinations";
  const categories = attraction ? labelsOf("categoryIds", options.categories) : labelsOf("interestIds", options.interests);
  const asksSlogan = definition.fields.some((field) => field.name === "slogan");
  const untitled = attraction ? "Untitled destination" : definition.key === "stays" ? "Untitled stay" : "Untitled place";
  const latitude = coordinate(values.latitude, 90);
  const longitude = coordinate(values.longitude, 180);
  const dots = Math.min(8, Math.max(1, photos));

  return (
    <div
      className={cn("rounded-[2.4rem] border-[6px] border-[#2a2a2e] bg-[#2a2a2e] shadow-lg", className)}
      style={{ width: SCREEN_WIDTH + 12 }}
    >
      <div className="relative overflow-hidden rounded-[2rem] bg-white" style={{ width: SCREEN_WIDTH }}>
        {/* The cover, with the app's bar and buttons over it. */}
        <div className="relative aspect-[6/5] bg-[#d7ccf8]">
          {showCover ? (
            <Image alt="" className="object-cover" fill onError={() => setBrokenSrc(cover)} sizes="324px" src={cover} unoptimized />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-[#6b4ee6]">
              <ImageIcon aria-hidden className="size-6" strokeWidth={1.5} />
              <span className="text-[11px]">The cover photo goes here</span>
            </div>
          )}
          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-6 pt-2.5 text-[12px] font-semibold text-white drop-shadow">
            <span>9:41</span>
            <span aria-hidden className="flex items-center gap-1">
              <span className="flex items-end gap-px">
                <span className="h-1 w-0.5 rounded-sm bg-white" />
                <span className="h-1.5 w-0.5 rounded-sm bg-white" />
                <span className="h-2 w-0.5 rounded-sm bg-white" />
                <span className="h-2.5 w-0.5 rounded-sm bg-white" />
              </span>
              <span className="ml-1 h-2.5 w-5 rounded-[3px] border border-white/90 p-px">
                <span className="block h-full w-4/5 rounded-[1px] bg-white" />
              </span>
            </span>
          </div>
          <div className="absolute inset-x-0 top-8 flex items-center justify-between px-3">
            <span className="grid size-8 place-items-center rounded-full bg-white/80 text-[#1d1d24]">
              <ArrowLeft aria-hidden className="size-4" />
            </span>
            <span className="flex gap-1.5">
              <span className="grid size-8 place-items-center rounded-full bg-white/80 text-[#1d1d24]">
                <Heart aria-hidden className="size-4" />
              </span>
              <span className="grid size-8 place-items-center rounded-full bg-white/80 text-[#1d1d24]">
                <Share aria-hidden className="size-4" />
              </span>
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-7 flex items-center justify-between px-4">
            <span aria-label={`${dots} photos`} className="flex items-center gap-1">
              {Array.from({ length: dots }, (_, index) => (
                <span className={cn("rounded-full", index === 0 ? "size-1.5 bg-[#6b4ee6]" : "size-1 bg-white/80")} key={index} />
              ))}
            </span>
            <span className="flex items-center gap-1 rounded-md bg-white/70 px-2 py-1 text-[10px] font-medium text-[#1d1d24]">
              <Images aria-hidden className="size-3" />
              Gallery
            </span>
          </div>
        </div>

        {/* The page itself, rising over the cover. */}
        <div className="relative -mt-5 flex flex-col gap-3 rounded-t-[1.4rem] bg-white px-4 pt-4 pb-5">
          <h3 className={cn("text-[19px] leading-tight font-bold", name ? "text-[#1d1d24]" : "text-[#9a9aa6]")}>{name || untitled}</h3>

          <div className="flex flex-wrap gap-1.5">
            {categories.length ? (
              categories.slice(0, 3).map((label) => (
                <span className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-white" key={label} style={{ backgroundColor: PURPLE }}>
                  <Tag aria-hidden className="size-3" />
                  {label}
                </span>
              ))
            ) : (
              <span className="rounded-full border border-dashed border-[#c9bdf0] px-2.5 py-1 text-[11px] text-[#9a9aa6]">
                {attraction ? "Categories appear here" : "Its type appears here"}
              </span>
            )}
            {categories.length > 3 ? (
              <span className="rounded-full px-2.5 py-1 text-[11px] font-medium text-white" style={{ backgroundColor: PURPLE }}>
                +{categories.length - 3}
              </span>
            ) : null}
          </div>

          {asksSlogan ? (
            <div className="flex gap-2 rounded-xl border border-[#cdbdf6] bg-[#f6f2ff] px-3 py-2.5">
              <Quote aria-hidden className="mt-0.5 size-4 shrink-0 scale-x-[-1] text-[#8a6ff0]" />
              <p className={cn("text-[12px] leading-snug", slogan ? "text-[#4b2fb5]" : "text-[#9a9aa6]")}>
                <span className="italic">{slogan ? `“${slogan}”` : "A line someone said about it appears here."}</span>
                {slogan && sloganBy ? <span className="mt-0.5 block font-semibold not-italic">— {sloganBy}</span> : null}
              </p>
            </div>
          ) : null}

          <div className="rounded-xl border border-[#d9ccf7] px-3 py-2.5 text-[12px] leading-snug">
            {description ? (
              <div className="text-[#3b3b45]">
                <div
                  className="line-clamp-5 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-[#cdbdf6] [&_blockquote]:pl-2 [&_em]:italic [&_h1]:text-[13px] [&_h1]:font-bold [&_h2]:text-[13px] [&_h2]:font-bold [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-4 [&_p+p]:mt-1.5 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-4"
                  dangerouslySetInnerHTML={{ __html: story }}
                />
                <span className="font-medium" style={{ color: PURPLE }}>
                  Read more
                </span>
              </div>
            ) : (
              <p className="text-[#9a9aa6]">The full story appears here.</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <h4 className="text-[14px] font-bold text-[#1d1d24]">How to get there</h4>
            <div className="overflow-hidden rounded-xl border border-[#cdbdf6]">
              {latitude !== null && longitude !== null ? (
                <StillMap cover={showCover ? cover : ""} latitude={latitude} longitude={longitude} name={name || "This place"} />
              ) : (
                <div className="flex flex-col items-center justify-center gap-1 bg-[#f6f2ff] text-[#9a9aa6]" style={{ width: MAP_WIDTH, height: 120 }}>
                  <MapPin aria-hidden className="size-5" strokeWidth={1.5} />
                  <span className="text-[11px]">Drop the map pin to see it here</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
