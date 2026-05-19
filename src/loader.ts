import { CORE, TAGS } from "./data/generated/core.js";

/** A decoded core record. `malePct`/`femalePct` are integers 0–100. */
export interface CoreRecord {
  id: number;
  name: string;
  malePct: number;
  femalePct: number;
  frequency: number;
  rank: number;
  tagMask: number;
}

let byName: Map<string, CoreRecord> | null = null;
let byId: CoreRecord[] | null = null;

// Parsing happens once, lazily, on first lookup. The packed format is
// "name|malePct|femalePct|frequency|rank|tagMask" per line.
function parse(): void {
  const map = new Map<string, CoreRecord>();
  const lines = CORE.split("\n");
  const arr: CoreRecord[] = new Array(lines.length);

  for (let id = 0; id < lines.length; id++) {
    const line = lines[id] as string;
    let a = line.indexOf("|");
    const name = line.slice(0, a);
    let b = line.indexOf("|", a + 1);
    const malePct = +line.slice(a + 1, b);
    a = line.indexOf("|", b + 1);
    const femalePct = +line.slice(b + 1, a);
    b = line.indexOf("|", a + 1);
    const frequency = +line.slice(a + 1, b);
    a = line.indexOf("|", b + 1);
    const rank = +line.slice(b + 1, a);
    const tagMask = +line.slice(a + 1);

    const rec: CoreRecord = { id, name, malePct, femalePct, frequency, rank, tagMask };
    map.set(name, rec);
    arr[id] = rec;
  }

  byName = map;
  byId = arr;
}

/** Name → record map (built on first call, then cached). */
export function coreByName(): Map<string, CoreRecord> {
  if (!byName) parse();
  return byName as Map<string, CoreRecord>;
}

/** Records indexed by numeric id, matching the trigram index. */
export function coreById(): CoreRecord[] {
  if (!byId) parse();
  return byId as CoreRecord[];
}

/** Decode a tag bitmask into human-readable tag names. */
export function decodeTags(mask: number): string[] {
  if (mask === 0) return [];
  const out: string[] = [];
  for (let i = 0; i < TAGS.length; i++) {
    if (mask & (1 << i)) out.push(TAGS[i] as string);
  }
  return out;
}
