// Approximate matching. This module statically imports the (large) trigram
// index, so the public API only ever pulls it in via dynamic `import()` —
// keeping it out of the bundle for consumers that don't use fuzzy matching.

import { TRIGRAMS } from "./data/generated/trigrams.js";
import { type CoreRecord, coreById } from "./loader.js";

export interface FuzzyCandidate {
  rec: CoreRecord;
  distance: number;
  /** 1 − distance / max(len) — higher is closer. */
  similarity: number;
}

// Cap how many trigram-overlap candidates get the (more expensive) edit
// distance check. Candidates are pre-sorted by overlap, so the cap keeps the
// strongest ones while bounding work on pathological inputs.
const MAX_WORKING_SET = 500;

let trigramIndex: Map<string, number[]> | null = null;

function index(): Map<string, number[]> {
  if (trigramIndex) return trigramIndex;
  const map = new Map<string, number[]>();
  const lines = TRIGRAMS.split("\n");
  for (const line of lines) {
    const sep = line.indexOf("|");
    const tri = line.slice(0, sep);
    const ids = line
      .slice(sep + 1)
      .split(",")
      .map((s) => Number.parseInt(s, 36));
    map.set(tri, ids);
  }
  trigramIndex = map;
  return map;
}

function trigramsOf(key: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; i + 3 <= key.length; i++) {
    const tri = key.slice(i, i + 3);
    if (!seen.has(tri)) {
      seen.add(tri);
      out.push(tri);
    }
  }
  return out;
}

// Damerau–Levenshtein with a max-distance early exit. Counts insertions,
// deletions, substitutions and adjacent transpositions (e.g. "ai"↔"ia").
function damerau(a: string, b: string, max: number): number {
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > max) return max + 1;

  let prevPrev = new Int32Array(n + 1);
  let prev = new Int32Array(n + 1);
  let curr = new Int32Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    const ai = a.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      const cost = ai === b.charCodeAt(j - 1) ? 0 : 1;
      let v = Math.min(
        (prev[j] as number) + 1, // deletion
        (curr[j - 1] as number) + 1, // insertion
        (prev[j - 1] as number) + cost, // substitution
      );
      if (
        i > 1 &&
        j > 1 &&
        ai === b.charCodeAt(j - 2) &&
        a.charCodeAt(i - 2) === b.charCodeAt(j - 1)
      ) {
        v = Math.min(v, (prevPrev[j - 2] as number) + 1); // transposition
      }
      curr[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    const tmp = prevPrev;
    prevPrev = prev;
    prev = curr;
    curr = tmp;
  }
  return prev[n] as number;
}

/**
 * Find the nearest names to `key`. Returns up to `topK` candidates within
 * `maxDistance`, sorted by distance then descending frequency.
 */
export function fuzzySearch(key: string, maxDistance: number, topK: number): FuzzyCandidate[] {
  if (key.length < 3) return []; // no trigrams to work with
  const records = coreById();
  const tri = index();

  const overlap = new Map<number, number>();
  for (const t of trigramsOf(key)) {
    const ids = tri.get(t);
    if (!ids) continue;
    for (const id of ids) overlap.set(id, (overlap.get(id) ?? 0) + 1);
  }
  if (overlap.size === 0) return [];

  const working = [...overlap.entries()].sort((x, y) => y[1] - x[1]).slice(0, MAX_WORKING_SET);

  const out: FuzzyCandidate[] = [];
  for (const [id] of working) {
    const rec = records[id] as CoreRecord;
    const d = damerau(key, rec.name, maxDistance);
    if (d <= maxDistance) {
      out.push({ rec, distance: d, similarity: 1 - d / Math.max(key.length, rec.name.length) });
    }
  }

  out.sort((x, y) => x.distance - y.distance || y.rec.frequency - x.rec.frequency);
  return out.slice(0, topK);
}
