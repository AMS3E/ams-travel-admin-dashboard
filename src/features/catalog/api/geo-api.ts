import type { GeoPoint, LinkedPoint, PlaceDetails, PlaceResult } from "@/features/catalog/geo";
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
    /* A pin's province and address, as OpenStreetMap has them (`app/api/geo/reverse`). */
    describePlace: builder.query<PlaceDetails, GeoPoint>({
      query: (point) => ({ url: "geo/reverse", params: { lat: point.latitude, lon: point.longitude } }),
      keepUnusedDataFor: 600,
    }),
  }),
});

export const { useLazySearchPlacesQuery, useLazyResolveMapLinkQuery, useLazyDescribePlaceQuery } = geoApi;
