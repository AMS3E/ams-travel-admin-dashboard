import { baseApi } from "@/store/api/base-api";
import type { ReviewResponse, ReviewStatus } from "@/features/dashboard/api/contracts";
import type { HomepageList } from "@/features/catalog/api/contracts";
export const editorialApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getReviews: builder.query<ReviewResponse[], void>({
      query: () => "cms/reviews",
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
    /** A homepage list as visitors see it: ranked by browses, featured places filling the rest. */
    getHomepageList: builder.query<HomepageList, "popular" | "recommendations/for-you">({
      query: (list) => "cms/" + list,
      providesTags: [{ type: "Catalog", id: "recommendations" }],
    }),
  }),
});
export const {
  useGetReviewsQuery,
  useModerateReviewMutation,
  useGetHomepageListQuery,
} = editorialApi;
