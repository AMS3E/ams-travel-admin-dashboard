import { baseApi } from "@/store/api/base-api";
import type {
  DestinationVerificationResponse,
  RecordVerificationRequest,
  VerificationQueueItem,
  VerifiedStatusResponse,
} from "./contracts";

/** What the form hands over: raw text, which is trimmed to null before it is sent. */
export interface RecordVerificationInput {
  readonly destinationId: string;
  readonly verified: boolean;
  readonly reference?: string;
  readonly note?: string;
  readonly evidenceKey?: string;
}

export const verificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** Every destination the signed-in desk may verify, verified or not, by name. */
    getVerificationQueue: builder.query<VerificationQueueItem[], void>({
      query: () => "cms/destination-verifications/queue",
      providesTags: ["Verification"],
    }),
    /**
     * Whether each of these destinations is verified right now — one call for a
     * page of a list. Public, so every desk reads it; ids beyond the page are
     * not asked for.
     */
    getVerifiedStatuses: builder.query<VerifiedStatusResponse[], readonly string[]>({
      query: (destinationIds) => ({
        url: "cms/destination-verifications/status",
        params: { destinationIds: destinationIds.join(",") },
      }),
      providesTags: ["Verification"],
    }),
    /** One destination's decisions, newest first. 403 outside the caller's desks. */
    getDestinationVerifications: builder.query<DestinationVerificationResponse[], string>({
      query: (destinationId) => ({
        url: "cms/destination-verifications",
        params: { destinationId },
      }),
      providesTags: ["Verification"],
    }),
    /**
     * Verifies, renews or revokes. Blank text goes as `null`, so the history
     * never shows an empty reference as though one had been given.
     */
    recordVerification: builder.mutation<DestinationVerificationResponse, RecordVerificationInput>({
      query: ({ destinationId, verified, reference, note, evidenceKey }) => {
        const body: RecordVerificationRequest = {
          destinationId,
          verified,
          reference: reference?.trim() || null,
          note: note?.trim() || null,
          evidenceKey: evidenceKey?.trim() || null,
        };
        return { url: "cms/destination-verifications", method: "POST", body };
      },
      invalidatesTags: ["Verification", "Dashboard"],
    }),
  }),
});

export const {
  useGetVerifiedStatusesQuery,
  useGetVerificationQueueQuery,
  useGetDestinationVerificationsQuery,
  useRecordVerificationMutation,
} = verificationApi;
