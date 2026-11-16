import { describe, expect, it } from 'vitest';
import { HttpError } from './http-error.js';

describe('HttpError', () => {
  it('is an Error', () => {
    const error = new HttpError(500);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(HttpError);
  });

  it('stores the response status', () => {
    expect(new HttpError(503).status).toBe(503);
  });

  it('has the name "HttpError"', () => {
    expect(new HttpError(500).name).toBe('HttpError');
  });

  it('has a default message containing the status', () => {
    expect(new HttpError(502).message).toContain('502');
  });

  it('accepts a custom message', () => {
    expect(new HttpError(500, 'Server is down').message).toBe('Server is down');
  });
});
