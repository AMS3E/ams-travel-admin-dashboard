import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { sessionExpired } from "@/store/slices/session-slice";

// The same-origin handlers forward the HttpOnly Keycloak session to Spring.
// Bearer tokens never need to enter Redux or browser storage.
const rawBaseQuery = fetchBaseQuery({
  baseUrl: "/api/",
  credentials: "same-origin",
  prepareHeaders: (headers) => {
    headers.set("Accept", "application/json");
    return headers;
  },
});

/** A 401 from any call means the session has run out: the shell sends the person to sign in again. */
const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (result.error?.status === 401) api.dispatch(sessionExpired());
  return result;
};

/**
 * The one RTK Query API of the dashboard. Features add their endpoints with
 * `baseApi.injectEndpoints` in `features/<feature>/api/<feature>-api.ts`.
 */
export const baseApi = createApi({
  reducerPath: "amsTravelApi",
  baseQuery,
  tagTypes: [
    "Dashboard",
    "Catalog",
    "PublishRequest",
    "Review",
    "User",
    "Role",
    "Permission",
    "Verification",
  ],
  refetchOnFocus: true,
  refetchOnReconnect: true,
  endpoints: () => ({}),
});
