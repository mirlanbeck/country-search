import type { Country } from '../api/types.js';

const EMPTY = '—';
const numberFormat = new Intl.NumberFormat('en-US');

export const orDash = (value: string | null): string => value ?? EMPTY;

export const formatNumber = (value: number): string => numberFormat.format(value);

export const formatArea = (area: number | null): string =>
  area === null ? EMPTY : `${formatNumber(area)} km²`;

export const formatList = (items: readonly string[]): string =>
  items.length > 0 ? items.join(', ') : EMPTY;

/** A short human-readable description for the detail view. */
export function describeCountry(country: Country): string {
  const nativeName =
    country.nativeName && country.nativeName !== country.name ? ` (${country.nativeName})` : '';
  const location = country.subregion ?? country.region;

  const sentences = [
    location
      ? `${country.name}${nativeName} is located in ${location}.`
      : `${country.name}${nativeName}.`,
    country.capital ? `Its capital is ${country.capital}.` : 'It has no official capital.',
    country.demonym ? `Its people are called ${country.demonym}.` : '',
  ];

  return sentences.filter(Boolean).join(' ');
}
