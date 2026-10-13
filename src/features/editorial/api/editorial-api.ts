import { baseApi } from "@/store/api/base-api";
import type { ReviewResponse, ReviewStatus } from "@/features/dashboard/api/contracts";
export const editorialApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getReviews: builder.query<ReviewResponse[], void>({
      query: () => "cms/reviews",
      providesTags: ["Review"],
    }),
    /** One destination's reviews, newest first, every status a moderator may see; the API answers a page. */
    getDestinationReviews: builder.query<ReviewResponse[], string>({
      query: (destinationId) => ({
        url: "cms/reviews",
        params: { targetType: "DESTINATION", targetId: destinationId, size: 200 },
      }),
      transformResponse: (response: ReviewResponse[] | { readonly content: ReviewResponse[] }) =>
        Array.isArray(response) ? response : response.content,
      providesTags: ["Review"],
    }),
    /** Moderation sends the status alone; the review itself is the traveller's. */
    moderateReview: builder.mutation<
      ReviewResponse,
      { id: string; status: ReviewStatus }
    >({
      query: ({ id, status }) => ({
        url: "cms/reviews/" + encodeURIComponent(id),
        method: "PUT",
        body: { status },
      }),
      invalidatesTags: [
        "Review",
        "Dashboard",
        { type: "Catalog", id: "destinations" },
      ],
    }),
  }),
});
export const {
  useGetReviewsQuery,
  useGetDestinationReviewsQuery,
  useModerateReviewMutation,
} = editorialApi;
