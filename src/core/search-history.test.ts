import { describe, expect, it } from 'vitest';
import { createBrokenStorage, createMemoryStorage } from '../test-utils/memory-storage.js';
import { addToHistory, createHistoryStore, HISTORY_STORAGE_KEY } from './search-history.js';

describe('addToHistory', () => {
  it('puts a new query on top', () => {
    expect(addToHistory(['france'], 'spain')).toEqual(['spain', 'france']);
  });

  it('trims the query', () => {
    expect(addToHistory([], '  spain  ')).toEqual(['spain']);
  });

  it('ignores an empty query', () => {
    expect(addToHistory(['spain'], '   ')).toEqual(['spain']);
  });

  it('moves an existing query to the top instead of duplicating it', () => {
    expect(addToHistory(['france', 'spain', 'italy'], 'spain')).toEqual([
      'spain',
      'france',
      'italy',
    ]);
  });

  it('compares queries case-insensitively and keeps the latest spelling', () => {
    expect(addToHistory(['france', 'spain'], 'Spain')).toEqual(['Spain', 'france']);
  });

  it('replaces the top entry while the user keeps typing the same word', () => {
    const typed = ['s', 'sp', 'spa', 'spain'].reduce<string[]>(
      (history, query) => addToHistory(history, query),
      ['france'],
    );

    expect(typed).toEqual(['spain', 'france']);
  });

  it('keeps the top entry while the user erases it letter by letter', () => {
    const erased = ['spai', 'spa', 'sp', 's'].reduce<string[]>(
      (history, query) => addToHistory(history, query),
      ['spain', 'france'],
    );

    expect(erased).toEqual(['spain', 'france']);
  });

  it('keeps at most `limit` entries, dropping the oldest', () => {
    expect(addToHistory(['c', 'b', 'a'], 'd', 3)).toEqual(['d', 'c', 'b']);
  });

  it('does not mutate the input', () => {
    const history = ['france', 'spain'];

    addToHistory(history, 'italy');

    expect(history).toEqual(['france', 'spain']);
  });
});

describe('createHistoryStore', () => {
  it('starts empty when nothing is stored', () => {
    const store = createHistoryStore(createMemoryStorage());

    expect(store.load()).toEqual([]);
  });

  it('loads the saved history', () => {
    const storage = createMemoryStorage({
      [HISTORY_STORAGE_KEY]: JSON.stringify(['spain', 'france']),
    });

    expect(createHistoryStore(storage).load()).toEqual(['spain', 'france']);
  });

  it('add() saves to storage and returns the new history', () => {
    const storage = createMemoryStorage();
    const store = createHistoryStore(storage);

    expect(store.add('spain')).toEqual(['spain']);
    expect(store.add('france')).toEqual(['france', 'spain']);
    expect(JSON.parse(storage.getItem(HISTORY_STORAGE_KEY) ?? 'null')).toEqual(['france', 'spain']);
  });

  it('survives a reload: a new store sees what the previous one saved', () => {
    const storage = createMemoryStorage();
    createHistoryStore(storage).add('spain');

    expect(createHistoryStore(storage).load()).toEqual(['spain']);
  });

  it('respects the limit', () => {
    const store = createHistoryStore(createMemoryStorage(), 2);

    store.add('a');
    store.add('b');

    expect(store.add('c')).toEqual(['c', 'b']);
  });

  it('clear() empties the history and the storage', () => {
    const storage = createMemoryStorage();
    const store = createHistoryStore(storage);
    store.add('spain');

    expect(store.clear()).toEqual([]);
    expect(store.load()).toEqual([]);
    expect(storage.getItem(HISTORY_STORAGE_KEY)).toBeNull();
  });

  it.each([
    ['broken JSON', '{not json'],
    ['not an array', JSON.stringify({ spain: true })],
  ])('treats %s as an empty history', (_label, value) => {
    const storage = createMemoryStorage({ [HISTORY_STORAGE_KEY]: value });

    expect(createHistoryStore(storage).load()).toEqual([]);
  });

  it('drops non-string items from stored data', () => {
    const storage = createMemoryStorage({
      [HISTORY_STORAGE_KEY]: JSON.stringify(['spain', 42, null, 'france']),
    });

    expect(createHistoryStore(storage).load()).toEqual(['spain', 'france']);
  });

  it('keeps working in memory when storage throws', () => {
    const store = createHistoryStore(createBrokenStorage());

    expect(store.load()).toEqual([]);
    expect(store.add('spain')).toEqual(['spain']);
    expect(store.add('france')).toEqual(['france', 'spain']);
    expect(store.clear()).toEqual([]);
  });

  it('works without storage at all', () => {
    const store = createHistoryStore(null);

    expect(store.add('spain')).toEqual(['spain']);
  });
});
