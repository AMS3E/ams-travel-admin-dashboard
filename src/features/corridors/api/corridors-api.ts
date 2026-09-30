import type {
  CreateCorridorInput,
  CreateCorridorResult,
  ItineraryDayInput,
  ItineraryResult,
  PreviewStopInput,
  PublishResult,
  RoutePreviewResult,
} from "@/features/corridors/api/contracts";
import { baseApi } from "@/store/api/base-api";

/*
 * Tourism corridors beyond their overview form: creating one in one go,
 * planning its days, working its road route out and publishing it — through
 * `app/api/corridors/...`, which checks the permission and the input before
 * Spring's `/corridors` endpoints. The list itself is the catalogue's
 * (`Catalog`/`corridors`), so every change here refreshes it.
 */

const CORRIDOR_LIST = { type: "Catalog", id: "corridors" } as const;

export const corridorsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    createCorridor: build.mutation<CreateCorridorResult, CreateCorridorInput>({
      query: (input) => ({ url: "corridors", method: "POST", body: input }),
      invalidatesTags: [CORRIDOR_LIST, "Dashboard"],
    }),
    /** The roads between stops not saved yet. The same plan asked twice is answered from the cache. */
    previewRoute: build.query<RoutePreviewResult, readonly PreviewStopInput[]>({
      query: (stops) => ({ url: "corridors/route-preview", method: "POST", body: { stops } }),
      keepUnusedDataFor: 300,
    }),
    saveItinerary: build.mutation<ItineraryResult, { readonly corridorId: string; readonly days: readonly ItineraryDayInput[] }>({
      query: ({ corridorId, days }) => ({ url: `corridors/${encodeURIComponent(corridorId)}/itinerary`, method: "PUT", body: { days } }),
      invalidatesTags: [CORRIDOR_LIST],
    }),
    recalculateRoute: build.mutation<ItineraryResult, string>({
      query: (corridorId) => ({ url: `corridors/${encodeURIComponent(corridorId)}/route`, method: "POST" }),
      invalidatesTags: [CORRIDOR_LIST],
    }),
    setCorridorPublished: build.mutation<PublishResult, { readonly corridorId: string; readonly published: boolean }>({
      query: ({ corridorId, published }) => ({ url: `corridors/${encodeURIComponent(corridorId)}/publish`, method: "PATCH", body: { published } }),
      invalidatesTags: [CORRIDOR_LIST, "Dashboard"],
    }),
  }),
});

export const {
  useCreateCorridorMutation,
  useLazyPreviewRouteQuery,
  useSaveItineraryMutation,
  useRecalculateRouteMutation,
  useSetCorridorPublishedMutation,
} = corridorsApi;
