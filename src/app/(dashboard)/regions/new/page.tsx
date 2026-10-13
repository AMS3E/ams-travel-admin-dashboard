import type { Metadata } from "next";
import NewRecordPage, { generateMetadata as recordMetadata } from "@/app/(dashboard)/[resource]/new/page";

type Params = {
  readonly params: Promise<Record<string, never>>;
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** The generic create page, told which resource it is on: /regions/new sits beside the region pages, not under one. */
function asRecordPage(searchParams: Params["searchParams"]) {
  return { params: Promise.resolve({ resource: "regions" }), searchParams } as Parameters<typeof NewRecordPage>[0];
}

export async function generateMetadata(props: Params): Promise<Metadata> {
  return recordMetadata(asRecordPage(props.searchParams));
}

/** Content Management → Tourism Regions → Create: a new region's form, as every other resource's. */
export default async function NewRegionPage(props: Params) {
  return NewRecordPage(asRecordPage(props.searchParams));
}
