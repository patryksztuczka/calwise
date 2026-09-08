/** Catalog input rules shared by the API schemas and browser controls. */
export const SEARCH_MIN_LENGTH = 2;
export const SEARCH_MAX_LENGTH = 100;
export const SEARCH_PATTERN = /[\p{L}\p{N}]/u;
export const DEFAULT_SEARCH_LIMIT = 20;
export const MAX_SEARCH_LIMIT = 50;
export const BARCODE_PATTERN = /^\d{4,24}$/;

export function isFoodSearchQuery(query: string): boolean {
  const term = query.trim();
  return (
    term.length >= SEARCH_MIN_LENGTH &&
    term.length <= SEARCH_MAX_LENGTH &&
    SEARCH_PATTERN.test(term)
  );
}
