import type { AccountFormValues, ActionResult } from "@/features/people/form-state";
import { baseApi } from "@/store/api/base-api";

/** A back-office account, as Keycloak holds it — the API's `StaffResponse`. Keyed by the Keycloak id. */
export interface CmsUser {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  enabled: boolean;
  roles: string[];
  createdAt?: string | null;
}

/**
 * A row in this database's `users` table — the API's `UserResponse`.
 *
 * Written the first time any Keycloak identity presents a token, so it covers
 * customers of the public site *and* staff who have signed into this dashboard.
 * `roles` mirrors the business roles Keycloak granted (USER for a customer).
 */
export interface CustomerAccount {
  id: string;
  email: string;
  fullName: string | null;
  avatarKey: string | null;
  avatarUrl: string | null;
  phone: string | null;
  status: "ACTIVE" | "INACTIVE";
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  roles: string[];
}

/** What an administrator fills in to pre-register a customer. */
export interface NewCustomer {
  fullName: string;
  email: string;
  phone?: string;
  /** Creates their sign-in account in the amstravel realm along with the profile. */
  password?: string;
  /** Keycloak asks them for a new password at their first sign-in. */
  temporaryPassword?: boolean;
  /** The key of a photo already uploaded to the avatar folder. */
  avatarKey?: string;
}

/**
 * An edited customer, sent whole. The API leaves a `null` field unchanged, so
 * the form sends every field it knows, and an empty string is what clears the
 * phone number or the photo.
 */
export interface CustomerChanges {
  fullName: string;
  /** Also their sign-in: the API moves their Keycloak account to it. */
  email: string;
  phone: string;
  /** INACTIVE also stops them signing in. */
  status: CustomerAccount["status"];
  /** An uploaded photo's key; empty removes the photo. */
  avatarKey: string;
}

export const peopleApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<CmsUser[], string>({
      query: (search) => ({
        url: "cms/staff",
        params: search ? { search } : undefined,
      }),
      providesTags: ["User", "Role"],
    }),
    getCustomers: builder.query<CustomerAccount[], void>({
      query: () => ({ url: "cms/users" }),
      providesTags: ["User"],
    }),
    createCustomer: builder.mutation<CustomerAccount, NewCustomer>({
      query: (body) => ({ url: "cms/users", method: "POST", body }),
      invalidatesTags: ["User", "Dashboard"],
    }),
    updateCustomer: builder.mutation<
      CustomerAccount,
      { id: string; changes: CustomerChanges }
    >({
      query: ({ id, changes }) => ({
        url: `cms/users/${encodeURIComponent(id)}`,
        method: "PUT",
        body: changes,
      }),
      invalidatesTags: ["User", "Dashboard"],
    }),
    /** For good: their sign-in, reviews and favourites go too. */
    deleteCustomer: builder.mutation<void, string>({
      query: (id) => ({ url: `cms/users/${encodeURIComponent(id)}`, method: "DELETE" }),
      invalidatesTags: ["User", "Dashboard"],
    }),
    /**
     * A new back-office account and the role it starts with, through
     * `app/api/people`: its answer names a refused field, or the account made.
     */
    createAccount: builder.mutation<ActionResult, AccountFormValues>({
      query: (values) => ({ url: "people", method: "POST", body: values }),
      invalidatesTags: ["User", "Role", "Dashboard"],
    }),
    /** Exactly which business roles one account holds. */
    setRoles: builder.mutation<ActionResult, { readonly id: string; readonly roles: readonly string[] }>({
      query: ({ id, roles }) => ({ url: `people/${encodeURIComponent(id)}/roles`, method: "PUT", body: { roles } }),
      invalidatesTags: ["User", "Role", "Permission", "Dashboard"],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetCustomersQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
  useCreateAccountMutation,
  useSetRolesMutation,
} = peopleApi;
