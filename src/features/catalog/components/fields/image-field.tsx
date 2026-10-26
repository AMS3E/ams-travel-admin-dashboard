"use client";

import type { ImageCategory } from "@/features/catalog/image-category";
import { useRef, useState } from "react";
import Image from "next/image";
import { ImageOff, Loader2, Upload, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IMAGE_ACCEPT, MAX_IMAGE_BYTES, prepareImage } from "@/features/catalog/media-upload";
import { mediaPath } from "@/features/catalog/resource";
import { useUploadText } from "@/features/catalog/use-image-upload";
import { useUploadMedia } from "@/features/media/api/media-api";
import { useApiErrorMessage } from "@/store/api/api-error";

interface ImageFieldProps {
  readonly id: string;
  /** The MinIO object key the row stores, e.g. `destination/{uuid}/{uuid}.jpg`. */
  readonly value: string;
  /** What to show for it: the row's `…Url`, or the upload's `uri` right after uploading. */
  readonly previewUrl?: string;
  /** A new key, and the address to preview it by. Both empty when the picture is removed. */
  readonly onChange: (key: string, previewUrl: string) => void;
  readonly category: ImageCategory;
  readonly describedBy?: string;
  readonly invalid?: boolean;
  readonly onUploadingChange?: (uploading: boolean) => void;
  /** A drawn icon: previewed whole on white rather than cropped like a photograph. */
  readonly drawn?: boolean;
}

/**
 * An upload button, and the key the upload produced.
 *
 * The row stores the object key, never a URL — the API builds the URL from it
 * on every read, so a picture survives a change of host. The key box stays
 * editable so a picture already in the bucket (the seed library under
 * `general/…`) can be reused without uploading it again.
 */
export function ImageField({
  id,
  value,
  previewUrl,
  onChange,
  category,
  describedBy,
  invalid,
  onUploadingChange,
  drawn = false,
}: ImageFieldProps) {
  const t = useTranslations("forms.image");
  const text = useUploadText();
  const errorMessage = useApiErrorMessage();
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadMedia = useUploadMedia();
  const [uploading, setUploading] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);
  const preview = previewUrl || (value ? mediaPath(value) : "");

  async function upload(picked: File) {
    const problem = text.problem(picked);
    if (problem) {
      setFailure(problem);
      return;
    }
    setUploading(true);
    onUploadingChange?.(true);
    setFailure(null);

    try {
      /* A camera original is resized first, so it fits the upload limit and loads quickly. */
      const file = await prepareImage(picked);
      if (file.size > MAX_IMAGE_BYTES) {
        setFailure(text.tooLarge(picked.name));
        return;
      }
      const body = new FormData();
      body.set("file", file, file.name);
      body.set("category", category);

      const payload = await uploadMedia(body);

      setBroken(false);
      onChange(payload.key, payload.uri || mediaPath(payload.key));
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
      /* Let the same file be chosen again after a failure. */
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          aria-describedby={describedBy}
          aria-invalid={invalid}
          className="font-mono text-xs placeholder:font-sans"
          id={id}
          onChange={(event) => {
            setBroken(false);
            const key = event.target.value.trim();
            onChange(key, key ? mediaPath(key) : "");
          }}
          placeholder={t("placeholder")}
          spellCheck={false}
          type="text"
          value={value}
        />

        <Button
          disabled={uploading}
          onClick={() => fileInput.current?.click()}
          type="button"
          variant="secondary"
        >
          {uploading ? (
            <Loader2 aria-hidden className="size-4 animate-spin" />
          ) : (
            <Upload aria-hidden className="size-4" />
          )}
          <span className="hidden sm:inline">
            {uploading ? t("uploading") : t("upload")}
          </span>
        </Button>

        {value ? (
          <Button
            aria-label={t("clear")}
            onClick={() => {
              setBroken(false);
              onChange("", "");
            }}
            size="icon"
            title={t("clear")}
            type="button"
            variant="ghost"
          >
            <X aria-hidden className="size-4" />
          </Button>
        ) : null}
      </div>

      <input
        accept={IMAGE_ACCEPT}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
        ref={fileInput}
        type="file"
      />

      {failure ? (
        <small className="text-2xs font-semibold text-heritage" role="alert">
          {failure}
        </small>
      ) : null}

      {value ? (
        <div className="flex items-center gap-3 rounded-md border border-line bg-sand p-2">
          {broken || !preview ? (
            <span className="grid size-16 place-items-center rounded-md bg-paper text-muted">
              <ImageOff aria-hidden className="size-5" />
            </span>
          ) : (
            <Image
              alt=""
              className={drawn ? "size-16 rounded-md bg-white object-contain p-1.5" : "size-16 rounded-md object-cover"}
              height={64}
              onError={() => setBroken(true)}
              src={preview}
              unoptimized
              width={64}
            />
          )}
          <p className="min-w-0 flex-1 truncate font-mono text-2xs text-muted">
            {broken ? t("unreadable") : value}
          </p>
        </div>
      ) : null}
    </div>
  );
}
