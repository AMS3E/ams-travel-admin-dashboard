import type { Metadata } from "next";
import EditRecordPage, { generateMetadata as recordMetadata } from "@/app/(dashboard)/[resource]/[id]/page";

type Params = {
  readonly params: Promise<{ readonly id: string }>;
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** The generic record page, told which resource it is on: a region's form lives under its detail page. */
function asRecordPage(id: string, searchParams: Params["searchParams"]) {
  return { params: Promise.resolve({ resource: "regions", id }), searchParams } as Parameters<typeof EditRecordPage>[0];
}

export async function generateMetadata(props: Params): Promise<Metadata> {
  const { id } = await props.params;
  return recordMetadata(asRecordPage(id, props.searchParams));
}

/** Content Management → Tourism Regions → one region → Edit: its form, as every other resource's. */
export default async function EditRegionPage(props: Params) {
  const { id } = await props.params;
  return EditRecordPage(asRecordPage(id, props.searchParams));
}
