// The database stores names uppercased, ASCII-folded and stripped of any
// non-letter character. Inputs must be normalized the same way before lookup.

// Combining diacritical marks left behind after NFD decomposition.
const DIACRITICS = /\p{Diacritic}/gu;
const NON_LETTERS = /[^A-Z]/g;
const WHITESPACE = /\s+/;

/**
 * Fold a single token to its database form: uppercase, strip diacritics
 * (José → JOSE), drop everything that is not an A–Z letter.
 */
export function normalizeToken(token: string): string {
  return token.normalize("NFD").replace(DIACRITICS, "").toUpperCase().replace(NON_LETTERS, "");
}

/**
 * Split a free-form input ("João da Silva", "Dr. Pedro") into normalized,
 * non-empty tokens. The first token is the conventional first name.
 */
export function tokenize(input: string): string[] {
  return String(input)
    .trim()
    .split(WHITESPACE)
    .map(normalizeToken)
    .filter((t) => t.length > 0);
}
