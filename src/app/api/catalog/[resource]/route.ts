import { NextResponse, type NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";
import {
  getRecords,
  getReferenceOptions,
  aToZ,
  newestFirst,
} from "@/features/catalog/api/catalog.server";
import { shownRow, statusValueOf } from "@/features/catalog/resource";
import { getResource, isResourceKey } from "@/features/catalog/resources";
import { saveRecord } from "@/features/catalog/api/record-writes.server";
import type { SaveRecordInput } from "@/features/catalog/form-state";
import { hasValidRequestOrigin, requireAdminToken, toErrorResponse } from "@/lib/api-route.server";
import { isUuid } from "@/lib/ids";

interface RouteParams {
  readonly params: Promise<{ readonly resource: string }>;
}

const unknownResource = async () => NextResponse.json(
  { message: (await getTranslations("errors.api"))("unknownResource") },
  { status: 404 },
);

/** The list a table refetches after a delete or a status change. */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { resource } = await params;
  if (!isResourceKey(resource)) return unknownResource();

  const session = await requireAdminToken();
  if ("response" in session) return session.response;

  try {
    const query = request.nextUrl.searchParams;
    const references = query.get("references");
    const definition = getResource(resource);
    if (references === "fields" || references === "columns") {
      return NextResponse.json(
        await getReferenceOptions(definition, references),
      );
    }
    const records = await getRecords(resource);
    if (query.has("page")) {
      const page = Number(query.get("page"));
      const size = Number(query.get("size") ?? 20);
      if (
        !Number.isInteger(page) ||
        page < 0 ||
        !Number.isInteger(size) ||
        size < 1 ||
        size > 100
      ) {
        return NextResponse.json(
          { message: (await getTranslations("errors.api"))("invalidPagination") },
          { status: 400 },
        );
      }
      const search = (query.get("search") ?? "").trim().toLowerCase();
      const status = query.get("status");
      /* "Created by me": a narrowing of rows this account may already see, so no grant is needed. */
      const createdBy = query.get("createdBy");
      /* A stay's or a food listing's own type: Hotel, Cafe. */
      const kind = query.get("kind");
      /* A partner's own stays and foods. */
      const ownedBy = query.get("ownedBy");
      /* One tourism region's own categories or tags: the rows its list includes. */
      const within = query.get("within");
      const linkFields = definition.groupBy ? [] : definition.fields.filter((field) => field.inverse).map((field) => field.name);
      if (createdBy !== null && !isUuid(createdBy)) {
        return NextResponse.json({ message: (await getTranslations("errors.api"))("invalidAuthor") }, { status: 400 });
      }
      /* A to Z by name; as arranged (a gallery, a timeline); or what was added last. The rows arrive as arranged. */
      const sort = query.get("sort");
      /* One tourism region's own categories or tags, "shown" in that region's order, the rest after A to Z. */
      const inverse = within && within !== "none" && !definition.groupBy ? definition.fields.find((field) => field.inverse)?.inverse : undefined;
      const owner = sort === "shown" && inverse ? (await getRecords(inverse.resource)).find((record) => record.id === within) : undefined;
      const ownOrder = owner && Array.isArray(owner[inverse!.field]) ? (owner[inverse!.field] as unknown[]).map(String) : null;
      const ordered =
        sort === "newest"
          ? newestFirst(definition, records)
          : ownOrder
            ? aToZ(definition, records).toSorted((a, b) => (ownOrder.indexOf(a.id) + 1 || Number.MAX_SAFE_INTEGER) - (ownOrder.indexOf(b.id) + 1 || Number.MAX_SAFE_INTEGER))
            : sort === "shown"
              ? records
              : aToZ(definition, records);
      // The Spring workspace endpoint applies ownership before these filters.
      // It returns an array; pagination happens here until it supports pages.
      const matches = ordered.filter(
        (record) =>
          /* Tourism Regions lists the tourism regions, not the zones. */
          shownRow(definition, record) &&
          (!status || status === "all" || statusValueOf(definition, record) === status) &&
          (!createdBy || record.createdBy === createdBy) &&
          (!kind || record.type === kind) &&
          (!ownedBy || record.ownerUserId === ownedBy) &&
          (!within ||
            (linkFields.length
              ? within === "none"
                ? linkFields.every((name) => !Array.isArray(record[name]) || (record[name] as unknown[]).length === 0)
                : linkFields.some((name) => Array.isArray(record[name]) && (record[name] as unknown[]).includes(within))
              : definition.groupBy
                ? within === "none"
                  ? !record[definition.groupBy.field]
                  : record[definition.groupBy.field] === within
                : true)) &&
          (!search ||
            definition.searchFields.some((field) =>
              String(record[field] ?? "")
                .toLowerCase()
                .includes(search),
            )),
      );
      return NextResponse.json({
        content: matches.slice(page * size, (page + 1) * size),
        totalElements: matches.length,
        totalPages: Math.ceil(matches.length / size),
      });
    }
    return NextResponse.json(records);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { resource } = await params;
  if (!isResourceKey(resource)) return unknownResource();
  const session = await requireAdminToken();
  if ("response" in session) return session.response;
  if (!hasValidRequestOrigin(request))
    return NextResponse.json(
      { message: (await getTranslations("errors.api"))("invalidOrigin") },
      { status: 403 },
    );
  const input = (await request
    .json()
    .catch(() => null)) as SaveRecordInput | null;
  if (
    !input ||
    typeof input !== "object" ||
    !input.values ||
    typeof input.values !== "object" ||
    (input.id != null && !isUuid(input.id))
  ) {
    return NextResponse.json({ message: (await getTranslations("errors.api"))("invalidRecord") }, { status: 400 });
  }
  try {
    return NextResponse.json(await saveRecord({ ...input, resource }));
  } catch (error) {
    return toErrorResponse(error);
  }
}
