/** Raw country object as returned by `GET https://countries.dev/name/{query}`. */
export interface RawLanguage {
  name: string;
  nativeName?: string;
  iso639_1?: string;
  iso639_2?: string;
}

export interface RawCurrency {
  code: string;
  name: string;
  symbol?: string;
}

export interface RawCountry {
  name: string;
  alpha3Code: string;
  flag?: string;
  flags?: { svg?: string; png?: string };
  capital?: string;
  region?: string;
  subregion?: string;
  population: number;
  area?: number;
  nativeName?: string;
  demonym?: string;
  borders?: string[];
  languages?: RawLanguage[];
  currencies?: RawCurrency[];
}

/** Any function that searches countries and honours an AbortSignal (real API, cached, mocked). */
export type SearchFn = (query: string, signal: AbortSignal) => Promise<Country[]>;

/** Data the UI needs to render a card and its detail view. */
export interface Country {
  code: string;
  name: string;
  flagEmoji: string | null;
  flagUrl: string | null;
  capital: string | null;
  region: string | null;
  subregion: string | null;
  population: number;
  area: number | null;
  nativeName: string | null;
  demonym: string | null;
  borders: string[];
  languages: string[];
  currencies: string[];
}
