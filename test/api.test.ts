import { describe, expect, it } from "vitest";
import { getConfidence, getGender, getNameInfo, isKnownName } from "../src/index.js";

describe("getGender (exact)", () => {
  it("resolves common names", () => {
    expect(getGender("Maria")).toBe("female");
    expect(getGender("João")).toBe("male");
    expect(getGender("ANA")).toBe("female");
  });

  it("ignores accents and surrounding tokens", () => {
    expect(getGender("José")).toBe("male");
    expect(getGender("José da Silva")).toBe("male");
  });

  it("uses ratios, not the buggy classification field", () => {
    // AABRAO is mislabeled "F" in the dataset but has male_ratio = 1.
    expect(getGender("AABRAO")).toBe("male");
  });

  it("returns undefined for an exact 50/50 split", () => {
    expect(getGender("EDIR")).toBeUndefined();
    // ...but the name is still known and carries data.
    expect(isKnownName("EDIR")).toBe(true);
    expect(getNameInfo("EDIR")?.confidence).toBe(0.5);
  });

  it("returns undefined for unknown names", () => {
    expect(getGender("Zzxqwk")).toBeUndefined();
    expect(isKnownName("Zzxqwk")).toBe(false);
  });
});

describe("getNameInfo", () => {
  it("returns a full record", () => {
    const info = getNameInfo("Maria");
    expect(info).toMatchObject({
      input: "Maria",
      normalized: "MARIA",
      matchedName: "MARIA",
      gender: "female",
      confidence: 1,
      maleRatio: 0,
      femaleRatio: 1,
      rank: 1,
      matchType: "exact",
      similarity: 1,
    });
    expect(info?.frequency).toBeGreaterThan(0);
    expect(info?.tags).toContain("biblical");
  });

  it("applies a confidence threshold", () => {
    // VALDECI is unisex: m=0.75 / f=0.25 → confidence 0.75.
    expect(getGender("VALDECI")).toBe("male");
    expect(getGender("VALDECI", { threshold: 0.9 })).toBeUndefined();
    expect(getNameInfo("VALDECI", { threshold: 0.9 })?.confidence).toBe(0.75);
  });
});

describe("getConfidence", () => {
  it("returns the winning ratio or undefined", () => {
    expect(getConfidence("Maria")).toBe(1);
    expect(getConfidence("VALDECI")).toBe(0.75);
    expect(getConfidence("Zzxqwk")).toBeUndefined();
  });
});

describe("compound option", () => {
  it("scans tokens for the first that resolves", () => {
    // "DR" is not a name; with compound it falls through to "PEDRO".
    expect(getGender("Dr. Pedro", { compound: true })).toBe("male");
    // Without compound, only the first token ("DR") is tried.
    expect(getGender("Dr. Pedro")).toBeUndefined();
  });
});
