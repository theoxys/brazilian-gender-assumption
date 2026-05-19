# brazilian-gender-assumption

## 0.1.0

Initial release.

- Gender inference (`male` / `female` / `undefined`) from 103,226 Brazilian names.
- Gender derived from name registration ratios (the dataset's buggy `classification` field is ignored).
- Synchronous and asynchronous APIs: `getGender`, `getNameInfo`, `getConfidence`, and their `*Async` variants.
- Optional fuzzy matching (`{ fuzzy: true }`) using a trigram index + Damerau–Levenshtein with a popularity-weighted top-k gender vote. Loaded as a separate chunk.
- Isomorphic (Node + browser), zero runtime dependencies, dual ESM/CJS build with type declarations.
