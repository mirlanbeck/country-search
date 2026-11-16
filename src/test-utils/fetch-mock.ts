import { vi } from 'vitest';

export const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const textResponse = (body: string, status: number): Response =>
  new Response(body, { status, headers: { 'Content-Type': 'text/plain' } });

/**
 * Resolves after `delayMs` like a real request, or never when `delayMs` is `null`.
 * Like the real `fetch`, it reacts to `init.signal`: on abort it rejects with
 * `signal.reason` (an `AbortError` or `TimeoutError` DOMException).
 */
export const deferredResponse = (
  response: () => Response,
  delayMs: number | null,
  signal: AbortSignal | null | undefined,
): Promise<Response> =>
  new Promise<Response>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }

    const timerId = delayMs === null ? undefined : setTimeout(() => resolve(response()), delayMs);

    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timerId);
        reject(signal.reason);
      },
      { once: true },
    );
  });

/** A `fetch` mock that answers every request with `response` after `delayMs`. */
export const mockFetch = (response: () => Response, delayMs: number | null = 0) =>
  vi.fn<typeof fetch>((_input, init) => deferredResponse(response, delayMs, init?.signal));
