import type { CatalogRecord } from "@/features/catalog/api/contracts";
import { mediaPath } from "@/features/catalog/resource";
import { byName } from "@/features/catalog/resources";

/** One photo of the gallery, as the grid and the dialog read it. */
export interface Photo {
  readonly id: string;
  readonly key: string;
  readonly url: string;
  readonly ownerId: string;
  /** The destination's name, or a stand-in while the names load. */
  readonly owner: string;
  readonly caption: string;
  readonly order: number;
  readonly cover: boolean;
  readonly createdAt: string | null;
  /** The row itself, to write a change back whole. */
  readonly row: CatalogRecord;
}

export type CoverFilter = "all" | "cover" | "other";
export type PhotoOrder = "arranged" | "newest";

const text = (value: unknown): string => (typeof value === "string" ? value : "");

/** `unknown` names a photo whose destination is not in `names` (the gallery passes it in the reader's language). */
export function toPhoto(row: CatalogRecord, names: ReadonlyMap<string, string>, unknown = "Unknown destination"): Photo {
  const key = text(row.mediaKey);
  const ownerId = text(row.ownerId);
  return {
    id: row.id,
    key,
    url: text(row.mediaUrl) || mediaPath(key),
    ownerId,
    owner: names.get(ownerId) ?? unknown,
    caption: text(row.caption).trim(),
    order: typeof row.sortOrder === "number" ? row.sortOrder : 0,
    cover: row.isCover === true,
    createdAt: text(row.createdAt) || null,
    row,
  };
}

const when = (photo: Photo): number => (photo.createdAt ? Date.parse(photo.createdAt) || 0 : 0);

/**
 * The photos a set of filters leaves, in the order asked: as arranged
 * (destination by destination, each page's own order) or what was added last.
 */
export function shownPhotos(
  photos: readonly Photo[],
  filters: { readonly owner: string; readonly cover: CoverFilter; readonly term: string; readonly order: PhotoOrder },
): Photo[] {
  const needle = filters.term.trim().toLowerCase();
  const matching = photos.filter(
    (photo) =>
      (!filters.owner || photo.ownerId === filters.owner) &&
      (filters.cover === "all" || (filters.cover === "cover") === photo.cover) &&
      (!needle || `${photo.caption} ${photo.owner}`.toLowerCase().includes(needle)),
  );
  return filters.order === "newest"
    ? matching.toSorted((a, b) => when(b) - when(a) || byName(a.owner, b.owner) || a.order - b.order)
    : matching.toSorted((a, b) => byName(a.owner, b.owner) || a.order - b.order || when(a) - when(b));
}
