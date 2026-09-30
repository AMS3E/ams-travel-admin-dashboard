/**
 * Shared with the client forms, and therefore not in `actions.ts` — a
 * `"use server"` module may export only async functions.
 */
export interface PublishActionSuccess {
  readonly ok: true;
}

export interface PublishActionFailure {
  readonly ok: false;
  readonly message: string;
}

export type PublishActionResult = PublishActionSuccess | PublishActionFailure;

export const GENERIC_PUBLISH_ERROR =
  "The API rejected that. Reload the screen and try again.";
