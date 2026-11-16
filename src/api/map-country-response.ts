import type { Country, RawCountry, RawCurrency } from './types.js';

const formatCurrency = ({ name, symbol }: RawCurrency): string =>
  symbol ? `${name} (${symbol})` : name;

const mapCountry = (raw: RawCountry): Country => ({
  code: raw.alpha3Code,
  name: raw.name,
  flagEmoji: raw.flag ?? null,
  flagUrl: raw.flags?.svg ?? raw.flags?.png ?? null,
  capital: raw.capital ?? null,
  region: raw.region ?? null,
  subregion: raw.subregion ?? null,
  population: raw.population,
  area: raw.area ?? null,
  nativeName: raw.nativeName ?? null,
  demonym: raw.demonym ?? null,
  borders: [...(raw.borders ?? [])],
  languages: (raw.languages ?? []).map((language) => language.name),
  currencies: (raw.currencies ?? []).map(formatCurrency),
});

/**
 * Pure mapper from the countries.dev response to the data the UI renders.
 * Missing optional fields become `null` (scalars) or `[]` (lists).
 */
export const mapCountryResponse = (raw: readonly RawCountry[]): Country[] => raw.map(mapCountry);
