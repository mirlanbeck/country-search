/** In-memory stand-in for `localStorage` (only the methods the app uses). */
export const createMemoryStorage = (initial: Record<string, string> = {}) => {
  const data = new Map(Object.entries(initial));

  return {
    getItem: (key: string): string | null => data.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      data.set(key, value);
    },
    removeItem: (key: string): void => {
      data.delete(key);
    },
  };
};

/** Storage that throws on every call, like `localStorage` in some private modes or when full. */
export const createBrokenStorage = () => ({
  getItem: (): string | null => {
    throw new DOMException('Access denied', 'SecurityError');
  },
  setItem: (): void => {
    throw new DOMException('Quota exceeded', 'QuotaExceededError');
  },
  removeItem: (): void => {
    throw new DOMException('Access denied', 'SecurityError');
  },
});
