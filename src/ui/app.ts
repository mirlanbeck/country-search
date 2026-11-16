import { createCachedSearch } from '../api/cached-search.js';
import { searchCountries } from '../api/search-countries.js';
import { createSearchController, type SearchState } from '../core/search-controller.js';
import { createHistoryStore, type HistoryStorage } from '../core/search-history.js';
import { createDetailsDialog } from './details-dialog.js';
import { el } from './dom.js';
import { renderHistory } from './history-view.js';
import { renderCountryCard, renderStatus } from './views.js';

/** Even reading `window.localStorage` can throw (e.g. blocked site data). */
const getLocalStorage = (): HistoryStorage | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

/** Builds the page and wires DOM events to the DOM-free search controller. */
export function mountApp(root: HTMLElement): void {
  const input = el('input', {
    className: 'search__input',
    attrs: {
      type: 'search',
      placeholder: 'Search countries…',
      autocomplete: 'off',
      spellcheck: 'false',
      'aria-label': 'Country name',
    },
  });
  const historySlot = el('div', { className: 'history-slot' });
  const status = el('div', { className: 'status-slot', attrs: { 'aria-live': 'polite' } });
  const results = el('ul', { className: 'results' });
  const details = createDetailsDialog();
  const historyStore = createHistoryStore(getLocalStorage());

  const searchFromHistory = (query: string): void => {
    input.value = query;
    controller.searchNow(query);
    input.focus();
  };

  const renderHistorySlot = (history: readonly string[]): void => {
    historySlot.replaceChildren(
      renderHistory(history, {
        onSelect: searchFromHistory,
        onClear: () => renderHistorySlot(historyStore.clear()),
      }) ?? '',
    );
  };

  const render = (state: SearchState): void => {
    status.replaceChildren(renderStatus(state, () => controller.retry()));

    const countries = state.status === 'success' ? state.countries : [];
    results.replaceChildren(
      ...countries.map((country) => renderCountryCard(country, () => details.open(country))),
    );

    if (state.status === 'success') {
      renderHistorySlot(historyStore.add(state.query));
    }
  };

  const controller = createSearchController({
    search: createCachedSearch(searchCountries),
    onChange: render,
  });
  input.addEventListener('input', () => controller.setQuery(input.value));

  root.append(
    el('main', { className: 'app' }, [
      el('header', { className: 'app__header' }, [
        el('h1', { text: 'Country Search' }),
        el('p', { className: 'app__subtitle', text: 'Live search powered by countries.dev' }),
      ]),
      el('div', { className: 'search' }, [input]),
      historySlot,
      status,
      results,
      details.element,
    ]),
  );

  renderHistorySlot(historyStore.load());
  render(controller.getState());
  input.focus();
}
