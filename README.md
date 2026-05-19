# brazilian-gender-assumption

Infer **gender** (`"male"` / `"female"`) from Brazilian first names, backed by a database of **103,226 names**. Fast O(1) exact lookups, optional fuzzy matching for typos, zero runtime dependencies, isomorphic (Node + browser), TypeScript-first.

> ⚠️ Names do not determine anyone's gender identity. This library returns a **statistical assumption** based on name-registration data. Use it for heuristics (e.g. defaulting a salutation), never as a source of truth about a person.

## Install

```bash
npm install brazilian-gender-assumption
```

## Quick start

```ts
import { getGender, getNameInfo } from "brazilian-gender-assumption";

getGender("Maria");          // "female"
getGender("José");           // "male"  (accents are handled)
getGender("João da Silva");  // "male"  (uses the first name by default)
getGender("Zzxqwk");         // undefined (unknown)
getGender("Edir");           // undefined (exact 50/50 split)

getNameInfo("Maria");
// {
//   input: "Maria", normalized: "MARIA", matchedName: "MARIA",
//   gender: "female", confidence: 1, maleRatio: 0, femaleRatio: 1,
//   frequency: 11734129, rank: 1, tags: ["biblical", "english", ...],
//   matchType: "exact", similarity: 1
// }
```

## How gender is decided

The result comes from the name's `maleRatio` / `femaleRatio` (share of registrations):

- `maleRatio > femaleRatio` → `"male"`
- `femaleRatio > maleRatio` → `"female"`
- exactly equal → `undefined`

`confidence` is the winning ratio (0.5–1). Set a `threshold` to leave low-confidence names undecided:

```ts
getGender("Valdeci");                    // "male"  (m=0.75)
getGender("Valdeci", { threshold: 0.9 }); // undefined
```

## Fuzzy matching (typos & spelling variants)

Opt in with `{ fuzzy: true }`. When there's no exact match, the library finds the
nearest names (trigram index + Damerau–Levenshtein) and **votes** the gender across
the top candidates, weighted by similarity and popularity — so a typo still lands on
the right gender.

```ts
import { getGenderAsync, getGender, preloadFuzzy } from "brazilian-gender-assumption";

// Async: loads the fuzzy index on demand.
await getGenderAsync("Matteu", { fuzzy: true }); // "male" (≈ MATTEO/MATEU/MATHEU)

// Sync: preload the index once, then call synchronously.
await preloadFuzzy();
getGender("Matteu", { fuzzy: true });            // "male"
```

The fuzzy index (~2.3 MB) lives in a **separate chunk** that is only loaded when you
actually use fuzzy matching, so non-fuzzy consumers never pay for it. Calling the
synchronous API with `{ fuzzy: true }` before `preloadFuzzy()` throws a helpful error.

## API

| Function | Returns |
| --- | --- |
| `getGender(name, opts?)` | `"male" \| "female" \| undefined` |
| `getNameInfo(name, opts?)` | `NameInfo \| undefined` |
| `getConfidence(name, opts?)` | `number \| undefined` |
| `isKnownName(name)` | `boolean` (exact match only) |
| `getGenderAsync` / `getNameInfoAsync` / `getConfidenceAsync` | `Promise<…>` |
| `preloadFuzzy()` | `Promise<void>` |
| `isFuzzyReady()` | `boolean` |

### Options

```ts
interface LookupOptions {
  fuzzy?: boolean;       // approximate match when no exact hit (default false)
  compound?: boolean;    // scan tokens for the first that resolves (default false)
  threshold?: number;    // min confidence to commit to a gender (default 0.5)
  maxDistance?: number;  // fuzzy: max edit distance (default 2)
  topK?: number;         // fuzzy: candidates in the vote (default 10)
}
```

`compound` is useful for inputs with titles or particles:

```ts
getGender("Dr. Pedro");                  // undefined (only "DR" is tried)
getGender("Dr. Pedro", { compound: true }); // "male"  (falls through to "PEDRO")
```

## Performance

Exact lookups run in **~0.6 µs** (≈1.9M ops/s) after a one-time lazy index build.
Run the benchmark with `npm run bench`.

## Notes on the data

- Names are matched case- and accent-insensitively (`José` → `JOSE`).
- Gender is derived **only** from the ratios. The source dataset's `classification`
  field is ignored because ~20k rare names are mislabeled there.
- `frequency`, `rank`, and `tags` (e.g. `biblical`, `unisex`, `english`) come from the
  same dataset and are exposed on `NameInfo`.

## License

MIT
