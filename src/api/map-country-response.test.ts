import { describe, expect, it } from 'vitest';
import { antarcticaRaw, minimalRaw, spainRaw } from './__fixtures__/countries.js';
import { mapCountryResponse } from './map-country-response.js';
import type { Country, RawCountry } from './types.js';

describe('mapCountryResponse', () => {
  it('returns an empty array for an empty response', () => {
    expect(mapCountryResponse([])).toEqual([]);
  });

  it('maps a full country to card data', () => {
    const expected: Country = {
      code: 'ESP',
      name: 'Spain',
      flagEmoji: '🇪🇸',
      flagUrl: 'https://flagcdn.com/es.svg',
      capital: 'Madrid',
      region: 'Europe',
      subregion: 'Southern Europe',
      population: 47351567,
      area: 505992,
      nativeName: 'España',
      demonym: 'Spanish',
      borders: ['AND', 'FRA', 'GIB', 'PRT', 'MAR'],
      languages: ['Spanish'],
      currencies: ['Euro (€)'],
    };

    expect(mapCountryResponse([spainRaw])).toEqual([expected]);
  });

  it('keeps the order of countries from the response', () => {
    const names = mapCountryResponse([spainRaw, antarcticaRaw]).map((country) => country.name);

    expect(names).toEqual(['Spain', 'Antarctica']);
  });

  it('maps all language names in order', () => {
    const [antarctica] = mapCountryResponse([antarcticaRaw]);

    expect(antarctica?.languages).toEqual(['English', 'Russian']);
  });

  it('uses null for a missing capital and empty arrays for missing borders and currencies', () => {
    const [antarctica] = mapCountryResponse([antarcticaRaw]);

    expect(antarctica?.capital).toBeNull();
    expect(antarctica?.borders).toEqual([]);
    expect(antarctica?.currencies).toEqual([]);
  });

  it('uses null and empty arrays for every missing optional field', () => {
    const [country] = mapCountryResponse([minimalRaw]);

    expect(country).toEqual<Country>({
      code: 'NWH',
      name: 'Nowhere',
      flagEmoji: null,
      flagUrl: null,
      capital: null,
      region: null,
      subregion: null,
      population: 0,
      area: null,
      nativeName: null,
      demonym: null,
      borders: [],
      languages: [],
      currencies: [],
    });
  });

  it('falls back to the png flag when svg is missing', () => {
    const raw: RawCountry = { ...spainRaw, flags: { png: 'https://flagcdn.com/w320/es.png' } };

    const [country] = mapCountryResponse([raw]);

    expect(country?.flagUrl).toBe('https://flagcdn.com/w320/es.png');
  });

  it('formats a currency without a symbol as its name only', () => {
    const raw: RawCountry = { ...spainRaw, currencies: [{ code: 'XXX', name: 'Test coin' }] };

    const [country] = mapCountryResponse([raw]);

    expect(country?.currencies).toEqual(['Test coin']);
  });

  it('does not mutate the input', () => {
    const input = [structuredClone(spainRaw), structuredClone(antarcticaRaw)];
    const snapshot = structuredClone(input);

    mapCountryResponse(input);

    expect(input).toEqual(snapshot);
  });

  it('returns new arrays that are not shared with the input', () => {
    const input = structuredClone(spainRaw);

    const [country] = mapCountryResponse([input]);
    country?.borders.push('XXX');

    expect(input.borders).toEqual(['AND', 'FRA', 'GIB', 'PRT', 'MAR']);
  });
});
