import { baseApi } from "@/store/api/base-api";
import type { CatalogRecord } from "./contracts";
import type {
  ResourceKey,
  ResourceOrder,
  ReferenceOptions,
} from "@/features/catalog/resource";
import type {
  SaveRecordInput,
  SaveResult,
} from "@/features/catalog/form-state";

export interface CatalogParams {
  resource: ResourceKey;
  search?: string;
  /** One of the resource's status values, or `all`. */
  status?: string;
  /** Only the rows this account created: the viewer's own user id. */
  createdBy?: string;
  /** Only one of a listing's own types — HOTEL, CAFE. */
  kind?: string;
  /** Only the listings this account owns: a partner's own stays and foods. */
  ownedBy?: string;
  /** Only the rows that belong to this one — a tourism region's own categories, a group's own interests; `none` for none. */
  within?: string;
  /** `newest` for what was added last; anything else leaves the list by name. */
  sort?: ResourceOrder;
  page?: number;
  size?: number;
}
export interface CatalogPage {
  content: CatalogRecord[];
  totalElements: number;
  totalPages: number;
}

/**
 * The tables a destination's heritage panel is read from — its timeline and
 * its monarch ties: a change to any of them — a new timeline entry, a renamed
 * period or monarch — is stale in a heritage panel that was already loaded.
 * Its styles and religions are the destination's own fields.
 */
/* A destination's own form sets its kings too (Ancient Capitals' King filter). */
const HERITAGE_SOURCES: ReadonlySet<ResourceKey> = new Set([
  "destinations",
  "destination-histories",
  "historical-periods",
  "monarchs",
]);
const heritageTags = (resource: ResourceKey) =>
  HERITAGE_SOURCES.has(resource) ? (["Heritage"] as const) : [];
export const catalogApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCatalog: builder.query<CatalogRecord[], ResourceKey>({
      query: (resource) => "catalog/" + resource,
      providesTags: (_result, _error, resource) => [
        { type: "Catalog", id: resource },
      ],
    }),
    getCatalogRecord: builder.query<CatalogRecord, { resource: ResourceKey; id: string }>({
      query: ({ resource, id }) => "catalog/" + resource + "/" + encodeURIComponent(id),
      providesTags: (_result, _error, { resource }) => [{ type: "Catalog", id: resource }],
    }),
    getCatalogPage: builder.query<CatalogPage, CatalogParams>({
      query: ({ resource, ...params }) => ({
        url: "catalog/" + resource,
        params: { page: 0, size: 20, ...params },
      }),
      providesTags: (_result, _error, { resource }) => [
        { type: "Catalog", id: resource },
      ],
    }),
    getReferenceOptions: builder.query<
      ReferenceOptions,
      { resource: ResourceKey; include: "fields" | "columns" }
    >({
      query: ({ resource, include }) => ({
        url: "catalog/" + resource,
        params: { references: include },
      }),
      providesTags: ["Catalog"],
    }),
    saveRecord: builder.mutation<SaveResult, SaveRecordInput>({
      query: (body) => ({
        url: "catalog/" + body.resource,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { resource }) => [
        { type: "Catalog", id: resource },
        "Dashboard",
        ...heritageTags(resource),
      ],
    }),
    deleteRecord: builder.mutation<void, { resource: ResourceKey; id: string }>(
      {
        query: ({ resource, id }) => ({
          url: "catalog/" + resource + "/" + encodeURIComponent(id),
          method: "DELETE",
        }),
        invalidatesTags: (_result, _error, { resource }) => [
          { type: "Catalog", id: resource },
          "Dashboard",
          ...(resource === "destinations" ? ["PublishRequest" as const] : []),
          ...heritageTags(resource),
        ],
      },
    ),
    /** `status` is one of the resource's own values — see its `ResourceStatus`. */
    setRecordStatus: builder.mutation<
      CatalogRecord,
      { resource: ResourceKey; id: string; status: string }
    >({
      query: ({ resource, id, status }) => ({
        url: "catalog/" + resource + "/" + encodeURIComponent(id),
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: (_result, _error, { resource }) => [
        { type: "Catalog", id: resource },
        "Dashboard",
      ],
    }),
  }),
});
export const {
  useGetCatalogQuery,
  useGetCatalogRecordQuery,
  useGetCatalogPageQuery,
  useGetReferenceOptionsQuery,
  useSaveRecordMutation,
  useDeleteRecordMutation,
  useSetRecordStatusMutation,
} = catalogApi;
