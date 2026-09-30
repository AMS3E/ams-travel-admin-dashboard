import { type NextRequest } from "next/server";

/**
 * The path every stored picture's URL carries, proxied to the API.
 *
 * A rewrite in `next.config.ts` would be the obvious way to do this and does
 * not work: rewrites are baked into the routes manifest by `next build`, where
 * `API_BASE_URL` is not set, so the destination would freeze as whatever the
 * build machine saw. A route handler reads the environment per request, which
 * is what lets one built image serve every deployment.
 *
 * Both callers arrive here. The browser asks this origin because that is what
 * the API's `…Url` fields hold, and Next's image optimizer — running
 * server-side, inside the container network — resolves the same relative path
 * against this origin rather than against a public hostname it could not reach.
 *
 * Every folder but one is public: `GET /media/files/{folder}/{owner}/{file}`
 * needs no token, so none is sent and every answer may be cached. The
 * exception is `verification` — invoices — which has a route of its own beside
 * this one that sends the session's token and lets nothing be kept.
 */
type Context = { params: Promise<{ path: string[] }> };

const FALLBACK_API = "http://localhost:8080/api/v1";

/** A year, matching what the API sends: an object key never changes content. */
const IMMUTABLE = "public, max-age=31536000, immutable";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, context: Context) {
  const segments = (await context.params).path;
  /*
   * The private folder, under any spelling that missed its own route — a
   * different case, a missing segment. The API answers such a spelling 404
   * and checks the permission itself, but forwarding one here, without a
   * token and into a year-long cache, is the one thing this proxy must never do.
   */
  if (segments[0]?.toLowerCase() === "verification") {
    return new Response(null, { status: 404, headers: { "cache-control": "no-store" } });
  }
  const base = (process.env.API_BASE_URL ?? FALLBACK_API).replace(/\/+$/, "");

  const upstream = await fetch(
    `${base}/media/files/${segments.map(encodeURIComponent).join("/")}`,
  );

  if (!upstream.ok || !upstream.body) {
    return new Response(null, { status: upstream.status });
  }

  return new Response(upstream.body, {
    headers: {
      "content-type":
        upstream.headers.get("content-type") ?? "application/octet-stream",
      "cache-control": upstream.headers.get("cache-control") ?? IMMUTABLE,
    },
  });
}
