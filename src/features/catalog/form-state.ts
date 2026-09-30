/**
 * Shared shapes for the catalogue form actions.
 *
 * This lives outside `actions.ts` because a `"use server"` module may only
 * export async functions — exporting the types or constants below from there
 * fails at runtime, not at build time.
 */

import type { FormValues } from "@/features/catalog/resource";
import type { ResourceKey } from "@/features/catalog/resource";

export interface SaveRecordInput {
  readonly resource: ResourceKey;
  /** The row's UUID. Absent when creating. */
  readonly id?: string;
  readonly values: FormValues;
}

export interface SaveSuccess {
  readonly ok: true;
  readonly id: string;
}

export interface SaveFailure {
  readonly ok: false;
  /** Shown above the form. */
  readonly message: string;
  /** Keyed by field name, so the form can pin the message to the control. */
  readonly fieldErrors?: Readonly<Record<string, string>>;
}

export type SaveResult = SaveSuccess | SaveFailure;

export const GENERIC_SAVE_ERROR =
  "The catalogue rejected this change. Check the fields and try again.";
