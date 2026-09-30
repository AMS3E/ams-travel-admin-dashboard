"use client";

import { useCallback } from "react";
import type { MediaResponse } from "@/features/catalog/api/contracts";
import { baseApi } from "@/store/api/base-api";
import { useAppDispatch } from "@/store/hooks";

/*
 * Files for MinIO, through Spring's media service (`POST /media/files`,
 * `POST /media/files/batch`) behind the route handlers `app/api/medias`. A form
 * keeps only the key that comes back — `{category}/{uploader}/{file}` — and
 * shows the picture by its URL.
 */

export const mediaApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** The form data holds `file` and its `category`; answers the stored file's key and a `uri` to preview it by. */
    uploadMedia: builder.mutation<MediaResponse, FormData>({
      query: (body) => ({ url: "medias", method: "POST", body }),
    }),
    /**
     * The same, for up to ten files at once: one response each, in the order
     * they were sent. The API writes a batch all or nothing, so a rejected one
     * leaves no half-filled gallery behind.
     */
    uploadMediaBatch: builder.mutation<MediaResponse[], FormData>({
      query: (body) => ({ url: "medias/batch", method: "POST", body }),
    }),
  }),
});

/*
 * Both are dispatched untracked: the files go to the server without ever being
 * held in the Redux state — only the keys and URLs that come back are kept,
 * by the form that asked.
 */

/** Uploads one file and resolves with what was stored. */
export function useUploadMedia(): (body: FormData) => Promise<MediaResponse> {
  const dispatch = useAppDispatch();
  return useCallback((body: FormData) => dispatch(mediaApi.endpoints.uploadMedia.initiate(body, { track: false })).unwrap(), [dispatch]);
}

/** Uploads up to ten files and resolves with what was stored, in order. */
export function useUploadMediaBatch(): (body: FormData) => Promise<MediaResponse[]> {
  const dispatch = useAppDispatch();
  return useCallback((body: FormData) => dispatch(mediaApi.endpoints.uploadMediaBatch.initiate(body, { track: false })).unwrap(), [dispatch]);
}
