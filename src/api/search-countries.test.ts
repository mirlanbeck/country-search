import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, textResponse } from '../test-utils/fetch-mock.js';
import { antarcticaRaw, spainRaw } from './__fixtures__/countries.js';
import { HttpError } from './http-error.js';
import { mapCountryResponse } from './map-country-response.js';
import { searchCountries } from './search-countries.js';

const API_URL = 'https://countries.dev/name/';

const stubFetch = (fetchMock: typeof fetch) => {
  vi.stubGlobal('fetch', fetchMock);
};

/** The `init` object `searchCountries` passed to `fetch` on the given call. */
const requestInit = (fetchMock: ReturnType<typeof mockFetch>, call = 0): RequestInit => {
  const init = fetchMock.mock.calls[call]?.[1];
  if (!init) throw new Error(`fetch call #${call} had no init`);
  return init;
};

describe('searchCountries', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('request', () => {
    it('requests countries.dev/name/{query}', async () => {
      const fetchMock = mockFetch(() => jsonResponse([spainRaw]));
      stubFetch(fetchMock);

      await searchCountries('spain', new AbortController().signal);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0]?.[0]).toBe(`${API_URL}spain`);
    });

    it('URL-encodes the query', async () => {
      const fetchMock = mockFetch(() => jsonResponse([]));
      stubFetch(fetchMock);

      await searchCountries('south africa/?', new AbortController().signal);

      expect(fetchMock.mock.calls[0]?.[0]).toBe(`${API_URL}south%20africa%2F%3F`);
    });

    it('passes an AbortSignal to fetch', async () => {
      const fetchMock = mockFetch(() => jsonResponse([]));
      stubFetch(fetchMock);

      await searchCountries('spain', new AbortController().signal);

      expect(requestInit(fetchMock).signal).toBeInstanceOf(AbortSignal);
    });
  });

  describe('successful response', () => {
    it('resolves with mapped countries on 200', async () => {
      stubFetch(mockFetch(() => jsonResponse([spainRaw, antarcticaRaw])));

      const result = await searchCountries('a', new AbortController().signal);

      expect(result).toEqual(mapCountryResponse([spainRaw, antarcticaRaw]));
    });

    it('resolves with an empty array on 404 (no matches is not an error)', async () => {
      stubFetch(mockFetch(() => textResponse('Country not found', 404)));

      const result = await searchCountries('zzzz', new AbortController().signal);

      expect(result).toEqual([]);
    });
  });

  describe('HTTP errors', () => {
    it.each([400, 429, 500, 502, 503])('rejects with HttpError on status %i', async (status) => {
      stubFetch(mockFetch(() => textResponse('Oops', status)));

      const promise = searchCountries('spain', new AbortController().signal);

      await expect(promise).rejects.toBeInstanceOf(HttpError);
      await expect(promise).rejects.toHaveProperty('status', status);
    });
  });

  describe('network errors', () => {
    it('rejects with the original error when fetch fails', async () => {
      const networkError = new TypeError('Failed to fetch');
      stubFetch(vi.fn<typeof fetch>().mockRejectedValue(networkError));

      await expect(searchCountries('spain', new AbortController().signal)).rejects.toBe(
        networkError,
      );
    });
  });

  describe('cancellation', () => {
    it('aborts the request when the caller aborts its signal', async () => {
      const fetchMock = mockFetch(() => jsonResponse([spainRaw]), null);
      stubFetch(fetchMock);
      const controller = new AbortController();

      const promise = searchCountries('spain', controller.signal);
      controller.abort();

      await expect(promise).rejects.toHaveProperty('name', 'AbortError');
      expect(requestInit(fetchMock).signal?.aborted).toBe(true);
    });

    it('rejects with AbortError when the signal is already aborted', async () => {
      stubFetch(mockFetch(() => jsonResponse([spainRaw])));
      const controller = new AbortController();
      controller.abort();

      await expect(searchCountries('spain', controller.signal)).rejects.toHaveProperty(
        'name',
        'AbortError',
      );
    });
  });

  describe('timeout', () => {
    it('rejects with TimeoutError when the server does not answer in time', async () => {
      const fetchMock = mockFetch(() => jsonResponse([spainRaw]), null);
      stubFetch(fetchMock);

      const promise = searchCountries('spain', new AbortController().signal, 20);

      await expect(promise).rejects.toHaveProperty('name', 'TimeoutError');
      expect(requestInit(fetchMock).signal?.aborted).toBe(true);
    });

    it('does not time out when the response arrives in time', async () => {
      stubFetch(mockFetch(() => jsonResponse([spainRaw]), 5));

      const result = await searchCountries('spain', new AbortController().signal, 200);

      expect(result).toHaveLength(1);
    });
  });
});
