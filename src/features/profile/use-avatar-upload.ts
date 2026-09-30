"use client";

import { useRef, useState } from "react";
import { mediaPath } from "@/features/catalog/resource";
import { useUploadMedia } from "@/features/media/api/media-api";
import { apiErrorMessage } from "@/store/api/api-error";

/** What the `/api/medias` route accepts; it checks again, and so does the API. */
export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
const MAX_BYTES = 8 * 1024 * 1024;

/** An uploaded photo: the key a form saves, and the address it is previewed by. */
export interface UploadedPhoto {
  readonly key: string;
  readonly url: string;
}

/**
 * Uploading a profile photo into the avatar folder, for a form that stores
 * the returned key and saves it later.
 *
 * The file is checked here before it leaves the browser — a wrong type or an
 * oversized photo is refused with a sentence, not a round trip — and the key
 * is handed to `onUploaded` the moment the upload lands, with the address to
 * preview it by, so the picture changes straight away. Nothing reaches the
 * profile until the form saves.
 *
 * `inputProps` belong on a hidden `<input>` the form renders; `choose` opens it.
 */
export function useAvatarUpload(onUploaded: (photo: UploadedPhoto) => void) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const uploadMedia = useUploadMedia();

  async function upload(file: File) {
    if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) {
      setFailure("Choose a JPEG, PNG, WebP or AVIF image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setFailure("That photo is larger than 8 MB. Choose a smaller one.");
      return;
    }
    setUploading(true);
    setFailure(null);
    try {
      const body = new FormData();
      body.set("file", file, file.name);
      body.set("category", "avatar");
      const uploaded = await uploadMedia(body);
      onUploaded({ key: uploaded.key, url: uploaded.uri || mediaPath(uploaded.key) });
    } catch (error) {
      setFailure(apiErrorMessage(error));
    } finally {
      setUploading(false);
      /* Let the same file be chosen again after a failure. */
      if (input.current) input.current.value = "";
    }
  }

  return {
    inputProps: {
      ref: input,
      type: "file" as const,
      accept: AVATAR_TYPES.join(","),
      className: "hidden",
      tabIndex: -1,
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) void upload(file);
      },
    },
    choose: () => input.current?.click(),
    upload,
    uploading,
    failure,
    clearFailure: () => setFailure(null),
  };
}
