import type { Country, SearchFn } from './types.js';

export interface CachedSearchOptions {
  /** How many queries to keep; the least recently used one is evicted first. */
  maxEntries?: number | undefined;
}

interface InFlight {
  promise: Promise<Country[]>;
  controller: AbortController;
  /** Callers still waiting for this request. When it drops to 0 the request is aborted. */
  waiting: number;
}

export const DEFAULT_CACHE_SIZE = 100;

const toKey = (query: string): string => query.trim().toLowerCase();

/**
 * Lets one caller stop waiting for a shared promise without cancelling it for the others.
 * Rejects with the caller's `signal.reason` (an `AbortError`) on abort.
 */
function waitWithSignal<T>(
  promise: Promise<T>,
  signal: AbortSignal,
  onAbort: () => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const abort = () => {
      onAbort();
      reject(signal.reason);
    };
    signal.addEventListener('abort', abort, { once: true });

    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}

/**
 * Wraps a search function with:
 * - an LRU cache of successful results, keyed by the normalized query;
 * - deduplication: concurrent calls for the same query share one request.
 * Every caller keeps its own signal: aborting one never breaks the others,
 * and the shared request is aborted only when nobody is waiting for it anymore.
 */
export function createCachedSearch(
  search: SearchFn,
  { maxEntries = DEFAULT_CACHE_SIZE }: CachedSearchOptions = {},
): SearchFn {
  const cache = new Map<string, Country[]>();
  const inFlight = new Map<string, InFlight>();

  const remember = (key: string, countries: Country[]): void => {
    cache.delete(key);
    cache.set(key, countries);
    if (cache.size > maxEntries) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey !== undefined) cache.delete(oldestKey);
    }
  };

  const startRequest = (key: string, query: string): InFlight => {
    const controller = new AbortController();
    const entry: InFlight = {
      controller,
      waiting: 0,
      promise: search(query, controller.signal).then((countries) => {
        remember(key, countries);
        return countries;
      }),
    };
    const forget = () => {
      if (inFlight.get(key) === entry) inFlight.delete(key);
    };
    entry.promise.then(forget, forget);
    inFlight.set(key, entry);
    return entry;
  };

  return (query, signal) => {
    if (signal.aborted) return Promise.reject(signal.reason);

    const key = toKey(query);
    const cached = cache.get(key);
    if (cached) {
      remember(key, cached);
      return Promise.resolve(cached);
    }

    const entry = inFlight.get(key) ?? startRequest(key, query);
    entry.waiting += 1;

    return waitWithSignal(entry.promise, signal, () => {
      entry.waiting -= 1;
      if (entry.waiting === 0) {
        inFlight.delete(key);
        entry.controller.abort();
      }
    });
  };
}
