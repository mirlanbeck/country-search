import { el } from './dom.js';

interface HistoryHandlers {
  onSelect: (query: string) => void;
  onClear: () => void;
}

/** "Recent: [spain] [france] … Clear". Renders nothing when the history is empty. */
export function renderHistory(
  history: readonly string[],
  { onSelect, onClear }: HistoryHandlers,
): HTMLElement | null {
  if (history.length === 0) return null;

  const items = history.map((query) => {
    const button = el('button', {
      className: 'history__item',
      text: query,
      attrs: { type: 'button', title: `Search “${query}” again` },
    });
    button.addEventListener('click', () => onSelect(query));
    return el('li', {}, [button]);
  });

  const clear = el('button', {
    className: 'history__clear',
    text: 'Clear',
    attrs: { type: 'button', 'aria-label': 'Clear search history' },
  });
  clear.addEventListener('click', onClear);

  return el('nav', { className: 'history', attrs: { 'aria-label': 'Recent searches' } }, [
    el('span', { className: 'history__label', text: 'Recent:' }),
    el('ul', { className: 'history__list' }, items),
    clear,
  ]);
}
