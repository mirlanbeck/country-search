import { vi } from 'vitest';
import type { Country } from '../api/types.js';

interface PendingCall {
  query: string;
  signal: AbortSignal;
  resolve: (countries: Country[]) => void;
  reject: (error: unknown) => void;
}

/**
 * A `searchCountries` stand-in whose calls stay pending until the test settles them.
 * Like a real request, a call rejects with `signal.reason` as soon as its signal aborts.
 */
export const createDeferredSearch = () => {
  const calls: PendingCall[] = [];

  const search = vi.fn(
    (query: string, signal: AbortSignal): Promise<Country[]> =>
      new Promise<Country[]>((resolve, reject) => {
        if (signal.aborted) {
          reject(signal.reason);
          return;
        }
        signal.addEventListener('abort', () => reject(signal.reason), { once: true });
        calls.push({ query, signal, resolve, reject });
      }),
  );

  const call = (index: number): PendingCall => {
    const pending = calls[index];
    if (!pending) throw new Error(`search call #${index} was not made`);
    return pending;
  };

  return { search, call, calls };
};
