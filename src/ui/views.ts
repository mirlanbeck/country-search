import type { Country } from '../api/types.js';
import type { SearchState } from '../core/search-controller.js';
import { el } from './dom.js';
import { formatNumber, orDash } from './format.js';

export const renderFlag = (country: Country, className: string): HTMLElement =>
  country.flagUrl
    ? el('img', {
        className,
        attrs: { src: country.flagUrl, alt: `Flag of ${country.name}`, loading: 'lazy' },
      })
    : el('span', { className: `${className} flag--emoji`, text: country.flagEmoji ?? '🏳️' });

const renderFact = (label: string, value: string): HTMLElement[] => [
  el('dt', { text: label }),
  el('dd', { text: value }),
];

export function renderCountryCard(country: Country, onSelect: () => void): HTMLLIElement {
  const button = el('button', { className: 'card', attrs: { type: 'button' } }, [
    renderFlag(country, 'card__flag'),
    el('h2', { className: 'card__name', text: country.name }),
    el('dl', { className: 'card__facts' }, [
      ...renderFact('Capital', orDash(country.capital)),
      ...renderFact('Region', orDash(country.region)),
      ...renderFact('Population', formatNumber(country.population)),
    ]),
  ]);
  button.addEventListener('click', onSelect);

  return el('li', {}, [button]);
}

const countriesLabel = (count: number): string =>
  `${count} ${count === 1 ? 'country' : 'countries'}`;

/** The block above the results: hint, loading, counter, "nothing found" or an error with Retry. */
export function renderStatus(state: SearchState, onRetry: () => void): HTMLElement {
  switch (state.status) {
    case 'idle':
      return el('p', {
        className: 'status status--idle',
        text: 'Start typing a country name, e.g. “spain” or “united”.',
      });

    case 'loading':
      return el('div', { className: 'status status--loading', attrs: { role: 'status' } }, [
        el('span', { className: 'spinner', attrs: { 'aria-hidden': 'true' } }),
        el('span', { text: `Searching for “${state.query}”…` }),
      ]);

    case 'success':
      return el('p', {
        className: 'status status--success',
        text: `${countriesLabel(state.countries.length)} found for “${state.query}”`,
      });

    case 'empty':
      return el('div', { className: 'status status--empty' }, [
        el('p', { className: 'status__title', text: 'Nothing found 🔍' }),
        el('p', {
          text: `No countries match “${state.query}”. Check the spelling or try another name.`,
        }),
      ]);

    case 'error': {
      const retry =
        state.retryable &&
        el('button', { className: 'button', attrs: { type: 'button' }, text: 'Retry' });
      if (retry) retry.addEventListener('click', onRetry);

      return el('div', { className: 'status status--error', attrs: { role: 'alert' } }, [
        el('p', { className: 'status__title', text: 'Something went wrong' }),
        el('p', { text: state.message }),
        retry,
      ]);
    }
  }
}
