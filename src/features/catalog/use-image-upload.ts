"use client";

import { useSaveRecordMutation } from "@/features/catalog/api/catalog-api";
import type { MediaResponse } from "@/features/catalog/api/contracts";
import {
  MAX_IMAGE_BYTES,
  batchesOf,
  imageProblem,
  prepareImage,
} from "@/features/catalog/media-upload";
import { mediaPath, toFormValues, type Gallery, type ResourceDefinition } from "@/features/catalog/resource";
import { useUploadMediaBatch } from "@/features/media/api/media-api";
import { apiErrorMessage } from "@/store/api/api-error";

export interface UploadProgress {
  readonly phase: "preparing" | "uploading" | "saving";
  readonly done: number;
  readonly total: number;
}

export interface UploadOutcome {
  readonly uploaded: readonly MediaResponse[];
  /** Files left out before uploading, each with the reason. */
  readonly skipped: readonly string[];
  /** Set when a batch was refused; everything before it is in `uploaded`. */
  readonly error?: string;
}

/** A progress line a person can read. */
export function progressLabel(progress: UploadProgress): string {
  const count = `${progress.done} of ${progress.total}`;
  switch (progress.phase) {
    case "preparing":
      return `Preparing photos · ${count}`;
    case "uploading":
      return `Uploading photos · ${count}`;
    case "saving":
      return `Adding to the gallery · ${count}`;
  }
}

/** Shrinks and uploads any number of photos, batch by batch, reporting as it goes. */
export function useImageUpload() {
  const uploadBatch = useUploadMediaBatch();

  return async function upload(
    files: readonly File[],
    category: string,
    onProgress: (progress: UploadProgress) => void,
  ): Promise<UploadOutcome> {
    const skipped: string[] = [];
    const ready: File[] = [];

    for (const [index, file] of files.entries()) {
      onProgress({ phase: "preparing", done: index, total: files.length });
      const problem = imageProblem(file);
      if (problem) {
        skipped.push(problem);
        continue;
      }
      const prepared = await prepareImage(file);
      if (prepared.size > MAX_IMAGE_BYTES) {
        skipped.push(`${file.name} is still larger than 8 MB after resizing.`);
        continue;
      }
      ready.push(prepared);
    }

    const uploaded: MediaResponse[] = [];
    onProgress({ phase: "uploading", done: 0, total: ready.length });
    for (const batch of batchesOf(ready)) {
      const body = new FormData();
      body.set("category", category);
      for (const file of batch) body.append("file", file, file.name);
      try {
        uploaded.push(...(await uploadBatch(body)));
      } catch (error) {
        return { uploaded, skipped, error: apiErrorMessage(error) };
      }
      onProgress({ phase: "uploading", done: uploaded.length, total: ready.length });
    }
    return { uploaded, skipped };
  };
}

/**
 * Writes one gallery row per uploaded photo, numbered on from `startOrder` so
 * the gallery keeps the order they were picked in. Stops at the first refusal
 * and says how far it got.
 */
export function useGalleryRows(definition: ResourceDefinition, gallery: Gallery) {
  const [saveRecord] = useSaveRecordMutation();

  return async function addRows(
    ownerId: string,
    photos: readonly { readonly key: string; readonly url?: string | null; readonly cover?: boolean }[],
    startOrder: number,
    onProgress: (progress: UploadProgress) => void,
  ): Promise<{ readonly added: number; readonly error?: string }> {
    let added = 0;
    for (const photo of photos) {
      onProgress({ phase: "saving", done: added, total: photos.length });
      const values = toFormValues(definition, null);
      values[gallery.owner.name] = ownerId;
      values[gallery.file.name] = photo.key;
      if (gallery.file.urlField) values[gallery.file.urlField] = photo.url || mediaPath(photo.key);
      if (definition.orderField) values[definition.orderField] = String(startOrder + added);
      /* The API makes a row marked as the cover the listing's cover, and unmarks the others. */
      if (photo.cover) values.isCover = true;
      try {
        const result = await saveRecord({ resource: definition.key, values }).unwrap();
        if (!result.ok) return { added, error: result.message };
      } catch (error) {
        return { added, error: apiErrorMessage(error) };
      }
      added += 1;
    }
    onProgress({ phase: "saving", done: added, total: photos.length });
    return { added };
  };
}
