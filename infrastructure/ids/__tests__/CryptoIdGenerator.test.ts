import { describe, it, expect } from "vitest";
import { CryptoIdGenerator } from "../CryptoIdGenerator";

describe("CryptoIdGenerator", () => {
  it("generates a valid UUID v4 string", () => {
    const generator = new CryptoIdGenerator();

    const id = generator.generate();

    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("generates a different id on every call", () => {
    const generator = new CryptoIdGenerator();

    const ids = new Set(
      Array.from({ length: 100 }, () => generator.generate()),
    );

    expect(ids.size).toBe(100);
  });
});
