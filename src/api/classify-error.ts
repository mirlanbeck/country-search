import { HttpError } from './http-error.js';

const HTTP_NOT_FOUND = 404;

export type SearchErrorKind = 'aborted' | 'not-found' | 'timeout' | 'http' | 'network' | 'unknown';

export interface ClassifiedError {
  kind: SearchErrorKind;
  /** `false` only for self-cancellation: the user must never see it. */
  showToUser: boolean;
  /** Whether the UI should offer a "Retry" button. */
  retryable: boolean;
  message: string;
}

/** `DOMException` and `Error` both carry `name`; that is how abort and timeout are told apart. */
const hasErrorName = (error: unknown, name: string): boolean =>
  typeof error === 'object' && error !== null && 'name' in error && error.name === name;

/** Our own cancellation (`controller.abort()`), as opposed to a timeout or a failure. */
export const isAbortError = (error: unknown): boolean => hasErrorName(error, 'AbortError');

const isTimeoutError = (error: unknown): boolean => hasErrorName(error, 'TimeoutError');

const realError = (kind: SearchErrorKind, message: string): ClassifiedError => ({
  kind,
  showToUser: true,
  retryable: true,
  message,
});

/** Maps anything thrown by a search into what the UI should do about it. */
export function classifyError(error: unknown): ClassifiedError {
  if (isAbortError(error)) {
    return { kind: 'aborted', showToUser: false, retryable: false, message: '' };
  }

  if (error instanceof HttpError && error.status === HTTP_NOT_FOUND) {
    return {
      kind: 'not-found',
      showToUser: true,
      retryable: false,
      message: 'No countries found. Try a different name.',
    };
  }

  if (isTimeoutError(error)) {
    return realError('timeout', 'The server took too long to respond.');
  }

  if (error instanceof HttpError) {
    return realError('http', `The server responded with an error (${error.status}).`);
  }

  if (error instanceof TypeError) {
    return realError('network', 'Network error. Check your connection.');
  }

  return realError('unknown', 'Something went wrong.');
}
