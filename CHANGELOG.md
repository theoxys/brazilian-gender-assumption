# brazilian-gender-assumption

## 0.1.2

### Patch Changes

- 7827322: Docs: add a TypeScript usage section and clarify the disclaimer — the data is from Brazil's IBGE 2010 Census (civil-registry registration at birth) and is unrelated to anyone's sexual orientation or gender identity.

## 0.1.1

### Patch Changes

- 45975f2: Republish through the CI release pipeline using npm OIDC trusted publishing, adding a build provenance attestation to the package.

## 0.1.0

Initial release.

- Gender inference (`male` / `female` / `undefined`) from 103,226 Brazilian names.
- Gender derived from name registration ratios (the dataset's buggy `classification` field is ignored).
- Synchronous and asynchronous APIs: `getGender`, `getNameInfo`, `getConfidence`, and their `*Async` variants.
- Optional fuzzy matching (`{ fuzzy: true }`) using a trigram index + Damerau–Levenshtein with a popularity-weighted top-k gender vote. Loaded as a separate chunk.
- Isomorphic (Node + browser), zero runtime dependencies, dual ESM/CJS build with type declarations.
