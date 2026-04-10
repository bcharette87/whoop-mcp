/**
 * Shared types and utilities for collection tool handlers.
 *
 * All 4 collection tools (recovery, sleep, workout, cycle) use the same
 * query parameter shape and query string building logic.
 */

/** Input params shared by all collection endpoints */
export interface CollectionParams {
  start?: string;
  end?: string;
  limit?: number;
  nextToken?: string;
}

/**
 * Build a query string from collection params.
 * Omits undefined values. Returns empty string if no params are set.
 *
 * @param params - Optional collection query parameters
 * @returns Query string (e.g. "?start=...&limit=5") or empty string
 */
export function buildCollectionQuery(params: CollectionParams): string {
  const searchParams = new URLSearchParams();

  if (params.start !== undefined) {
    searchParams.set("start", params.start);
  }
  if (params.end !== undefined) {
    searchParams.set("end", params.end);
  }
  if (params.limit !== undefined) {
    searchParams.set("limit", String(params.limit));
  }
  if (params.nextToken !== undefined) {
    searchParams.set("nextToken", params.nextToken);
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}
