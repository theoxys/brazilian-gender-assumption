import { describe, expect, it } from "vitest";
import { normalizeToken, tokenize } from "../src/normalize.js";

describe("normalizeToken", () => {
  it("uppercases and strips diacritics", () => {
    expect(normalizeToken("José")).toBe("JOSE");
    expect(normalizeToken("João")).toBe("JOAO");
    expect(normalizeToken("Taís")).toBe("TAIS");
    expect(normalizeToken("conceição")).toBe("CONCEICAO");
  });

  it("removes non-letter characters", () => {
    expect(normalizeToken("Ana-Maria")).toBe("ANAMARIA");
    expect(normalizeToken("d'Ávila")).toBe("DAVILA");
    expect(normalizeToken("Pedro123")).toBe("PEDRO");
  });
});

describe("tokenize", () => {
  it("splits on whitespace and normalizes each token", () => {
    expect(tokenize("João da Silva")).toEqual(["JOAO", "DA", "SILVA"]);
    expect(tokenize("  Maria   Eduarda ")).toEqual(["MARIA", "EDUARDA"]);
  });

  it("drops empty tokens and handles junk", () => {
    expect(tokenize("")).toEqual([]);
    expect(tokenize("   ")).toEqual([]);
    expect(tokenize("Dr. Pedro")).toEqual(["DR", "PEDRO"]);
  });
});
