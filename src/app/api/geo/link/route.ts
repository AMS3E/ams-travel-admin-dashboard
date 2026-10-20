import { NextResponse, type NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";
import { isGoogleHost, isShortMapLink, pointInMapLink } from "@/features/catalog/geo";
import { requireAdminToken } from "@/lib/api-route.server";

const MAX_HOPS = 5;

/**
 * Follows a Google Maps share link — `maps.app.goo.gl/…` — to the full map
 * address it stands for, and reads the point from that.
 *
 * Only Google's own hosts are followed, over https, a few hops at most: this
 * route never becomes a way to make the server fetch anything else.
 */
export async function GET(request: NextRequest) {
  const session = await requireAdminToken();
  if ("response" in session) return session.response;

  const link = request.nextUrl.searchParams.get("url")?.trim() ?? "";
  if (!isShortMapLink(link)) {
    return NextResponse.json({ message: (await getTranslations("errors.api"))("pasteLink") }, { status: 400 });
  }

  let address = new URL(link);
  try {
    for (let hop = 0; hop < MAX_HOPS; hop += 1) {
      const response = await fetch(address, {
        redirect: "manual",
        headers: { "User-Agent": "Mozilla/5.0 (AMS Travel CMS)", Accept: "text/html" },
        signal: AbortSignal.timeout(8000),
      });
      await response.body?.cancel();

      const location = response.headers.get("location");
      if (response.status < 300 || response.status >= 400 || !location) break;
      const next = new URL(location, address);
      /* The point is often already in the address being redirected to. */
      const found = pointInMapLink(next.href);
      if (found) return NextResponse.json(found);
      if (next.protocol !== "https:" || !isGoogleHost(next.hostname)) break;
      address = next;
    }
  } catch {
    return NextResponse.json(
      { message: (await getTranslations("errors.api"))("linkDown") },
      { status: 502 },
    );
  }

  const found = pointInMapLink(address.href);
  return found ? NextResponse.json(found) : NextResponse.json({ message: (await getTranslations("errors.api"))("noPointInLink") }, { status: 422 });
}
