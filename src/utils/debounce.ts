export interface Debounced<Args extends unknown[]> {
  (...args: Args): void;
  /** Drops the pending call, if any. */
  cancel(): void;
}

/**
 * Delays `fn` by `delay` ms. Every new call restarts the timer,
 * so `fn` runs once, with the latest arguments, after calls stop for `delay` ms.
 */
export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delay: number,
): Debounced<Args> {
  let timerId: ReturnType<typeof setTimeout> | undefined;

  const cancel = (): void => {
    if (timerId !== undefined) {
      clearTimeout(timerId);
      timerId = undefined;
    }
  };

  const debounced = (...args: Args): void => {
    cancel();
    timerId = setTimeout(() => {
      timerId = undefined;
      fn(...args);
    }, delay);
  };

  return Object.assign(debounced, { cancel });
}
