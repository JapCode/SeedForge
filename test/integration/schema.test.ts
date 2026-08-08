import { describe, it, expect } from "vitest";
import { state } from "./probe";

/**
 * Level 2 — schema existence. Gated by connectivity. Deliberately FAILS
 * (not skips) when connected but tables are missing, so the developer gets
 * a clear signal that migrations still need to be applied.
 */
describe.skipIf(!state.dbOk)("Schema existence", () => {
  it("has all expected tables", () => {
    expect(state.missingTables).toEqual([]);
  });
});