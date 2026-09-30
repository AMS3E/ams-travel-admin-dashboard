/**
 * What this browser has already looked at of the publishing queue.
 *
 * One mark per account — a shared computer holds two people's marks without
 * one clearing the other's badge — kept in `localStorage`, because "I have
 * seen this" is about this browser and no server needs to know it.
 *
 * Read as an external store rather than copied into state: the server renders
 * "not known yet", the browser answers with the mark once it has hydrated, and
 * a second tab that looks at the queue clears this tab's badge too. Every read
 * and write is guarded — a private window can refuse storage outright, and a
 * bell that throws would take the whole top bar down with it.
 */

const KEY = "ams-cms-requests-seen";

/** Fired in this tab on a write; `storage` covers the others. */
const CHANGED = "ams-cms-requests-seen-change";

type Marks = Record<string, string>;

function read(): Marks {
  try {
    const stored = window.localStorage.getItem(KEY);
    const parsed = stored ? (JSON.parse(stored) as unknown) : null;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Marks) : {};
  } catch {
    return {};
  }
}

/** When this account last looked, or null when it never has (or cannot be told). */
export function readSeenAt(accountId: string): string | null {
  const at = read()[accountId];
  return typeof at === "string" && at ? at : null;
}

/** Remembers that everything up to `at` has been looked at. */
export function writeSeenAt(accountId: string, at: string): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...read(), [accountId]: at }));
  } catch {
    /* A browser that will not store this still shows the right count until it is closed. */
  }
  try {
    window.dispatchEvent(new Event(CHANGED));
  } catch {
    /* Nothing to notify. */
  }
}

export function subscribeToSeen(listener: () => void): () => void {
  window.addEventListener(CHANGED, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(CHANGED, listener);
    window.removeEventListener("storage", listener);
  };
}
