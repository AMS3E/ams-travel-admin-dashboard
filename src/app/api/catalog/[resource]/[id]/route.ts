import { NextResponse, type NextRequest } from "next/server";
import { canSetStatus } from "@/features/auth/permissions";
import { getCurrentAdmin } from "@/features/auth/session";
import { findRecord } from "@/features/catalog/api/catalog.server";
import type { CatalogRecord } from "@/features/catalog/api/contracts";
import {
  resourcePath,
  toFormValues,
  toRequestBody,
} from "@/features/catalog/resource";
import { getResource, isResourceKey } from "@/features/catalog/resources";
import { hasValidRequestOrigin, requireAdminToken, toErrorResponse } from "@/lib/api-route.server";
import { backendRequest } from "@/lib/backend-api.server";
import { isUuid } from "@/lib/ids";

interface RouteParams {
  readonly params: Promise<{
    readonly resource: string;
    readonly id: string;
  }>;
}

const unknownRow = () =>
  NextResponse.json({ message: "Unknown catalogue row." }, { status: 404 });

/** One row, as the API lets this account read it — for a drawer that shows it beside something else. */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { resource, id } = await params;
  if (!isResourceKey(resource) || !isUuid(id)) return unknownRow();

  const session = await requireAdminToken();
  if ("response" in session) return session.response;

  try {
    return NextResponse.json(await findRecord(resource, id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * Retire or restore a row without opening its form.
 *
 * A destination moves through its own publish and unpublish endpoints. Every
 * other row is written back whole — read, status changed, `PUT` — so the
 * toggle means the same thing whether the API maps a `PUT` partially or
 * replaces the row.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { resource, id } = await params;
  if (!isResourceKey(resource) || !isUuid(id)) return unknownRow();

  const definition = getResource(resource);
  const model = definition.status;
  if (!model) {
    return NextResponse.json(
      { message: `${definition.labelPlural} have no status.` },
      { status: 400 },
    );
  }

  const session = await requireAdminToken();
  if ("response" in session) return session.response;
  if (!hasValidRequestOrigin(request)) {
    return NextResponse.json({ message: "Invalid request origin." }, { status: 403 });
  }
  const admin = await getCurrentAdmin();
  if (!admin || !canSetStatus(admin.roles, resource)) {
    return NextResponse.json(
      { message: "This account cannot change whether this is on the public site." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    status?: unknown;
  } | null;
  const status = body?.status;
  const allowed = model.options.map((option) => option.value);

  if (typeof status !== "string" || !allowed.includes(status)) {
    return NextResponse.json(
      { message: `Status must be one of ${allowed.join(", ")}.` },
      { status: 400 },
    );
  }

  try {
    if (model.via === "publish") {
      const updated = await backendRequest<CatalogRecord>(
        `${resourcePath(resource)}/${id}/${status === model.live ? "publish" : "unpublish"}`,
        { method: "PATCH" },
        session.token,
      );
      return NextResponse.json(updated ?? null);
    }

    const record = await findRecord(resource, id);
    const values = { ...toFormValues(definition, record), status };
    const updated = await backendRequest<CatalogRecord>(
      `${resourcePath(resource)}/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(toRequestBody(definition, values, { mode: "update" })),
      },
      session.token,
    );
    return NextResponse.json(updated ?? null);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { resource, id } = await params;
  if (!isResourceKey(resource) || !isUuid(id)) return unknownRow();

  const session = await requireAdminToken();
  if ("response" in session) return session.response;

  try {
    await backendRequest<void>(
      `${resourcePath(resource)}/${id}`,
      { method: "DELETE" },
      session.token,
    );
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
