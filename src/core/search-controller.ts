import { classifyError } from '../api/classify-error.js';
import { DEFAULT_TIMEOUT_MS, searchCountries } from '../api/search-countries.js';
import type { Country, SearchFn } from '../api/types.js';
import { debounce } from '../utils/debounce.js';

export const DEFAULT_DEBOUNCE_MS = 300;

export type SearchState =
  | { status: 'idle' }
  | { status: 'loading'; query: string }
  | { status: 'success'; query: string; countries: Country[] }
  | { status: 'empty'; query: string }
  | { status: 'error'; query: string; message: string; retryable: boolean };

export interface SearchControllerOptions {
  search?: SearchFn;
  debounceMs?: number;
  onChange?: (state: SearchState) => void;
}

export interface SearchController {
  /** Call on every input change. Aborts the request in flight right away. */
  setQuery(rawQuery: string): void;
  /** Searches right away, skipping the debounce (e.g. a click on a history item). */
  searchNow(rawQuery: string): void;
  /** Repeats the last entered query immediately. */
  retry(): void;
  getState(): SearchState;
  /** Aborts everything; the controller must not be used afterwards. */
  dispose(): void;
}

const defaultSearch: SearchFn = (query, signal) =>
  searchCountries(query, signal, DEFAULT_TIMEOUT_MS);

/**
 * DOM-free search logic: debounce, real cancellation via AbortController,
 * and mapping of results/errors into a single UI state.
 */
export function createSearchController({
  search = defaultSearch,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  onChange = () => {},
}: SearchControllerOptions = {}): SearchController {
  let state: SearchState = { status: 'idle' };
  let lastQuery = '';
  let activeRequest: AbortController | null = null;

  const setState = (next: SearchState): void => {
    state = next;
    onChange(state);
  };

  const abortActiveRequest = (): void => {
    activeRequest?.abort();
    activeRequest = null;
  };

  const run = async (query: string): Promise<void> => {
    abortActiveRequest();
    const request = new AbortController();
    activeRequest = request;
    if (!(state.status === 'loading' && state.query === query)) {
      setState({ status: 'loading', query });
    }

    try {
      const countries = await search(query, request.signal);
      setState(
        countries.length > 0 ? { status: 'success', query, countries } : { status: 'empty', query },
      );
    } catch (error) {
      const failure = classifyError(error);
      if (!failure.showToUser) return;

      setState(
        failure.kind === 'not-found'
          ? { status: 'empty', query }
          : { status: 'error', query, message: failure.message, retryable: failure.retryable },
      );
    } finally {
      if (activeRequest === request) activeRequest = null;
    }
  };

  const debouncedRun = debounce((query: string) => void run(query), debounceMs);

  /** Shared start of every input: cancel what is running and remember the query. */
  const acceptQuery = (rawQuery: string): string => {
    const query = rawQuery.trim();
    abortActiveRequest();
    debouncedRun.cancel();
    lastQuery = query;
    if (query === '') setState({ status: 'idle' });
    return query;
  };

  return {
    setQuery(rawQuery) {
      const query = acceptQuery(rawQuery);
      if (query === '') return;

      setState({ status: 'loading', query });
      debouncedRun(query);
    },

    searchNow(rawQuery) {
      const query = acceptQuery(rawQuery);
      if (query === '') return;

      void run(query);
    },

    retry() {
      if (lastQuery === '') return;
      debouncedRun.cancel();
      void run(lastQuery);
    },

    getState: () => state,

    dispose() {
      debouncedRun.cancel();
      abortActiveRequest();
    },
  };
}
