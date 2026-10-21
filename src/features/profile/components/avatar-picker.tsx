"use client";

import { useState } from "react";
import Image from "next/image";
import { Loader2, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { initials } from "@/features/auth/types";
import { cn } from "@/lib/utils";

/** A round photo, or the initials when there is none or it fails to load. */
export function ProfileAvatar({
  name,
  src,
  className,
}: {
  readonly name: string;
  readonly src: string;
  readonly className?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  /*
   * An uploaded photo's link is origin-relative (/api/v1/media/files/…), which this
   * dashboard proxies to the API — so a root path shows too, not only a full
   * address. A protocol-relative //host is not taken for one.
   */
  const showPhoto = /^(https?:\/\/|\/(?!\/))/i.test(src) && src !== failedUrl;

  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full bg-sand-deep font-semibold text-ink-soft",
        className,
      )}
    >
      {showPhoto ? (
        <Image
          alt=""
          className="size-full object-cover"
          height={160}
          onError={() => setFailedUrl(src)}
          src={src}
          unoptimized
          width={160}
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}

/** What the drop zone says. Written for your own photo unless told otherwise. */
export interface AvatarPickerLabels {
  readonly empty: string;
  readonly filled: string;
  readonly uploading: string;
  readonly instructions: string;
}

interface AvatarPickerProps {
  readonly id: string;
  readonly name: string;
  /** The photo's media key — what the form saves. Empty when there is none. */
  readonly value: string;
  /** Where to show the photo from: the account's `avatarUrl`, or the upload's address. */
  readonly previewUrl: string;
  /** Someone else's photo — a customer's, on the Users screen — needs other words; your own photo's are the default. */
  readonly labels?: AvatarPickerLabels;
  /** The photo is removed. */
  readonly onRemove: () => void;
  /** Opens the file dialog the editor owns, which the cover's camera button opens too. */
  readonly onChoose: () => void;
  readonly onFile: (file: File) => void;
  readonly uploading: boolean;
  readonly failure: string | null;
  readonly describedBy?: string;
  readonly invalid?: boolean;
}

/**
 * The photo, and the ways to change it.
 *
 * Dropping or choosing a file uploads it to the avatar folder straight away and
 * puts its key in the form; nothing is saved to the profile until Save. A photo
 * is stored by its key alone, so there is no address to paste.
 */
export function AvatarPicker({
  id,
  name,
  value,
  previewUrl,
  labels: given,
  onRemove,
  onChoose,
  onFile,
  uploading,
  failure,
  describedBy,
  invalid,
}: AvatarPickerProps) {
  const t = useTranslations("profile.photo");
  const [dragging, setDragging] = useState(false);
  const labels: AvatarPickerLabels = given ?? {
    empty: t("empty"),
    filled: t("filled"),
    uploading: t("uploading"),
    instructions: t("instructions"),
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        className={cn(
          "flex flex-col items-center gap-4 rounded-lg border border-dashed p-4 text-center transition-colors sm:flex-row sm:text-left",
          dragging ? "border-teal bg-teal-soft/70" : "border-line-strong bg-sand",
        )}
        onDragLeave={() => setDragging(false)}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file) onFile(file);
        }}
      >
        <ProfileAvatar className="size-20 text-xl ring-4 ring-paper" name={name} src={value ? previewUrl : ""} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">
            {uploading ? labels.uploading : dragging ? t("drop") : value ? labels.filled : labels.empty}
          </p>
          <p className="mt-0.5 text-xs text-muted">{labels.instructions}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
            <Button
              aria-describedby={describedBy}
              aria-invalid={invalid}
              disabled={uploading}
              id={id}
              onClick={onChoose}
              size="sm"
              type="button"
              variant="secondary"
            >
              {uploading ? (
                <Loader2 aria-hidden className="size-3.5 animate-spin" />
              ) : (
                <Upload aria-hidden className="size-3.5" />
              )}
              {value ? t("replace") : t("upload")}
            </Button>
            {value ? (
              <Button
                disabled={uploading}
                onClick={onRemove}
                size="sm"
                type="button"
                variant="dangerGhost"
              >
                <Trash2 aria-hidden className="size-3.5" />
                {t("remove")}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {failure ? (
        <p className="text-xs font-semibold text-heritage" role="alert">
          {failure}
        </p>
      ) : null}
    </div>
  );
}
