/**
 * Loads the Google Maps JavaScript API once per page, with the browser key.
 *
 * The key is the browser one — restricted to the Maps JavaScript API and to
 * this site's address — never the API's server key. `loading=async` with a
 * callback is Google's recommended way in; the libraries are then imported as
 * they are needed.
 */

const CALLBACK = "__amsGoogleMapsReady";

let loading: Promise<void> | null = null;
let refused = false;
const refusalListeners = new Set<() => void>();

declare global {
  interface Window {
    [CALLBACK]?: () => void;
    /** Google calls this when the key is refused: wrong key, wrong domain, or the API not enabled. */
    gm_authFailure?: () => void;
  }
}

export function loadGoogleMaps(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Google Maps only loads in a browser."));
  // Present once the bootstrap has run, whatever the types say before it has.
  if (typeof (window as { google?: { maps?: { importLibrary?: unknown } } }).google?.maps?.importLibrary === "function") {
    return Promise.resolve();
  }
  if (loading) return loading;

  loading = new Promise<void>((resolve, reject) => {
    window[CALLBACK] = () => resolve();
    window.gm_authFailure = () => {
      refused = true;
      refusalListeners.forEach((listener) => listener());
    };
    const script = document.createElement("script");
    const params = new URLSearchParams({ key: apiKey, v: "weekly", loading: "async", callback: CALLBACK });
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;
    script.onerror = () => {
      loading = null;
      script.remove();
      reject(new Error("Google Maps could not be loaded. Check the connection."));
    };
    document.head.append(script);
  });
  return loading;
}

/** Whether Google has refused the key on this page. */
export function mapsKeyRefused(): boolean {
  return refused;
}

/** Called once if Google refuses the key; returns the unsubscribe. */
export function onMapsKeyRefused(listener: () => void): () => void {
  refusalListeners.add(listener);
  return () => refusalListeners.delete(listener);
}

/** Google's demo map ID draws advanced markers while no Map ID of the project's own is set. */
export function mapIdOrDemo(mapId: string | null | undefined): string {
  return mapId?.trim() || "DEMO_MAP_ID";
}
