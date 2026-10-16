import { useCallback } from "react";
import { useTranslations } from "next-intl";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { SerializedError } from "@reduxjs/toolkit";
import type { ApiError, ProblemDetail } from "./types";

function isFetchError(error: unknown): error is FetchBaseQueryError {
  return typeof error === "object" && error !== null && "status" in error;
}

function readBody(data: unknown): Pick<ApiError, "message" | "fieldErrors" | "code"> {
  const fieldErrors: Record<string, string> = {};
  if (typeof data !== "object" || data === null) {
    return { message: typeof data === "string" && data.trim() ? data.trim() : null, fieldErrors };
  }
  const body = data as ProblemDetail & { message?: unknown; fieldErrors?: unknown; code?: unknown };
  for (const problem of body.errors ?? []) {
    if (problem.field) fieldErrors[problem.field] = problem.message;
  }
  if (typeof body.fieldErrors === "object" && body.fieldErrors !== null) {
    for (const [field, message] of Object.entries(body.fieldErrors)) {
      if (typeof message === "string") fieldErrors[field] = message;
    }
  }
  const said = [body.message, body.detail, body.title].find(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );
  return { message: said ?? null, fieldErrors, code: typeof body.code === "string" ? body.code : null };
}

/**
 * Any error an endpoint rejects with — a failed request, a network failure,
 * or a thrown bug — as one shape. Null for no error.
 */
export function toApiError(error: FetchBaseQueryError | SerializedError | unknown): ApiError | null {
  if (!error) return null;
  if (isFetchError(error)) {
    const status = typeof error.status === "number" ? error.status : 0;
    return { status, ...readBody("data" in error ? error.data : undefined) };
  }
  const message = error instanceof Error ? error.message : null;
  return { status: 0, message, fieldErrors: {} };
}

/** Whether a call failed with this HTTP status. */
export function hasStatus(error: unknown, status: number): boolean {
  return toApiError(error)?.status === status;
}

/** The sentences a failed call is explained in; `common.apiError` has them in each language. */
export interface ApiErrorWords {
  readonly sessionEnded: string;
  readonly forbidden: string;
  readonly gone: string;
  readonly failed: string;
  /** The dashboard's own route answers, by their `code`. */
  readonly rejected: string;
  readonly unreachable: string;
}

const ENGLISH: ApiErrorWords = {
  sessionEnded: "Your session has ended. Sign in again to continue.",
  forbidden: "You do not have permission to access this content.",
  gone: "This content is no longer available.",
  failed: "We could not load this content. Please try again.",
  rejected: "The request was rejected.",
  unreachable: "The catalogue API could not be reached.",
};

/** The sentence a screen shows for a failed call; English unless given the reader's words (see `useApiErrorMessage`). */
export function apiErrorMessage(error: unknown, words: ApiErrorWords = ENGLISH): string {
  const problem = toApiError(error);
  if (!problem) return "";
  if (problem.status === 401) return words.sessionEnded;
  if (problem.status === 403) return words.forbidden;
  if (problem.status === 404) return words.gone;
  if (problem.code === "rejected" || problem.code === "unreachable") return words[problem.code];
  return problem.message ?? words.failed;
}

/** `apiErrorMessage` in the reader's language, for a component. */
export function useApiErrorMessage(): (error: unknown) => string {
  const t = useTranslations("common.apiError");
  return useCallback(
    (error: unknown) =>
      apiErrorMessage(error, {
        sessionEnded: t("sessionEnded"),
        forbidden: t("forbidden"),
        gone: t("gone"),
        failed: t("failed"),
        rejected: t("rejected"),
        unreachable: t("unreachable"),
      }),
    [t],
  );
}

/**
 * A route's `{ ok }` answer, or — when the call itself failed (an ended
 * session, the API out of reach) — a refusal in the same shape, so a screen
 * handles both the one way it already does. Pass `useApiErrorMessage()` to
 * have the refusal in the reader's language.
 */
export async function settled<T extends { readonly ok: boolean }>(
  call: Promise<T>,
  message: (error: unknown) => string = apiErrorMessage,
): Promise<T | { readonly ok: false; readonly message: string }> {
  try {
    return await call;
  } catch (error) {
    return { ok: false, message: message(error) };
  }
}
