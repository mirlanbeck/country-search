import { describe, expect, it } from 'vitest';
import { classifyError, isAbortError } from './classify-error.js';
import { HttpError } from './http-error.js';

/** The exact error `fetch` rejects with after `controller.abort()`. */
const realAbortError = (): unknown => {
  const controller = new AbortController();
  controller.abort();
  return controller.signal.reason;
};

const timeoutError = () => new DOMException('The operation timed out.', 'TimeoutError');

describe('isAbortError', () => {
  it('is true for the reason of controller.abort()', () => {
    expect(isAbortError(realAbortError())).toBe(true);
  });

  it('is true for an Error named AbortError (older environments)', () => {
    const error = new Error('aborted');
    error.name = 'AbortError';

    expect(isAbortError(error)).toBe(true);
  });

  it('is false for a TimeoutError', () => {
    expect(isAbortError(timeoutError())).toBe(false);
  });

  it.each([
    ['HttpError', new HttpError(500)],
    ['TypeError', new TypeError('Failed to fetch')],
    ['string', 'AbortError'],
    ['null', null],
    ['undefined', undefined],
  ])('is false for %s', (_label, error) => {
    expect(isAbortError(error)).toBe(false);
  });
});

describe('classifyError', () => {
  describe('self-cancellation (AbortError)', () => {
    it('is "aborted" and is hidden from the user', () => {
      const result = classifyError(realAbortError());

      expect(result.kind).toBe('aborted');
      expect(result.showToUser).toBe(false);
      expect(result.retryable).toBe(false);
    });
  });

  describe('no matches (404)', () => {
    it('is "not-found", shown as a friendly message, not as an error', () => {
      const result = classifyError(new HttpError(404));

      expect(result.kind).toBe('not-found');
      expect(result.showToUser).toBe(true);
      expect(result.retryable).toBe(false);
      expect(result.message).not.toBe('');
    });
  });

  describe('timeout (TimeoutError)', () => {
    it('is "timeout", a real error with retry', () => {
      const result = classifyError(timeoutError());

      expect(result.kind).toBe('timeout');
      expect(result.showToUser).toBe(true);
      expect(result.retryable).toBe(true);
      expect(result.message).not.toBe('');
    });

    it('is not confused with self-cancellation', () => {
      expect(classifyError(timeoutError()).kind).not.toBe('aborted');
    });
  });

  describe('HTTP errors (non-OK, not 404)', () => {
    it.each([400, 429, 500, 503])('status %i is "http", a real error with retry', (status) => {
      const result = classifyError(new HttpError(status));

      expect(result.kind).toBe('http');
      expect(result.showToUser).toBe(true);
      expect(result.retryable).toBe(true);
    });

    it('mentions the status in the message', () => {
      expect(classifyError(new HttpError(503)).message).toContain('503');
    });
  });

  describe('network errors', () => {
    it('a TypeError from fetch is "network", a real error with retry', () => {
      const result = classifyError(new TypeError('Failed to fetch'));

      expect(result.kind).toBe('network');
      expect(result.showToUser).toBe(true);
      expect(result.retryable).toBe(true);
      expect(result.message).not.toBe('');
    });
  });

  describe('anything else', () => {
    it.each([
      ['a generic Error', new Error('boom')],
      ['a string', 'boom'],
      ['undefined', undefined],
    ])('%s is "unknown", a real error with retry', (_label, error) => {
      const result = classifyError(error);

      expect(result.kind).toBe('unknown');
      expect(result.showToUser).toBe(true);
      expect(result.retryable).toBe(true);
      expect(result.message).not.toBe('');
    });
  });
});
