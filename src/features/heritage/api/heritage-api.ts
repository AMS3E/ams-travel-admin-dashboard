import { baseApi } from "@/store/api/base-api";
import type {
  DestinationHistoryResponse,
  DestinationMonarchRequest,
  DestinationMonarchResponse,
} from "@/features/catalog/api/contracts";

export const heritageApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** One destination's timeline, in date order. Drafts too, for a desk that may see them. */
    getTimeline: builder.query<DestinationHistoryResponse[], string>({
      query: (destinationId) => ({ url: "cms/destination-histories", params: { destinationId } }),
      providesTags: (_result, _error, destinationId) => [{ type: "Heritage", id: destinationId }],
    }),
    /** The monarchs tied to one destination, earliest reign first. */
    getMonarchTies: builder.query<DestinationMonarchResponse[], string>({
      query: (destinationId) => ({ url: "cms/destination-monarchs", params: { destinationId } }),
      providesTags: (_result, _error, destinationId) => [{ type: "Heritage", id: destinationId }],
    }),
    /**
     * Replaces the monarch ties whole: whoever the body leaves out is untied.
     * A blank description goes as `null`.
     */
    saveMonarchTies: builder.mutation<
      DestinationMonarchResponse[],
      { readonly destinationId: string; readonly monarchs: DestinationMonarchRequest["monarchs"] }
    >({
      query: ({ destinationId, monarchs }) => ({
        url: "cms/destination-monarchs/" + encodeURIComponent(destinationId),
        method: "PUT",
        body: {
          monarchs: monarchs.map(({ monarchId, description }) => ({
            monarchId,
            description: description?.trim() || null,
          })),
        } satisfies DestinationMonarchRequest,
      }),
      invalidatesTags: (_result, _error, { destinationId }) => [
        { type: "Heritage", id: destinationId },
      ],
    }),
  }),
});

export const { useGetTimelineQuery, useGetMonarchTiesQuery, useSaveMonarchTiesMutation } = heritageApi;
