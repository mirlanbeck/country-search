export const HISTORY_STORAGE_KEY = 'country-search:history';
export const DEFAULT_HISTORY_LIMIT = 10;

/** The part of `localStorage` the history needs; injectable for tests. */
export type HistoryStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const sameQuery = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase();
const startsWith = (text: string, prefix: string): boolean =>
  text.toLowerCase().startsWith(prefix.toLowerCase());

/**
 * Pure: returns a new history with `rawQuery` on top.
 * - no duplicates (case-insensitive), latest spelling wins;
 * - typing forward ("sp" → "spain") replaces the top entry instead of piling up prefixes;
 * - erasing ("spain" → "spa") keeps the longer top entry;
 * - at most `limit` entries.
 */
export function addToHistory(
  history: readonly string[],
  rawQuery: string,
  limit = DEFAULT_HISTORY_LIMIT,
): string[] {
  const query = rawQuery.trim();
  const [top] = history;

  if (query === '') return [...history];
  if (top !== undefined && !sameQuery(top, query) && startsWith(top, query)) return [...history];

  const isTypingForward = top !== undefined && startsWith(query, top);
  const rest = (isTypingForward ? history.slice(1) : history).filter(
    (item) => !sameQuery(item, query),
  );

  return [query, ...rest].slice(0, limit);
}

const parseHistory = (raw: string | null): string[] => {
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
};

/**
 * Search history persisted in `storage` (localStorage in the app).
 * Storage errors (private mode, quota) never break the app: the history then lives in memory.
 */
export function createHistoryStore(
  storage: HistoryStorage | null,
  limit = DEFAULT_HISTORY_LIMIT,
  key = HISTORY_STORAGE_KEY,
) {
  const read = (): string[] => {
    try {
      return parseHistory(storage?.getItem(key) ?? null);
    } catch {
      return [];
    }
  };

  const write = (history: string[]): void => {
    try {
      if (history.length === 0) storage?.removeItem(key);
      else storage?.setItem(key, JSON.stringify(history));
    } catch {
      // Storage is unavailable: keep the in-memory copy only.
    }
  };

  let history = read();

  const update = (next: string[]): string[] => {
    history = next;
    write(history);
    return [...history];
  };

  return {
    load: (): string[] => [...history],
    add: (query: string): string[] => update(addToHistory(history, query, limit)),
    clear: (): string[] => update([]),
  };
}
