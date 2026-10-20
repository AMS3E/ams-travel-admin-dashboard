import { baseApi } from "@/store/api/base-api";
import type { ReviewResponse, ReviewStatus } from "@/features/dashboard/api/contracts";

/** GET /reviews answers a Spring page; the screens want its rows. */
const reviewRows = (response: ReviewResponse[] | { readonly content: ReviewResponse[] }) =>
  Array.isArray(response) ? response : response.content;

export const editorialApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getReviews: builder.query<ReviewResponse[], void>({
      query: () => ({ url: "cms/reviews", params: { size: 200 } }),
      transformResponse: reviewRows,
      providesTags: ["Review"],
    }),
    /** One destination's reviews, newest first, every status a moderator may see; the API answers a page. */
    getDestinationReviews: builder.query<ReviewResponse[], string>({
      query: (destinationId) => ({
        url: "cms/reviews",
        params: { targetType: "DESTINATION", targetId: destinationId, size: 200 },
      }),
      transformResponse: reviewRows,
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
