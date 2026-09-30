import type { LinkedPoint, PlaceResult } from "@/features/catalog/geo";
import { baseApi } from "@/store/api/base-api";

/*
 * Finding where a listing is, for the map pin: a place name looked up in
 * OpenStreetMap, restricted to Cambodia (`app/api/geo/search`), and a Google
 * Maps short link followed to its coordinates (`app/api/geo/link`). Neither
 * stores anything; the same question asked twice is answered from the cache.
 */
export const geoApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    searchPlaces: builder.query<PlaceResult[], string>({
      query: (q) => ({ url: "geo/search", params: { q } }),
      keepUnusedDataFor: 600,
    }),
    resolveMapLink: builder.query<LinkedPoint, string>({
      query: (url) => ({ url: "geo/link", params: { url } }),
      keepUnusedDataFor: 600,
    }),
  }),
});

export const { useLazySearchPlacesQuery, useLazyResolveMapLinkQuery } = geoApi;
