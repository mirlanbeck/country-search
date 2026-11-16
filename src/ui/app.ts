import { createSearchController, type SearchState } from '../core/search-controller.js';
import { createDetailsDialog } from './details-dialog.js';
import { el } from './dom.js';
import { renderCountryCard, renderStatus } from './views.js';

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
  const status = el('div', { className: 'status-slot', attrs: { 'aria-live': 'polite' } });
  const results = el('ul', { className: 'results' });
  const details = createDetailsDialog();

  const render = (state: SearchState): void => {
    status.replaceChildren(renderStatus(state, () => controller.retry()));

    const countries = state.status === 'success' ? state.countries : [];
    results.replaceChildren(
      ...countries.map((country) => renderCountryCard(country, () => details.open(country))),
    );
  };

  const controller = createSearchController({ onChange: render });
  input.addEventListener('input', () => controller.setQuery(input.value));

  root.append(
    el('main', { className: 'app' }, [
      el('header', { className: 'app__header' }, [
        el('h1', { text: 'Country Search' }),
        el('p', { className: 'app__subtitle', text: 'Live search powered by countries.dev' }),
      ]),
      el('div', { className: 'search' }, [input]),
      status,
      results,
      details.element,
    ]),
  );

  render(controller.getState());
  input.focus();
}
