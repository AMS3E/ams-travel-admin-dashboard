import { baseApi } from "@/store/api/base-api";
import type { AdminOverviewResponse, AuditLogResponse, DestinationStatsPeriod, DestinationStatsResponse, PlaceStatsResponse, StampCodeResponse, StampTarget } from "./contracts";
import type { DestinationResponse, FoodResponse, StayResponse } from "@/features/catalog/api/contracts";
import type { PublishRequestResponse } from "@/features/publishing/api/contracts";
export interface DashboardResponse {
  overview: AdminOverviewResponse | null;
  destinations: DestinationResponse[] | null;
  /**
   * Places to stay and to eat, which a partner writes and a BDO puts live: a
   * partner's own only; every one for an account that manages them all.
   */
  stays: StayResponse[] | null;
  foods: FoodResponse[] | null;
  /** The desk's queue for a reviewer; the account's own requests for anyone else. */
  requests: PublishRequestResponse[] | null;
  /** The account's own requests — for an editor or a BDO, what they sent to an administrator. */
  mine: PublishRequestResponse[] | null;
  audit: AuditLogResponse[] | null;
  failures: string[];
}
export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboard: builder.query<DashboardResponse, void>({
      query: () => "dashboard",
      providesTags: ["Dashboard"],
    }),
    /** Every destination's ratings, reviews, browses, views and Verified standing, for Destination Stats. */
    getDestinationStats: builder.query<DestinationStatsResponse, DestinationStatsPeriod>({
      query: ({ from, to }) => ({
        url: "cms/admin/destination-stats",
        params: { ...(from ? { from } : {}), ...(to ? { to } : {}) },
      }),
      providesTags: ["Dashboard", "Verification"],
    }),
    /** One place's standing by its id, an attraction, a stay or a food place, for Destination Detail. */
    getPlaceStats: builder.query<PlaceStatsResponse, DestinationStatsPeriod & { readonly id: string }>({
      query: ({ id, from, to }) => ({
        url: `cms/admin/destination-stats/${encodeURIComponent(id)}`,
        params: { ...(from ? { from } : {}), ...(to ? { to } : {}) },
      }),
      providesTags: ["Dashboard", "Verification"],
    }),
    /** A destination's check-in codes, current first. */
    getStampCodes: builder.query<StampCodeResponse[], { readonly targetType: StampTarget; readonly targetId: string }>({
      query: ({ targetType, targetId }) => ({ url: "cms/stamps/codes", params: { targetType, targetId } }),
      providesTags: ["StampCode"],
    }),
    /** Issues a destination's code; the current one, if any, stops working. */
    issueStampCode: builder.mutation<StampCodeResponse, { readonly targetType: StampTarget; readonly targetId: string }>({
      query: (body) => ({ url: "cms/stamps/codes", method: "POST", body }),
      invalidatesTags: ["StampCode"],
    }),
    /** Withdraws a code for good: printed by mistake, or never posted. */
    withdrawStampCode: builder.mutation<void, string>({
      query: (id) => ({ url: `cms/stamps/codes/${encodeURIComponent(id)}`, method: "DELETE" }),
      invalidatesTags: ["StampCode"],
    }),
    /**
     * Clears the whole audit log (full control only). Spring answers the PURGE
     * entry it leaves behind, whose `newData.removed` says how many went.
     */
    clearAuditLog: builder.mutation<AuditLogResponse | null, void>({
      query: () => ({ url: "cms/admin/audit", method: "DELETE" }),
      invalidatesTags: ["Dashboard"],
    }),
  }),
});
export const {
  useGetDashboardQuery,
  useGetDestinationStatsQuery,
  useGetPlaceStatsQuery,
  useGetStampCodesQuery,
  useIssueStampCodeMutation,
  useWithdrawStampCodeMutation,
  useClearAuditLogMutation,
} = dashboardApi;
