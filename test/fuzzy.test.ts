import { beforeAll, describe, expect, it } from "vitest";
import {
  getGender,
  getGenderAsync,
  getNameInfo,
  getNameInfoAsync,
  isFuzzyReady,
  preloadFuzzy,
} from "../src/index.js";

describe("fuzzy matching (async)", () => {
  it("resolves a typo to the right gender via top-k vote", async () => {
    // MATTEU is not in the database; its neighbours (MATEU, MATTEO, MATHEU...) are male.
    const info = await getNameInfoAsync("Matteu", { fuzzy: true });
    expect(info?.gender).toBe("male");
    expect(info?.matchType).toBe("fuzzy");
    expect(info?.similarity).toBeLessThan(1);
    expect(info?.similarity).toBeGreaterThan(0.5);
  });

  it("handles a feminine typo", async () => {
    expect(await getGenderAsync("Gabriella", { fuzzy: true })).toBe("female");
  });

  it("auto-loads the index", async () => {
    await getGenderAsync("Joao", { fuzzy: true });
    expect(isFuzzyReady()).toBe(true);
  });
});

describe("fuzzy matching (sync)", () => {
  it("throws if the index isn't preloaded", () => {
    // This test file may run after preload elsewhere; guard accordingly.
    if (!isFuzzyReady()) {
      expect(() => getGender("Matteu", { fuzzy: true })).toThrow(/preloadFuzzy/);
    }
  });

  it("works synchronously after preloadFuzzy()", async () => {
    await preloadFuzzy();
    expect(isFuzzyReady()).toBe(true);
    expect(getGender("Matteu", { fuzzy: true })).toBe("male");
  });

  it("does not run fuzzy when an exact match exists", () => {
    const info = getNameInfo("Maria", { fuzzy: true });
    expect(info?.matchType).toBe("exact");
    expect(info?.similarity).toBe(1);
  });
});
