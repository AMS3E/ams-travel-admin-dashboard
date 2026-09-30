import { baseApi } from "@/store/api/base-api";
import type { AdminOverviewResponse, AuditLogResponse } from "./contracts";
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
export const { useGetDashboardQuery, useClearAuditLogMutation } = dashboardApi;
