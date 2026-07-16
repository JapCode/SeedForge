import { describe, it, expect } from "vitest";
import { BracketMatch } from "../BracketMatch";

describe("BracketMatch.create", () => {
  it("creates a match with both players assigned and no winner", () => {
    const match = BracketMatch.create("m1", 1, 0, "p1", "p2");

    expect(match.getPlayer1Id()).toBe("p1");
    expect(match.getPlayer2Id()).toBe("p2");
    expect(match.getWinnerId()).toBeNull();
    expect(match.isReady()).toBe(true);
    expect(match.isDecided()).toBe(false);
  });

  it("creates an empty match awaiting winners from a previous round", () => {
    const match = BracketMatch.create("m2", 2, 0, null, null);

    expect(match.isReady()).toBe(false);
  });
});

describe("BracketMatch.reportWinner", () => {
  it("reports a winner from either slot", () => {
    const match = BracketMatch.create("m1", 1, 0, "p1", "p2");
    match.reportWinner("p2");

    expect(match.getWinnerId()).toBe("p2");
    expect(match.isDecided()).toBe(true);
  });

  it("throws if the match is not ready (missing a player)", () => {
    const match = BracketMatch.create("m1", 1, 0, "p1", null);
    expect(() => match.reportWinner("p1")).toThrow("is not ready yet");
  });

  it("throws if the winner is not part of the match", () => {
    const match = BracketMatch.create("m1", 1, 0, "p1", "p2");
    expect(() => match.reportWinner("p999")).toThrow("is not part of match");
  });

  it("throws if a winner has already been reported", () => {
    const match = BracketMatch.create("m1", 1, 0, "p1", "p2");
    match.reportWinner("p1");
    expect(() => match.reportWinner("p2")).toThrow(
      "already has a reported winner",
    );
  });
});

describe("BracketMatch.revertWinner", () => {
  it("clears a reported winner", () => {
    const match = BracketMatch.create("m1", 1, 0, "p1", "p2");
    match.reportWinner("p1");

    match.revertWinner();

    expect(match.getWinnerId()).toBeNull();
    expect(match.isDecided()).toBe(false);
  });

  it("throws if there is no winner to revert", () => {
    const match = BracketMatch.create("m1", 1, 0, "p1", "p2");
    expect(() => match.revertWinner()).toThrow(
      "has no reported winner to revert",
    );
  });
});

describe("BracketMatch.assignSlot / clearSlot", () => {
  it("fills an empty slot", () => {
    const match = BracketMatch.create("m1", 2, 0, null, null);
    match.assignSlot(1, "p1");
    match.assignSlot(2, "p2");

    expect(match.getPlayer1Id()).toBe("p1");
    expect(match.getPlayer2Id()).toBe("p2");
    expect(match.isReady()).toBe(true);
  });

  it("throws if the slot is already filled", () => {
    const match = BracketMatch.create("m1", 1, 0, "p1", "p2");
    expect(() => match.assignSlot(1, "p3")).toThrow(
      "already has a player assigned to slot 1",
    );
  });

  it("clearSlot empties a previously filled slot", () => {
    const match = BracketMatch.create("m1", 2, 0, null, null);
    match.assignSlot(1, "p1");

    match.clearSlot(1);

    expect(match.getPlayer1Id()).toBeNull();
  });
});
