/**
 * Where each kind of history is kept. History & Heritage holds all of it:
 * All Historical Coverage lists each tourism region's Historical coverage,
 * numbered as its page shows it; Create Historical Coverage builds a region's
 * list step by step; and Heritage Tags keeps the historical periods, kings,
 * religions and architecture styles an ancient site's tags offer, a tab each.
 * A site's timeline is edited on the site's own page. Plain data: the sidebar
 * and the forms read it.
 */

/** All Historical Coverage: each region's list. */
export const HISTORICAL_COVERAGE = "/heritage";

/** Create Historical Coverage: choose the region, then build its list step by step. */
export const CREATE_HERITAGE = "/heritage/create";

/** Heritage Tags: a tab per kind of tag value. */
export const HERITAGE_TAGS = "/heritage-tags";

export type HeritageTagKey = "architecture-styles" | "historical-periods" | "monarchs" | "religions";

export interface HeritageTab {
  readonly key: HeritageTagKey;
  /** The `?type=` it is opened with. */
  readonly tab: string;
  /** The tab's name. */
  readonly label: string;
  /** One of them: "king". */
  readonly one: string;
  /** What it is, under the page title. */
  readonly description: string;
}

/** A to Z, as the tabs read: the values an Ancient Capitals site's heritage tags offer. */
export const HERITAGE_TABS: readonly HeritageTab[] = [
  {
    key: "architecture-styles",
    tab: "styles",
    label: "Architecture styles",
    one: "architecture style",
    description: "A way of building, such as Bayon Style, and the era it belongs to. What a site's Architecture Style tag offers.",
  },
  {
    key: "historical-periods",
    tab: "periods",
    label: "Historical periods",
    one: "historical period",
    description: "An era, such as the Angkor Period, with the years it spans. Capitals and sites are dated in it.",
  },
  {
    key: "monarchs",
    tab: "kings",
    label: "Kings",
    one: "king",
    description: "A ruler, such as Jayavarman VII, with his title and the years of his reign. What a site's King tag offers.",
  },
  {
    key: "religions",
    tab: "religions",
    label: "Religions",
    one: "religion",
    description: "A faith, such as Hinduism or Buddhism. What a site's Religion tag offers.",
  },
];

/** Where a row of history is listed; null for a table with a page of its own. */
export function heritageListOf(key: string): string | null {
  if (key === "region-coverage") return HISTORICAL_COVERAGE;
  const found = HERITAGE_TABS.find((tab) => tab.key === key);
  return found ? `${HERITAGE_TAGS}?type=${found.tab}` : null;
}
