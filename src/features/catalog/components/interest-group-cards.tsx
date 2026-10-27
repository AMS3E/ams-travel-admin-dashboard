"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  BedDouble, Landmark, LayoutGrid, Loader2, Route, Shapes, Tent, Upload, UtensilsCrossed, Waves, type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InterestGroupResponse } from "@/features/catalog/api/contracts";
import { useGetInterestGroupsQuery, useUpdateInterestGroupMutation } from "@/features/catalog/api/interest-groups-api";
import type { ListChip } from "@/features/catalog/components/list-chips";
import { IMAGE_ACCEPT, MAX_IMAGE_BYTES } from "@/features/catalog/media-upload";
import { mediaPath } from "@/features/catalog/resource";
import { useUploadText } from "@/features/catalog/use-image-upload";
import { useUploadMedia } from "@/features/media/api/media-api";
import { useApiErrorMessage } from "@/store/api/api-error";
import { cn } from "@/lib/utils";
import type englishForms from "@locales/en/forms.json";

/* Each group's icon while it has no picture, and its line under `forms.tiles.hints`. */
const GROUPS: Readonly<Record<string, { readonly icon: LucideIcon; readonly hint: keyof typeof englishForms.tiles.hints }>> = {
  "Attraction Sites": { icon: Landmark, hint: "attractionSites" },
  Stays: { icon: BedDouble, hint: "stays" },
  Food: { icon: UtensilsCrossed, hint: "food" },
  Water: { icon: Waves, hint: "water" },
  "Activities & Experiences": { icon: Tent, hint: "activities" },
  "Tourism Corridors": { icon: Route, hint: "corridors" },
};

interface InterestGroupCardsProps {
  readonly label: string;
  readonly allLabel: string;
  readonly total: number;
  readonly chips: readonly ListChip[];
  readonly active: string | null;
  /** The list's own path; a card adds `?group=`. */
  readonly path: string;
  readonly hint: string;
  /** Change is offered to those who manage interests. */
  readonly canChange: boolean;
}

/** The Interests page's groups as cards: a card shows only its interests, Change gives the group a new picture at once. */
export function InterestGroupCards({ label, allLabel, total, chips, active, path, hint, canChange }: InterestGroupCardsProps) {
  const t = useTranslations("catalog.interestGroups");
  const tiles = useTranslations("forms.tiles");
  const text = useUploadText();
  const errorMessage = useApiErrorMessage();
  const groups = useGetInterestGroupsQuery();
  const [update] = useUpdateInterestGroupMutation();
  const uploadMedia = useUploadMedia();
  const fileInput = useRef<HTMLInputElement>(null);
  const [target, setTarget] = useState<{ readonly group: InterestGroupResponse; readonly label: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<{ readonly failed: boolean; readonly text: string } | null>(null);
  const groupOf = new Map((groups.data ?? []).map((group) => [group.name, group]));
  const cards: readonly (Omit<ListChip, "value"> & { readonly value: string | null })[] = [
    { value: null, label: allLabel, count: total },
    ...chips,
  ];

  function choose(group: InterestGroupResponse, label: string) {
    setTarget({ group, label });
    fileInput.current?.click();
  }

  async function replace(file: File | undefined) {
    const picked = target;
    /* Let the same file be chosen again. */
    if (fileInput.current) fileInput.current.value = "";
    if (!file || !picked) return;
    const problem = text.problem(file) ?? (file.size > MAX_IMAGE_BYTES ? t("tooLarge", { name: file.name }) : null);
    if (problem) {
      setOutcome({ failed: true, text: problem });
      return;
    }
    setBusy(picked.group.id);
    setOutcome(null);
    try {
      /* Sent as it is: shrinking makes a JPEG, which would fill the picture's see-through corners. */
      const body = new FormData();
      body.set("file", file, file.name);
      body.set("category", "interest");
      const stored = await uploadMedia(body);
      await update({ id: picked.group.id, coverKey: stored.key }).unwrap();
      setOutcome({ failed: false, text: t("changed", { group: picked.label }) });
    } catch (error) {
      setOutcome({ failed: true, text: errorMessage(error) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <nav aria-label={label} className="flex flex-col gap-2">
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-2">
        {cards.map((card) => {
          const on = card.value === active;
          const group = card.value ? groupOf.get(card.value) : undefined;
          const known = card.value ? GROUPS[card.value] : undefined;
          const Icon = card.value === null ? LayoutGrid : (known?.icon ?? Shapes);
          /* The server's picture until the groups load, then the live one. */
          const picture = groups.data ? (group?.coverKey ? mediaPath(group.coverKey) : undefined) : card.image;
          return (
            <li
              className={cn(
                "flex flex-col gap-2 rounded-lg border px-2 pt-3 pb-2.5 transition-colors",
                on ? "border-teal bg-teal-soft/50 ring-1 ring-teal" : "border-line-strong bg-paper hover:bg-sand",
              )}
              key={card.value ?? "all"}
            >
              <Link
                aria-current={on ? "page" : undefined}
                className="flex flex-1 flex-col items-center gap-1 rounded-md text-center"
                href={card.value ? `${path}?group=${encodeURIComponent(card.value)}` : path}
                title={known ? tiles(`hints.${known.hint}`) : undefined}
              >
                {picture ? (
                  <Image alt="" className="size-14 object-contain" height={56} src={picture} unoptimized width={56} />
                ) : (
                  <span aria-hidden className="grid size-14 place-items-center rounded-2xl bg-sand text-muted">
                    <Icon className="size-6" strokeWidth={1.75} />
                  </span>
                )}
                <span className={cn("text-sm leading-snug font-medium", on ? "text-teal-deep" : "text-ink")}>{card.label}</span>
                <span className="text-xs text-muted tabular-nums">{t("count", { count: card.count })}</span>
              </Link>
              {canChange && group ? (
                <Button
                  aria-label={t("changeFor", { group: card.label })}
                  disabled={busy !== null}
                  onClick={() => choose(group, card.label)}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  {busy === group.id ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : <Upload aria-hidden className="size-3.5" />}
                  {busy === group.id ? t("uploading") : t("change")}
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-col gap-0.5 text-sm">
        <p className="text-muted">{hint}</p>
        <div aria-live="polite">
          {outcome ? <p className={outcome.failed ? "text-heritage" : "text-success"}>{outcome.text}</p> : null}
        </div>
      </div>
      <input accept={IMAGE_ACCEPT} className="hidden" onChange={(event) => replace(event.target.files?.[0])} ref={fileInput} type="file" />
    </nav>
  );
}
