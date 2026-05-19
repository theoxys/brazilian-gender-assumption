import { type CoreRecord, coreByName, decodeTags } from "./loader.js";
import { tokenize } from "./normalize.js";
import type { Gender, LookupOptions, NameInfo } from "./types.js";

export type { Gender, MatchType, NameInfo, LookupOptions, FuzzyOptions } from "./types.js";
export { TAGS } from "./data/generated/core.js";

const DEFAULT_THRESHOLD = 0.5;
const DEFAULT_MAX_DISTANCE = 2;
const DEFAULT_TOP_K = 10;

// --- Fuzzy module (lazy, code-split) ----------------------------------------
type FuzzyModule = typeof import("./fuzzy.js");
let fuzzyMod: FuzzyModule | null = null;

/**
 * Load the fuzzy-matching trigram index ahead of time. Required before using
 * `{ fuzzy: true }` with the *synchronous* API; the async API loads it on demand.
 */
export async function preloadFuzzy(): Promise<void> {
  if (!fuzzyMod) fuzzyMod = await import("./fuzzy.js");
}

/** Whether the fuzzy index is loaded and synchronous fuzzy lookups will work. */
export function isFuzzyReady(): boolean {
  return fuzzyMod !== null;
}

// --- Core helpers -----------------------------------------------------------
function recGender(rec: CoreRecord): Gender | undefined {
  if (rec.malePct > rec.femalePct) return "male";
  if (rec.femalePct > rec.malePct) return "female";
  return undefined;
}

function makeInfo(
  input: string,
  normalized: string,
  rec: CoreRecord,
  matchType: NameInfo["matchType"],
  similarity: number,
  gender: Gender | undefined,
  threshold: number,
): NameInfo {
  const confidence = Math.max(rec.malePct, rec.femalePct) / 100;
  return {
    input,
    normalized,
    matchedName: rec.name,
    gender: gender !== undefined && confidence >= threshold ? gender : undefined,
    confidence,
    maleRatio: rec.malePct / 100,
    femaleRatio: rec.femalePct / 100,
    frequency: rec.frequency,
    rank: rec.rank,
    tags: decodeTags(rec.tagMask),
    matchType,
    similarity,
  };
}

// Decide gender from the nearest candidates: each votes its own gender with
// weight = similarity × (1 + log10(frequency)). The representative record
// (for ratios/tags) is the closest candidate matching the winning gender.
function voteInfo(
  input: string,
  normalized: string,
  cands: ReturnType<FuzzyModule["fuzzySearch"]>,
  threshold: number,
): NameInfo {
  let maleScore = 0;
  let femaleScore = 0;
  for (const c of cands) {
    const weight = c.similarity * (1 + Math.log10(c.rec.frequency + 1));
    const g = recGender(c.rec);
    if (g === "male") maleScore += weight;
    else if (g === "female") femaleScore += weight;
  }

  const voted: Gender | undefined =
    maleScore === femaleScore ? undefined : maleScore > femaleScore ? "male" : "female";

  let best = cands[0] as (typeof cands)[number];
  if (voted) {
    for (const c of cands) {
      if (recGender(c.rec) === voted) {
        best = c;
        break; // cands are pre-sorted by distance then frequency
      }
    }
  }
  return makeInfo(input, normalized, best.rec, "fuzzy", best.similarity, voted, threshold);
}

// Shared resolution. `search` is the fuzzy function, or null when unavailable.
function resolve(
  input: string,
  options: LookupOptions,
  search: FuzzyModule["fuzzySearch"] | null,
): NameInfo | undefined {
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;
  const tokens = tokenize(input);
  if (tokens.length === 0) return undefined;
  const keys = options.compound ? tokens : tokens.slice(0, 1);
  const map = coreByName();

  for (const key of keys) {
    const rec = map.get(key);
    if (rec) return makeInfo(input, key, rec, "exact", 1, recGender(rec), threshold);
  }

  if (!options.fuzzy) return undefined;
  if (!search) {
    throw new Error(
      "Fuzzy matching requires the trigram index. Call `await preloadFuzzy()` before " +
        "synchronous fuzzy lookups, or use the async API (e.g. getNameInfoAsync).",
    );
  }

  const maxDistance = options.maxDistance ?? DEFAULT_MAX_DISTANCE;
  const topK = options.topK ?? DEFAULT_TOP_K;
  for (const key of keys) {
    const cands = search(key, maxDistance, topK);
    if (cands.length > 0) return voteInfo(input, key, cands, threshold);
  }
  return undefined;
}

function resolveSync(input: string, options: LookupOptions): NameInfo | undefined {
  const search = options.fuzzy ? (fuzzyMod?.fuzzySearch ?? null) : null;
  return resolve(input, options, search);
}

async function resolveAsync(input: string, options: LookupOptions): Promise<NameInfo | undefined> {
  let search: FuzzyModule["fuzzySearch"] | null = null;
  if (options.fuzzy) {
    await preloadFuzzy();
    search = (fuzzyMod as FuzzyModule).fuzzySearch;
  }
  return resolve(input, options, search);
}

// --- Public API: synchronous ------------------------------------------------

/** Infer the gender of a name. Returns `undefined` if unknown or an exact 50/50 split. */
export function getGender(name: string, options: LookupOptions = {}): Gender | undefined {
  return resolveSync(name, options)?.gender;
}

/** Full record for a name, or `undefined` if it can't be resolved. */
export function getNameInfo(name: string, options: LookupOptions = {}): NameInfo | undefined {
  return resolveSync(name, options);
}

/** Winning ratio (0.5–1) for a name, or `undefined` if it can't be resolved. */
export function getConfidence(name: string, options: LookupOptions = {}): number | undefined {
  return resolveSync(name, options)?.confidence;
}

/** Whether the name exists in the database as an exact (normalized) match. */
export function isKnownName(name: string): boolean {
  const tokens = tokenize(name);
  return tokens.length > 0 && coreByName().has(tokens[0] as string);
}

// --- Public API: asynchronous (auto-loads the fuzzy index when needed) ------

export function getGenderAsync(
  name: string,
  options: LookupOptions = {},
): Promise<Gender | undefined> {
  return resolveAsync(name, options).then((info) => info?.gender);
}

export function getNameInfoAsync(
  name: string,
  options: LookupOptions = {},
): Promise<NameInfo | undefined> {
  return resolveAsync(name, options);
}

export function getConfidenceAsync(
  name: string,
  options: LookupOptions = {},
): Promise<number | undefined> {
  return resolveAsync(name, options).then((info) => info?.confidence);
}
