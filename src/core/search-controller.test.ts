import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { antarcticaRaw, spainRaw } from '../api/__fixtures__/countries.js';
import { HttpError } from '../api/http-error.js';
import { mapCountryResponse } from '../api/map-country-response.js';
import { createDeferredSearch } from '../test-utils/deferred-search.js';
import { createSearchController } from './search-controller.js';

const DEBOUNCE_MS = 300;
const [spain, antarctica] = mapCountryResponse([spainRaw, antarcticaRaw]);
const countries = [spain!, antarctica!];

const setup = () => {
  const deferred = createDeferredSearch();
  const onChange = vi.fn();
  const controller = createSearchController({
    search: deferred.search,
    debounceMs: DEBOUNCE_MS,
    onChange,
  });
  return { ...deferred, onChange, controller };
};

/** Lets pending promise callbacks run. */
const flush = () => vi.advanceTimersByTimeAsync(0);

describe('createSearchController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('empty input', () => {
    it('starts idle', () => {
      const { controller } = setup();

      expect(controller.getState()).toEqual({ status: 'idle' });
    });

    it.each(['', '   '])('sends no request for %j and stays idle', async (query) => {
      const { controller, search } = setup();

      controller.setQuery(query);
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

      expect(search).not.toHaveBeenCalled();
      expect(controller.getState()).toEqual({ status: 'idle' });
    });
  });

  describe('debounced search', () => {
    it('shows loading right away but waits for the debounce before searching', async () => {
      const { controller, search } = setup();

      controller.setQuery('spain');

      expect(controller.getState()).toEqual({ status: 'loading', query: 'spain' });
      expect(search).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

      expect(search).toHaveBeenCalledTimes(1);
      expect(search).toHaveBeenCalledWith('spain', expect.any(AbortSignal));
    });

    it('trims the query', async () => {
      const { controller, search } = setup();

      controller.setQuery('  spain  ');
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

      expect(search).toHaveBeenCalledWith('spain', expect.any(AbortSignal));
    });

    it('sends one request for a burst of typing', async () => {
      const { controller, search } = setup();

      controller.setQuery('s');
      controller.setQuery('sp');
      controller.setQuery('spa');
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

      expect(search).toHaveBeenCalledTimes(1);
      expect(search).toHaveBeenCalledWith('spa', expect.any(AbortSignal));
    });
  });

  describe('results', () => {
    it('shows countries on success', async () => {
      const { controller, call } = setup();

      controller.setQuery('a');
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
      call(0).resolve(countries);
      await flush();

      expect(controller.getState()).toEqual({ status: 'success', query: 'a', countries });
    });

    it('shows "empty" (not an error) when nothing matches', async () => {
      const { controller, call } = setup();

      controller.setQuery('zzzz');
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
      call(0).resolve([]);
      await flush();

      expect(controller.getState()).toEqual({ status: 'empty', query: 'zzzz' });
    });
  });

  describe('errors', () => {
    it.each([
      ['HttpError 500', new HttpError(500)],
      ['TimeoutError', new DOMException('timed out', 'TimeoutError')],
      ['network error', new TypeError('Failed to fetch')],
    ])('shows a retryable error for %s', async (_label, error) => {
      const { controller, call } = setup();

      controller.setQuery('spain');
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
      call(0).reject(error);
      await flush();

      expect(controller.getState()).toMatchObject({
        status: 'error',
        query: 'spain',
        retryable: true,
      });
    });

    it('shows "empty" for an HttpError 404', async () => {
      const { controller, call } = setup();

      controller.setQuery('zzzz');
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
      call(0).reject(new HttpError(404));
      await flush();

      expect(controller.getState()).toEqual({ status: 'empty', query: 'zzzz' });
    });
  });

  describe('cancellation', () => {
    it('aborts the in-flight request on the very next input, before the debounce fires', async () => {
      const { controller, call } = setup();

      controller.setQuery('spain');
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
      controller.setQuery('spai');

      expect(call(0).signal.aborted).toBe(true);
    });

    it('never turns its own cancellation into an error', async () => {
      const { controller, onChange } = setup();

      controller.setQuery('spain');
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
      controller.setQuery('spai');
      await flush();

      const statuses = onChange.mock.calls.map(([state]) => state.status);
      expect(statuses).not.toContain('error');
      expect(controller.getState()).toEqual({ status: 'loading', query: 'spai' });
    });

    it('clearing the input aborts the request and returns to idle', async () => {
      const { controller, call } = setup();

      controller.setQuery('spain');
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
      controller.setQuery('');
      await flush();

      expect(call(0).signal.aborted).toBe(true);
      expect(controller.getState()).toEqual({ status: 'idle' });
    });

    it('clearing the input cancels a pending debounced search', async () => {
      const { controller, search } = setup();

      controller.setQuery('spain');
      controller.setQuery('');
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

      expect(search).not.toHaveBeenCalled();
    });

    it('dispose() aborts the request and cancels a pending search', async () => {
      const { controller, call, search } = setup();

      controller.setQuery('spain');
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
      controller.setQuery('spai');
      controller.dispose();
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);

      expect(call(0).signal.aborted).toBe(true);
      expect(search).toHaveBeenCalledTimes(1);
    });
  });

  describe('retry', () => {
    it('repeats the last query immediately with a fresh signal', async () => {
      const { controller, call, search } = setup();

      controller.setQuery('spain');
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
      call(0).reject(new HttpError(500));
      await flush();

      controller.retry();

      expect(controller.getState()).toEqual({ status: 'loading', query: 'spain' });
      expect(search).toHaveBeenCalledTimes(2);
      expect(call(1).query).toBe('spain');
      expect(call(1).signal).not.toBe(call(0).signal);
      expect(call(1).signal.aborted).toBe(false);

      call(1).resolve(countries);
      await flush();

      expect(controller.getState()).toEqual({ status: 'success', query: 'spain', countries });
    });

    it('does nothing when there is no query', () => {
      const { controller, search } = setup();

      controller.retry();

      expect(search).not.toHaveBeenCalled();
      expect(controller.getState()).toEqual({ status: 'idle' });
    });
  });

  describe('onChange', () => {
    it('is called with every new state', async () => {
      const { controller, call, onChange } = setup();

      controller.setQuery('a');
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
      call(0).resolve(countries);
      await flush();

      expect(onChange.mock.calls.map(([state]) => state.status)).toEqual(['loading', 'success']);
    });
  });
});
