import { HttpError } from './http-error.js';
import { mapCountryResponse } from './map-country-response.js';
import type { Country, RawCountry } from './types.js';

const API_URL = 'https://countries.dev/name/';
const HTTP_NOT_FOUND = 404;

export const DEFAULT_TIMEOUT_MS = 8000;

/**
 * Searches countries by name.
 *
 * - `signal` lets the caller cancel the request (rejects with `AbortError`).
 * - After `timeoutMs` the request is aborted too (rejects with `TimeoutError`).
 * - 404 means "no matches" and resolves with `[]`; any other non-OK status throws `HttpError`.
 */
export async function searchCountries(
  query: string,
  signal: AbortSignal,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Country[]> {
  const response = await fetch(`${API_URL}${encodeURIComponent(query)}`, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]),
  });

  if (response.status === HTTP_NOT_FOUND) {
    return [];
  }

  if (!response.ok) {
    throw new HttpError(response.status);
  }

  const raw = (await response.json()) as RawCountry[];
  return mapCountryResponse(raw);
}
