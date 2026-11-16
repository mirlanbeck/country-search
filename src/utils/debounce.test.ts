import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { debounce } from './debounce.js';

const DELAY = 300;

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not call fn synchronously', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, DELAY);

    debounced();

    expect(fn).not.toHaveBeenCalled();
  });

  it('does not call fn before the delay has passed', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, DELAY);

    debounced();
    vi.advanceTimersByTime(DELAY - 1);

    expect(fn).not.toHaveBeenCalled();
  });

  it('calls fn exactly once after the delay', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, DELAY);

    debounced();
    vi.advanceTimersByTime(DELAY);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('resets the timer on every call', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, DELAY);

    debounced();
    vi.advanceTimersByTime(DELAY - 100);
    debounced();
    vi.advanceTimersByTime(DELAY - 100);

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('collapses a burst of calls into one call with the latest arguments', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, DELAY);

    debounced('s');
    debounced('sp');
    debounced('spa');
    vi.advanceTimersByTime(DELAY);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('spa');
  });

  it('calls fn once per burst when bursts are separated by the delay', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, DELAY);

    debounced('first');
    vi.advanceTimersByTime(DELAY);
    debounced('second');
    vi.advanceTimersByTime(DELAY);

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenNthCalledWith(1, 'first');
    expect(fn).toHaveBeenNthCalledWith(2, 'second');
  });

  it('cancel() drops a pending call', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, DELAY);

    debounced('spain');
    debounced.cancel();
    vi.advanceTimersByTime(DELAY);

    expect(fn).not.toHaveBeenCalled();
  });

  it('keeps working after cancel()', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, DELAY);

    debounced('a');
    debounced.cancel();
    debounced('b');
    vi.advanceTimersByTime(DELAY);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('b');
  });
});
