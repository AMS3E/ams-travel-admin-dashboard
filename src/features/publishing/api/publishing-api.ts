import { baseApi } from "@/store/api/base-api";
import { LISTING_RESOURCES, type ListingType, type PublishRequestResponse } from "./contracts";

/** What a decision changes: the requests, the dashboard, and every kind of listing's table. */
const DECIDED = [
  "PublishRequest",
  "Dashboard",
  ...Object.values(LISTING_RESOURCES).map((id) => ({ type: "Catalog" as const, id })),
] as const;

/** A reviewer's answers: approve puts it live, request-changes sends it back as a draft. */
export type PublishDecision = "approve" | "reject" | "request-changes";

const path = (id: string, step: string) => "cms/publish-requests/" + encodeURIComponent(id) + "/" + step;

export const publishingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Sends a listing — an attraction, a stay or a food listing — to its
     * reviewer. The API reads who is asking, and so which desk decides, from the token.
     */
    submitPublishRequest: builder.mutation<
      PublishRequestResponse,
      { targetType: ListingType; targetId: string }
    >({
      query: (body) => ({ url: "cms/publish-requests", method: "POST", body }),
      invalidatesTags: (_result, _error, { targetType }) => [
        "PublishRequest",
        "Dashboard",
        { type: "Catalog", id: LISTING_RESOURCES[targetType] },
      ],
    }),
    getPublishRequests: builder.query<
      PublishRequestResponse[],
      { mine?: boolean; status?: string }
    >({
      query: ({ mine, status }) => ({
        url: mine ? "cms/publish-requests/mine" : "cms/publish-requests",
        params: status ? { status } : undefined,
      }),
      providesTags: ["PublishRequest"],
    }),
    decidePublishRequest: builder.mutation<
      PublishRequestResponse,
      {
        id: string;
        decision: PublishDecision;
        decisionNote: string;
      }
    >({
      async queryFn({ id, decision, decisionNote }, _api, _extra, baseQuery) {
        const note = decisionNote.trim() || null;
        if (decision !== "approve") {
          const sendBack = decision === "request-changes";
          const result = await baseQuery({ url: path(id, "reject"), method: "POST", body: { note, sendBack } });
          return result.error ? { error: result.error } : { data: result.data as PublishRequestResponse };
        }
        /* Approving puts it live: approve, then publish. A 409 on approve means it was approved already. */
        const approved = await baseQuery({ url: path(id, "approve"), method: "POST", body: { note } });
        if (approved.error && approved.error.status !== 409) return { error: approved.error };
        const published = await baseQuery({ url: path(id, "publish"), method: "POST" });
        return published.error ? { error: published.error } : { data: published.data as PublishRequestResponse };
      },
      invalidatesTags: [...DECIDED],
    }),
  }),
});
export const {
  useGetPublishRequestsQuery,
  useDecidePublishRequestMutation,
  useSubmitPublishRequestMutation,
} = publishingApi;
