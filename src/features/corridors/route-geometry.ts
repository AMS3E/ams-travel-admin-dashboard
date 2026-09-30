/**
 * Lines on the map without a map library: the road Google encoded, and how
 * far apart two places are. Pure functions, so they are tested on their own.
 */

export type LatLngPair = [latitude: number, longitude: number];

/** Google's encoded polyline format — what the stored route legs hold — as points. */
export function decodePolyline(encoded: string): LatLngPair[] {
  const points: LatLngPair[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;
  while (index < encoded.length) {
    const deltas: number[] = [];
    for (let axis = 0; axis < 2; axis++) {
      let result = 0;
      let shift = 0;
      let byte: number;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20 && index < encoded.length);
      deltas.push(result & 1 ? ~(result >> 1) : result >> 1);
    }
    latitude += deltas[0];
    longitude += deltas[1];
    points.push([latitude / 1e5, longitude / 1e5]);
  }
  return points;
}

const EARTH_RADIUS_KM = 6371;

/** As the crow flies, in kilometres; null when either place has no pin. */
export function straightLineKm(
  from: { readonly latitude: number | null; readonly longitude: number | null } | undefined,
  to: { readonly latitude: number | null; readonly longitude: number | null } | undefined,
): number | null {
  if (from?.latitude == null || from.longitude == null || to?.latitude == null || to.longitude == null) return null;
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = radians(to.latitude - from.latitude);
  const dLng = radians(to.longitude - from.longitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}
