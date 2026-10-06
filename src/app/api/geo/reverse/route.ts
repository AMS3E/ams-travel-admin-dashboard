import { NextResponse, type NextRequest } from "next/server";
import { requireAdminToken } from "@/lib/api-route.server";
import { isPoint, placeDetails, type OsmAddress, type PlaceDetails } from "@/features/catalog/geo";

/**
 * What OpenStreetMap says about a point in Cambodia: its province and a line
 * of address, so the form can fill them from the pin. Asked from here rather
 * than the browser so every request names the dashboard, as Nominatim's usage
 * policy requires; it is asked once per pin put down, never while one is
 * dragged. An empty answer means the map does not know: the form asks instead.
 */
export async function GET(request: NextRequest) {
  const session = await requireAdminToken();
  if ("response" in session) return session.response;

  const latitude = Number(request.nextUrl.searchParams.get("lat"));
  const longitude = Number(request.nextUrl.searchParams.get("lon"));
  if (!isPoint(latitude, longitude)) {
    return NextResponse.json({ message: "That is not a point on the map." }, { status: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.search = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: "jsonv2",
    zoom: "16",
    addressdetails: "1",
    "accept-language": "en",
  }).toString();

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "AMS Travel CMS (admin dashboard)", Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`Nominatim answered ${response.status}`);
    const place = (await response.json()) as { readonly address?: OsmAddress & { readonly country_code?: string } };
    /* A pin outside Cambodia has no province here. */
    const details: PlaceDetails = place.address?.country_code && place.address.country_code !== "kh" ? {} : placeDetails(place.address);
    return NextResponse.json(details);
  } catch {
    return NextResponse.json({ message: "The map could not say where that is." }, { status: 502 });
  }
}
