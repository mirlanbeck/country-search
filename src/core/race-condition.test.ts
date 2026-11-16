import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { antarcticaRaw, spainRaw } from '../api/__fixtures__/countries.js';
import { mapCountryResponse } from '../api/map-country-response.js';
import { searchCountries } from '../api/search-countries.js';
import type { RawCountry } from '../api/types.js';
import { deferredResponse, jsonResponse } from '../test-utils/fetch-mock.js';
import { createSearchController, type SearchState } from './search-controller.js';

const DEBOUNCE_MS = 300;

interface FakeEndpoint {
  body: RawCountry[];
  /** How long the "server" takes to answer this query. */
  delayMs: number;
}

/**
 * `fetch` mock where each query has its own response time, so an earlier request
 * can be made to resolve AFTER a later one. Like the real `fetch`, it rejects with
 * `AbortError` when its signal is aborted before the response arrives.
 */
const createRacingFetch = (endpoints: Record<string, FakeEndpoint>) =>
  vi.fn<typeof fetch>((input, init) => {
    const query = decodeURIComponent(String(input).split('/name/')[1] ?? '');
    const endpoint = endpoints[query];
    if (!endpoint) throw new Error(`Unexpected query "${query}"`);
    return deferredResponse(() => jsonResponse(endpoint.body), endpoint.delayMs, init?.signal);
  });

const signalOf = (fetchMock: ReturnType<typeof createRacingFetch>, call: number): AbortSignal => {
  const signal = fetchMock.mock.calls[call]?.[1]?.signal;
  if (!signal) throw new Error(`fetch call #${call} had no signal`);
  return signal;
};

const setup = (endpoints: Record<string, FakeEndpoint>) => {
  const fetchMock = createRacingFetch(endpoints);
  vi.stubGlobal('fetch', fetchMock);

  const states: SearchState[] = [];
  const controller = createSearchController({
    search: searchCountries,
    debounceMs: DEBOUNCE_MS,
    onChange: (state) => states.push(state),
  });

  return { fetchMock, states, controller };
};

const successQueries = (states: SearchState[]) =>
  states.flatMap((state) => (state.status === 'success' ? [state.query] : []));

describe('race condition: a stale response must never win', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('"sp" answering after "spain" does not overwrite the "spain" results', async () => {
    const { fetchMock, states, controller } = setup({
      sp: { body: [antarcticaRaw], delayMs: 1000 }, // slow: would arrive last
      spain: { body: [spainRaw], delayMs: 100 }, // fast: arrives first
    });

    controller.setQuery('sp');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS); // request "sp" is in flight

    controller.setQuery('spain');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS); // request "spain" is in flight

    await vi.advanceTimersByTimeAsync(2000); // both responses would have arrived by now

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(signalOf(fetchMock, 0).aborted).toBe(true);
    expect(signalOf(fetchMock, 1).aborted).toBe(false);

    expect(controller.getState()).toEqual({
      status: 'success',
      query: 'spain',
      countries: mapCountryResponse([spainRaw]),
    });
    expect(successQueries(states)).toEqual(['spain']);
    expect(states.map((state) => state.status)).not.toContain('error');
  });

  it('the stale request is aborted at the moment of input, not when the next request fires', async () => {
    const { fetchMock, controller } = setup({
      sp: { body: [antarcticaRaw], delayMs: 1000 },
      spain: { body: [spainRaw], delayMs: 100 },
    });

    controller.setQuery('sp');
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

    controller.setQuery('spain');

    expect(fetchMock).toHaveBeenCalledTimes(1); // "spain" is still waiting for the debounce
    expect(signalOf(fetchMock, 0).aborted).toBe(true);
  });

  it('slow character-by-character typing: only the last query reaches the screen', async () => {
    const typed = ['s', 'sp', 'spa', 'spai', 'spain'];
    const { fetchMock, states, controller } = setup({
      // Each earlier query is slower than the next one: worst case for a race.
      s: { body: [antarcticaRaw], delayMs: 2500 },
      sp: { body: [antarcticaRaw], delayMs: 2000 },
      spa: { body: [antarcticaRaw], delayMs: 1500 },
      spai: { body: [antarcticaRaw], delayMs: 1000 },
      spain: { body: [spainRaw], delayMs: 50 },
    });

    for (const query of typed) {
      controller.setQuery(query);
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS + 50); // each keystroke fires its own request
    }
    await vi.advanceTimersByTimeAsync(5000);

    expect(fetchMock).toHaveBeenCalledTimes(typed.length);
    typed.slice(0, -1).forEach((_query, index) => {
      expect(signalOf(fetchMock, index).aborted).toBe(true);
    });
    expect(signalOf(fetchMock, typed.length - 1).aborted).toBe(false);

    expect(controller.getState()).toMatchObject({ status: 'success', query: 'spain' });
    expect(successQueries(states)).toEqual(['spain']);
    expect(states.map((state) => state.status)).not.toContain('error');
  });
});
