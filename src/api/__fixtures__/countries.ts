import type { RawCountry } from '../types.js';

/** Canned responses copied from countries.dev (trimmed to the fields we use). */

export const spainRaw: RawCountry = {
  area: 505992,
  flag: '🇪🇸',
  name: 'Spain',
  flags: { png: 'https://flagcdn.com/w320/es.png', svg: 'https://flagcdn.com/es.svg' },
  region: 'Europe',
  borders: ['AND', 'FRA', 'GIB', 'PRT', 'MAR'],
  capital: 'Madrid',
  demonym: 'Spanish',
  languages: [{ name: 'Spanish', iso639_1: 'es', iso639_2: 'spa', nativeName: 'Español' }],
  subregion: 'Southern Europe',
  alpha3Code: 'ESP',
  currencies: [{ code: 'EUR', name: 'Euro', symbol: '€' }],
  nativeName: 'España',
  population: 47351567,
};

/** No capital, no borders, no currencies. */
export const antarcticaRaw: RawCountry = {
  area: 14000000,
  flag: '🇦🇶',
  name: 'Antarctica',
  flags: { png: 'https://flagcdn.com/w320/aq.png', svg: 'https://flagcdn.com/aq.svg' },
  region: 'Polar',
  demonym: 'Antarctic',
  languages: [
    { name: 'English', iso639_1: 'en', iso639_2: 'eng', nativeName: 'English' },
    { name: 'Russian', iso639_1: 'ru', iso639_2: 'rus', nativeName: 'Русский' },
  ],
  subregion: 'Antarctica',
  alpha3Code: 'ATA',
  nativeName: 'Antarctica',
  population: 1000,
};

/** Bare minimum: only required fields. */
export const minimalRaw: RawCountry = {
  name: 'Nowhere',
  alpha3Code: 'NWH',
  population: 0,
};
