"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Loader2, Upload, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InterestGroupResponse } from "@/features/catalog/api/contracts";
import { useGetInterestGroupsQuery, useUpdateInterestGroupMutation } from "@/features/catalog/api/interest-groups-api";
import { IMAGE_ACCEPT, MAX_IMAGE_BYTES } from "@/features/catalog/media-upload";
import { mediaPath, type ReferenceOption } from "@/features/catalog/resource";
import { useUploadText } from "@/features/catalog/use-image-upload";
import { useUploadMedia } from "@/features/media/api/media-api";
import { useApiErrorMessage } from "@/store/api/api-error";
import { cn } from "@/lib/utils";

interface InterestGroupPickerProps {
  readonly options: readonly ReferenceOption[];
  readonly chosen: ReadonlySet<string>;
  readonly multiple: boolean;
  readonly onToggle: (value: string) => void;
  readonly labelledBy?: string;
  readonly describedBy?: string;
  readonly invalid?: boolean;
  /** A group's one line, shown on hover. */
  readonly hintOf: (option: ReferenceOption) => string;
  /** The icon standing in for a group with no picture. */
  readonly iconOf: (option: ReferenceOption) => LucideIcon;
}

/** The interest groups as cards: a card picks the group, Change gives the group a new picture at once. */
export function InterestGroupPicker({ options, chosen, multiple, onToggle, labelledBy, describedBy, invalid, hintOf, iconOf }: InterestGroupPickerProps) {
  const t = useTranslations("catalog.interestGroups");
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
    <div className="flex flex-col gap-2">
      <div
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        aria-labelledby={labelledBy}
        className="grid grid-cols-2 gap-2 sm:grid-cols-3"
        role={multiple ? "group" : "radiogroup"}
      >
        {options.map((option) => {
          const group = groupOf.get(option.value);
          const selected = chosen.has(option.value);
          const Icon = iconOf(option);
          return (
            <div
              className={cn(
                "flex flex-col items-center gap-2 rounded-lg border px-2 pt-3 pb-2.5 transition-colors",
                selected ? "border-teal bg-teal-soft/50 ring-1 ring-teal" : "border-line-strong bg-paper hover:bg-sand",
              )}
              key={option.value}
            >
              <button
                aria-checked={multiple ? undefined : selected}
                aria-pressed={multiple ? selected : undefined}
                className="flex w-full flex-col items-center gap-1.5 rounded-md text-center"
                onClick={() => onToggle(option.value)}
                role={multiple ? undefined : "radio"}
                title={hintOf(option)}
                type="button"
              >
                {group?.coverKey ? (
                  <Image alt="" className="size-16 object-contain" height={64} src={mediaPath(group.coverKey)} unoptimized width={64} />
                ) : (
                  <span aria-hidden className="grid size-16 place-items-center rounded-2xl bg-sand text-muted">
                    {groups.data ? <Icon className="size-6" strokeWidth={1.75} /> : null}
                  </span>
                )}
                <span className={cn("min-h-[2lh] text-sm leading-snug font-medium", selected ? "text-teal-deep" : "text-ink")}>{option.label}</span>
              </button>
              {group ? (
                <Button
                  aria-label={t("changeFor", { group: option.label })}
                  disabled={busy !== null}
                  onClick={() => choose(group, option.label)}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  {busy === group.id ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : <Upload aria-hidden className="size-3.5" />}
                  {busy === group.id ? t("uploading") : t("change")}
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>
      <p aria-live="polite" className={cn("text-sm", outcome?.failed ? "text-heritage" : "text-muted")}>
        {outcome?.text ?? t("note")}
      </p>
      <input accept={IMAGE_ACCEPT} className="hidden" onChange={(event) => replace(event.target.files?.[0])} ref={fileInput} type="file" />
    </div>
  );
}
