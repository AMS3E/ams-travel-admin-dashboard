"use client";

import { baseApi } from "@/store/api/base-api";
import type { InterestGroupResponse } from "./contracts";

/* The six interest groups and their pictures, through the CMS proxy (`GET`, `PUT /interest-groups/{id}`). */
export const interestGroupsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getInterestGroups: builder.query<InterestGroupResponse[], void>({
      query: () => "cms/interest-groups",
      providesTags: ["InterestGroup"],
    }),
    /** A new key changes the picture; an empty one removes it. */
    updateInterestGroup: builder.mutation<InterestGroupResponse, { readonly id: string; readonly coverKey: string }>({
      query: ({ id, coverKey }) => ({ url: `cms/interest-groups/${id}`, method: "PUT", body: { coverKey } }),
      invalidatesTags: ["InterestGroup"],
    }),
  }),
});

export const { useGetInterestGroupsQuery, useUpdateInterestGroupMutation } = interestGroupsApi;
