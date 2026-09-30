import { type NextRequest } from "next/server";
import { canVerifyDestinations } from "@/features/auth/permissions";
import { getCurrentAdmin } from "@/features/auth/session";
import { requireAdminToken } from "@/lib/api-route.server";
import { backendUrl } from "@/lib/backend-api.server";
import { isUuid } from "@/lib/ids";

/**
 * Verification evidence — an invoice or a receipt — streamed with the
 * session's token.
 *
 * Every other folder is public by its link and goes through the catch-all
 * beside this, cached for a year. This one the API serves only to a bearer
 * token that may verify (401 or 403 otherwise) and marks `no-store`, so an
 * `<img src>` pointing at the API could never load it. The browser asks this
 * origin with its session cookie instead; the token is attached here, server
 * side, and never reaches the page.
 *
 * A static segment outranks the catch-all, so `/api/v1/media/files/verification/…`
 * always lands here — the same path the API's `evidenceUrl` carries.
 */
type Context = { params: Promise<{ owner: string; file: string }> };

/** What the API names a stored file: a generated name and an image or PDF extension. */
const FILE_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*\.(?:jpg|png|webp|gif|avif|pdf)$/i;

/** This browser only, and not even kept there. */
const PRIVATE = "private, no-store";

export const dynamic = "force-dynamic";

function empty(status: number): Response {
  return new Response(null, { status, headers: { "cache-control": PRIVATE } });
}

export async function GET(_request: NextRequest, context: Context) {
  const { owner, file } = await context.params;
  /* Checked before either is spliced into the API's URL, so nothing else can ride along. */
  if (!isUuid(owner) || !FILE_NAME.test(file)) return empty(404);

  const session = await requireAdminToken();
  if ("response" in session) return session.response;
  /* The API would refuse too; asking first saves a round trip for a desk that verifies nothing. */
  const admin = await getCurrentAdmin();
  if (!admin || !canVerifyDestinations(admin.roles)) return empty(403);

  let upstream: Response;
  try {
    upstream = await fetch(
      backendUrl(`/media/files/verification/${owner}/${encodeURIComponent(file)}`),
      {
        headers: { Authorization: `Bearer ${session.token}` },
        cache: "no-store",
      },
    );
  } catch {
    return empty(502);
  }

  if (!upstream.ok || !upstream.body) return empty(upstream.status);

  const headers = new Headers({
    "content-type": upstream.headers.get("content-type") ?? "application/octet-stream",
    "cache-control": PRIVATE,
    "x-content-type-options": "nosniff",
  });
  const disposition = upstream.headers.get("content-disposition");
  if (disposition) headers.set("content-disposition", disposition);

  return new Response(upstream.body, { headers });
}
