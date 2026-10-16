/*
 * The shapes every API call of the dashboard shares, whichever layer answered.
 *
 * Spring answers errors as RFC 9457 problem details, with an `errors` list for
 * a request that failed validation. The dashboard's own route handlers — which
 * hold the session and forward to Spring — answer `{ message }` (their
 * `toErrorResponse`), and a save that Spring or the registry refused answers
 * `{ ok: false, message, fieldErrors }` with 200 for the form to show.
 */

/** One field Spring refused, as its validation advice names it. */
export interface FieldProblem {
  readonly field: string | null;
  readonly label: string | null;
  readonly message: string;
}

/** An RFC 9457 problem, as Spring answers any error. */
export interface ProblemDetail {
  readonly type?: string;
  readonly title?: string;
  readonly status?: number;
  readonly detail?: string;
  readonly instance?: string;
  readonly errors?: readonly FieldProblem[];
}

/** Any failed call, reduced to what a screen needs to say about it. */
export interface ApiError {
  /** The HTTP status, or 0 when no answer came back (offline, aborted). */
  readonly status: number;
  /** A sentence from the server, when it gave one. */
  readonly message: string | null;
  /** Field name → message, for a request that failed validation. */
  readonly fieldErrors: Readonly<Record<string, string>>;
  /** What a dashboard route said went wrong, when it said it without a sentence of the API's. */
  readonly code?: string | null;
}

/**
 * One page of a list, as `GET /api/catalog/{resource}?page=&size=` answers it.
 * Spring's list endpoints return whole arrays, so the dashboard's route
 * handler searches, filters, sorts and slices them server-side, never here.
 */
export interface PaginatedResponse<T> {
  readonly content: readonly T[];
  readonly totalElements: number;
  readonly totalPages: number;
}

/** A write a route handler answers in the form's own terms, refusals included. */
export type WriteResult<T extends object = object> =
  | ({ readonly ok: true } & T)
  | { readonly ok: false; readonly message: string; readonly fieldErrors?: Readonly<Record<string, string>> };
