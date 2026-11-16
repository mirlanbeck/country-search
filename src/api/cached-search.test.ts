import { describe, expect, it } from 'vitest';
import { createDeferredSearch } from '../test-utils/deferred-search.js';
import { antarcticaRaw, spainRaw } from './__fixtures__/countries.js';
import { createCachedSearch } from './cached-search.js';
import { HttpError } from './http-error.js';
import { mapCountryResponse } from './map-country-response.js';

const spain = mapCountryResponse([spainRaw]);
const antarctica = mapCountryResponse([antarcticaRaw]);

const newSignal = () => new AbortController().signal;

const setup = (maxEntries?: number) => {
  const deferred = createDeferredSearch();
  const cachedSearch = createCachedSearch(deferred.search, { maxEntries });
  return { ...deferred, cachedSearch };
};

describe('createCachedSearch', () => {
  describe('delegation', () => {
    it('calls the underlying search with the query and a signal', () => {
      const { cachedSearch, search } = setup();

      void cachedSearch('spain', newSignal());

      expect(search).toHaveBeenCalledTimes(1);
      expect(search).toHaveBeenCalledWith('spain', expect.any(AbortSignal));
    });

    it('resolves with the underlying result', async () => {
      const { cachedSearch, call } = setup();

      const promise = cachedSearch('spain', newSignal());
      call(0).resolve(spain);

      await expect(promise).resolves.toEqual(spain);
    });

    it('sends separate requests for different queries', () => {
      const { cachedSearch, search } = setup();

      void cachedSearch('spain', newSignal());
      void cachedSearch('antarctica', newSignal());

      expect(search).toHaveBeenCalledTimes(2);
    });
  });

  describe('cache', () => {
    it('serves a repeated query from the cache without a new request', async () => {
      const { cachedSearch, call, search } = setup();

      const first = cachedSearch('spain', newSignal());
      call(0).resolve(spain);
      await first;

      await expect(cachedSearch('spain', newSignal())).resolves.toEqual(spain);
      expect(search).toHaveBeenCalledTimes(1);
    });

    it('treats queries that differ only in letter case as the same', async () => {
      const { cachedSearch, call, search } = setup();

      const first = cachedSearch('Spain', newSignal());
      call(0).resolve(spain);
      await first;

      await expect(cachedSearch('spain', newSignal())).resolves.toEqual(spain);
      expect(search).toHaveBeenCalledTimes(1);
    });

    it('caches "no matches" (an empty result) too', async () => {
      const { cachedSearch, call, search } = setup();

      const first = cachedSearch('zzzz', newSignal());
      call(0).resolve([]);
      await first;

      await expect(cachedSearch('zzzz', newSignal())).resolves.toEqual([]);
      expect(search).toHaveBeenCalledTimes(1);
    });

    it('does not cache errors: the next call sends a new request', async () => {
      const { cachedSearch, call, search } = setup();

      const first = cachedSearch('spain', newSignal());
      call(0).reject(new HttpError(500));
      await expect(first).rejects.toBeInstanceOf(HttpError);

      const second = cachedSearch('spain', newSignal());
      call(1).resolve(spain);

      await expect(second).resolves.toEqual(spain);
      expect(search).toHaveBeenCalledTimes(2);
    });

    it('a cache hit still respects an already aborted signal', async () => {
      const { cachedSearch, call } = setup();

      const first = cachedSearch('spain', newSignal());
      call(0).resolve(spain);
      await first;

      const controller = new AbortController();
      controller.abort();

      await expect(cachedSearch('spain', controller.signal)).rejects.toHaveProperty(
        'name',
        'AbortError',
      );
    });

    it('evicts the least recently used entry when full', async () => {
      const { cachedSearch, call, search } = setup(2);

      const a = cachedSearch('a', newSignal());
      call(0).resolve(spain);
      await a;
      const b = cachedSearch('b', newSignal());
      call(1).resolve(antarctica);
      await b;

      await cachedSearch('a', newSignal()); // "a" becomes the most recently used
      const c = cachedSearch('c', newSignal()); // evicts "b"
      call(2).resolve([]);
      await c;

      await cachedSearch('a', newSignal());
      expect(search).toHaveBeenCalledTimes(3);

      void cachedSearch('b', newSignal());
      expect(search).toHaveBeenCalledTimes(4);
    });
  });

  describe('deduplication of concurrent identical requests', () => {
    it('reuses the in-flight request instead of sending a second one', async () => {
      const { cachedSearch, call, search } = setup();

      const first = cachedSearch('spain', newSignal());
      const second = cachedSearch('spain', newSignal());
      call(0).resolve(spain);

      await expect(first).resolves.toEqual(spain);
      await expect(second).resolves.toEqual(spain);
      expect(search).toHaveBeenCalledTimes(1);
    });

    it('shares an error with every waiting caller', async () => {
      const { cachedSearch, call } = setup();

      const first = cachedSearch('spain', newSignal());
      const second = cachedSearch('spain', newSignal());
      call(0).reject(new HttpError(503));

      await expect(first).rejects.toHaveProperty('status', 503);
      await expect(second).rejects.toHaveProperty('status', 503);
    });

    it('aborting one caller rejects only that caller; the others still get the result', async () => {
      const { cachedSearch, call } = setup();
      const leaving = new AbortController();

      const first = cachedSearch('spain', leaving.signal);
      const second = cachedSearch('spain', newSignal());
      leaving.abort();

      await expect(first).rejects.toHaveProperty('name', 'AbortError');
      expect(call(0).signal.aborted).toBe(false);

      call(0).resolve(spain);
      await expect(second).resolves.toEqual(spain);
    });

    it('aborts the shared request once every caller has aborted', async () => {
      const { cachedSearch, call } = setup();
      const one = new AbortController();
      const two = new AbortController();

      const first = cachedSearch('spain', one.signal);
      const second = cachedSearch('spain', two.signal);
      one.abort();
      two.abort();

      await expect(first).rejects.toHaveProperty('name', 'AbortError');
      await expect(second).rejects.toHaveProperty('name', 'AbortError');
      expect(call(0).signal.aborted).toBe(true);
    });

    it('starts a fresh request after the shared one was fully aborted', async () => {
      const { cachedSearch, call, search } = setup();
      const controller = new AbortController();

      const first = cachedSearch('spain', controller.signal);
      controller.abort();
      await expect(first).rejects.toHaveProperty('name', 'AbortError');

      const second = cachedSearch('spain', newSignal());
      call(1).resolve(spain);

      await expect(second).resolves.toEqual(spain);
      expect(search).toHaveBeenCalledTimes(2);
    });

    it('rejects at once and sends nothing when the signal is already aborted', async () => {
      const { cachedSearch, search } = setup();
      const controller = new AbortController();
      controller.abort();

      await expect(cachedSearch('spain', controller.signal)).rejects.toHaveProperty(
        'name',
        'AbortError',
      );
      expect(search).not.toHaveBeenCalled();
    });
  });
});
