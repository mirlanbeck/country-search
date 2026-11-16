import type { Country } from '../api/types.js';
import { el } from './dom.js';
import { describeCountry, formatArea, formatList, formatNumber, orDash } from './format.js';
import { renderFlag } from './views.js';

const renderRow = (label: string, value: string): HTMLElement =>
  el('div', { className: 'details__row' }, [el('dt', { text: label }), el('dd', { text: value })]);

function renderDetails(country: Country, onClose: () => void): HTMLElement {
  const close = el('button', {
    className: 'details__close',
    text: '×',
    attrs: { type: 'button', 'aria-label': 'Close details' },
  });
  close.addEventListener('click', onClose);

  return el('article', { className: 'details__body' }, [
    close,
    el('header', { className: 'details__header' }, [
      renderFlag(country, 'details__flag'),
      el('h2', { attrs: { id: 'details-title' }, text: country.name }),
    ]),
    el('p', { className: 'details__description', text: describeCountry(country) }),
    el('dl', { className: 'details__facts' }, [
      renderRow('Capital', orDash(country.capital)),
      renderRow('Region', orDash(country.region)),
      renderRow('Subregion', orDash(country.subregion)),
      renderRow('Population', formatNumber(country.population)),
      renderRow('Area', formatArea(country.area)),
      renderRow('Languages', formatList(country.languages)),
      renderRow('Currencies', formatList(country.currencies)),
      renderRow('Borders', formatList(country.borders)),
    ]),
  ]);
}

/** Modal with country details. Closes on ×, Escape (native) or a click on the backdrop. */
export function createDetailsDialog() {
  const dialog = el('dialog', {
    className: 'details',
    attrs: { 'aria-labelledby': 'details-title' },
  });
  const close = () => dialog.close();

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) close();
  });

  return {
    element: dialog,
    open(country: Country) {
      dialog.replaceChildren(renderDetails(country, close));
      dialog.showModal();
    },
  };
}
