/** Inferred gender. `undefined` means the name is an exact 50/50 split. */
export type Gender = "male" | "female";

/** How the name was resolved against the database. */
export type MatchType = "exact" | "fuzzy";

export interface NameInfo {
  /** The raw value passed by the caller. */
  input: string;
  /** The normalized lookup key derived from `input` (uppercase, ASCII). */
  normalized: string;
  /** The database name that was actually used (equals `normalized` for exact matches). */
  matchedName: string;
  /** Inferred gender, or `undefined` for an exact 50/50 split / below `threshold`. */
  gender: Gender | undefined;
  /** Winning ratio in the range 0.5–1 (0.5 for a tie). */
  confidence: number;
  /** Share of people with this name registered as male (0–1). */
  maleRatio: number;
  /** Share of people with this name registered as female (0–1). */
  femaleRatio: number;
  /** Total registrations for this name (nationwide). */
  frequency: number;
  /** Popularity rank (1 = most common). */
  rank: number;
  /** Tags such as `"biblical"`, `"unisex"`, `"english"`. */
  tags: string[];
  /** Whether the match was exact or fuzzy. */
  matchType: MatchType;
  /** String similarity to `matchedName` (1 for exact, <1 for fuzzy). */
  similarity: number;
}

export interface LookupOptions extends FuzzyOptions {
  /**
   * Enable approximate matching when no exact match is found.
   * Sync calls require {@link preloadFuzzy} to have been awaited first
   * (or use the async API). Defaults to `false`.
   */
  fuzzy?: boolean;
  /**
   * Scan whitespace-separated tokens left-to-right and use the first one that
   * resolves (handles titles/compound names like "Sr. João"). When `false`
   * (default) only the first token is considered.
   */
  compound?: boolean;
  /**
   * Minimum confidence to commit to a gender; below it `gender` is `undefined`.
   * Defaults to `0.5` (only an exact tie is undecided).
   */
  threshold?: number;
}

export interface FuzzyOptions {
  /** Maximum edit (Damerau–Levenshtein) distance for a candidate. Default `2`. */
  maxDistance?: number;
  /** Number of nearest candidates that take part in the gender vote. Default `10`. */
  topK?: number;
}
