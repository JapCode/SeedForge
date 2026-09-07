import { describe, it, expect } from "vitest";
import { getAvatarUrl } from "../avatar";

describe("getAvatarUrl", () => {
  it("returns the Lorelei SVG endpoint with the seed as a query param", () => {
    expect(getAvatarUrl("user-123")).toBe(
      "https://api.dicebear.com/10.x/lorelei/svg?seed=user-123",
    );
  });

  it("URL-encodes seeds with special characters", () => {
    expect(getAvatarUrl("user with spaces & symbols")).toBe(
      "https://api.dicebear.com/10.x/lorelei/svg?seed=user%20with%20spaces%20%26%20symbols",
    );
  });

  it("is deterministic: the same seed always yields the same URL", () => {
    expect(getAvatarUrl("user-123")).toBe(getAvatarUrl("user-123"));
  });

  it("yields different URLs for different seeds", () => {
    expect(getAvatarUrl("user-123")).not.toBe(getAvatarUrl("user-456"));
  });
});
