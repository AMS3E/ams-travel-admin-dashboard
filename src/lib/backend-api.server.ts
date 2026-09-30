import "server-only";

export class BackendApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
  ) {
    super(detail);
  }
}

function backendBaseUrl(): string {
  const value = process.env.API_BASE_URL?.trim().replace(/\/$/, "");
  if (!value) {
    throw new Error("API_BASE_URL is required. AMS Travel does not use mock data.");
  }
  return value;
}

export function backendUrl(path: string): string {
  return `${backendBaseUrl()}${path}`;
}

/**
 * Every dashboard request is a read-your-writes read: an editor saves a row and
 * expects the list beside it to show the new value. Nothing here is cached.
 */
export async function backendRequest<T>(
  path: string,
  init: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(backendUrl(path), {
    ...init,
    headers,
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new BackendApiError(response.status, detail || response.statusText);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}