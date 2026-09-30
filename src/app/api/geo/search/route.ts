import { NextResponse, type NextRequest } from "next/server";
import { isPoint, roundCoordinate, type PlaceResult } from "@/features/catalog/geo";
import { requireAdminToken } from "@/lib/api-route.server";

interface NominatimPlace {
  readonly name?: string;
  readonly display_name?: string;
  readonly lat?: string;
  readonly lon?: string;
}

/**
 * Finds places in Cambodia by name, through OpenStreetMap's Nominatim.
 *
 * Asked from here rather than the browser so every request names the
 * dashboard, as Nominatim's usage policy requires. The form searches only when
 * someone presses Search — the policy forbids search-as-you-type.
 */
export async function GET(request: NextRequest) {
  const session = await requireAdminToken();
  if ("response" in session) return session.response;

  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2 || query.length > 200) {
    return NextResponse.json({ message: "Type the name of a place to search for." }, { status: 400 });
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.search = new URLSearchParams({
    q: query,
    format: "jsonv2",
    countrycodes: "kh",
    limit: "6",
    "accept-language": "en",
  }).toString();

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "AMS Travel CMS (admin dashboard)", Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`Nominatim answered ${response.status}`);
    const places = (await response.json()) as NominatimPlace[];

    const results: PlaceResult[] = places.flatMap((place) => {
      const latitude = Number(place.lat);
      const longitude = Number(place.lon);
      const label = place.display_name?.trim() ?? "";
      if (!isPoint(latitude, longitude) || !label) return [];
      return [{
        name: place.name?.trim() || label.split(",")[0],
        label,
        latitude: roundCoordinate(latitude),
        longitude: roundCoordinate(longitude),
      }];
    });
    return NextResponse.json(results);
  } catch {
    return NextResponse.json(
      { message: "Place search is not answering right now. Drop the pin on the map instead." },
      { status: 502 },
    );
  }
}
