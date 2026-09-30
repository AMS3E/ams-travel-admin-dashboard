import { baseApi } from "@/store/api/base-api";
import type { ProfileActionResult, ProfileFormValues } from "@/features/auth/profile-form-state";
import type { AdminUser } from "@/features/auth/types";
export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCurrentUser: builder.query<AdminUser, void>({
      query: () => "auth/me",
      providesTags: ["User", "Permission"],
    }),
    /** Their own name and photo key, through `app/api/profile`; the account menu reads the change at once. */
    updateProfile: builder.mutation<ProfileActionResult, ProfileFormValues>({
      query: (values) => ({ url: "profile", method: "PUT", body: values }),
      invalidatesTags: ["User"],
    }),
  }),
});
export const { useGetCurrentUserQuery, useUpdateProfileMutation } = authApi;
