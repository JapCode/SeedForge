import { describe, it, expect } from "vitest";
import { TopCutBracket } from "../TopCutBracket";

describe("TopCutBracket.create — validation", () => {
  it("throws if size is not a power of 2", () => {
    expect(() => TopCutBracket.create(["s1", "s2", "s3"])).toThrow(
      "must be a power of 2",
    );
  });

  it("throws if size is smaller than 2", () => {
    expect(() => TopCutBracket.create(["s1"])).toThrow("must be a power of 2");
  });
});

describe("TopCutBracket.create — seeding structure", () => {
  it("builds a size-4 bracket with standard seeding (1v4, 2v3) and an empty final", () => {
    const bracket = TopCutBracket.create(["s1", "s2", "s3", "s4"]);

    expect(bracket.getSize()).toBe(4);
    expect(bracket.getTotalRounds()).toBe(2);

    const round1 = bracket.getRound(1);
    expect(round1).toHaveLength(2);
    expect(round1[0].getPlayer1Id()).toBe("s1");
    expect(round1[0].getPlayer2Id()).toBe("s4");
    expect(round1[1].getPlayer1Id()).toBe("s2");
    expect(round1[1].getPlayer2Id()).toBe("s3");

    const final = bracket.getMatch(2, 0);
    expect(final.isReady()).toBe(false);
  });

  it("builds a size-8 bracket with standard seeding (1v8, 4v5, 2v7, 3v6)", () => {
    const seeds = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"];
    const bracket = TopCutBracket.create(seeds);

    expect(bracket.getTotalRounds()).toBe(3);

    const round1 = bracket.getRound(1);
    expect(round1).toHaveLength(4);
    expect([round1[0].getPlayer1Id(), round1[0].getPlayer2Id()]).toEqual([
      "s1",
      "s8",
    ]);
    expect([round1[1].getPlayer1Id(), round1[1].getPlayer2Id()]).toEqual([
      "s4",
      "s5",
    ]);
    expect([round1[2].getPlayer1Id(), round1[2].getPlayer2Id()]).toEqual([
      "s2",
      "s7",
    ]);
    expect([round1[3].getPlayer1Id(), round1[3].getPlayer2Id()]).toEqual([
      "s3",
      "s6",
    ]);
  });

  it("throws when accessing a round or match that doesn't exist", () => {
    const bracket = TopCutBracket.create(["s1", "s2", "s3", "s4"]);
    expect(() => bracket.getRound(5)).toThrow("does not exist in this bracket");
    expect(() => bracket.getMatch(1, 99)).toThrow(
      "No match at round 1, position 99",
    );
  });
});

describe("TopCutBracket.reportMatchWinner — advancement", () => {
  it("advances the round-1 winners into the correct slots of round 2", () => {
    const bracket = TopCutBracket.create(["s1", "s2", "s3", "s4"]);

    bracket.reportMatchWinner(1, 0, "s1"); // beats s4
    bracket.reportMatchWinner(1, 1, "s3"); // beats s2

    const final = bracket.getMatch(2, 0);
    expect(final.getPlayer1Id()).toBe("s1"); // even position -> slot 1
    expect(final.getPlayer2Id()).toBe("s3"); // odd position -> slot 2
    expect(final.isReady()).toBe(true);
  });

  it("does not try to advance a winner from the final round", () => {
    const bracket = TopCutBracket.create(["s1", "s2", "s3", "s4"]);
    bracket.reportMatchWinner(1, 0, "s1");
    bracket.reportMatchWinner(1, 1, "s3");

    expect(() => bracket.reportMatchWinner(2, 0, "s1")).not.toThrow();
    expect(bracket.getChampion()).toBe("s1");
  });

  it("plays out a full size-8 bracket to a champion", () => {
    const seeds = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"];
    const bracket = TopCutBracket.create(seeds);

    // Round 1: favorites win
    bracket.reportMatchWinner(1, 0, "s1");
    bracket.reportMatchWinner(1, 1, "s4");
    bracket.reportMatchWinner(1, 2, "s2");
    bracket.reportMatchWinner(1, 3, "s3");

    expect(bracket.isComplete()).toBe(false);

    // Round 2 (semis)
    bracket.reportMatchWinner(2, 0, "s1");
    bracket.reportMatchWinner(2, 1, "s2");

    // Round 3 (final)
    bracket.reportMatchWinner(3, 0, "s1");

    expect(bracket.isComplete()).toBe(true);
    expect(bracket.getChampion()).toBe("s1");
  });
});

describe("TopCutBracket.revertMatchWinner — rollback", () => {
  it("clears the winner and the slot it advanced into", () => {
    const bracket = TopCutBracket.create(["s1", "s2", "s3", "s4"]);
    bracket.reportMatchWinner(1, 0, "s1");

    bracket.revertMatchWinner(1, 0);

    const round1Match = bracket.getMatch(1, 0);
    expect(round1Match.getWinnerId()).toBeNull();
    const final = bracket.getMatch(2, 0);
    expect(final.getPlayer1Id()).toBeNull();
  });

  it("allows re-reporting a different winner after reverting", () => {
    const bracket = TopCutBracket.create(["s1", "s2", "s3", "s4"]);
    bracket.reportMatchWinner(1, 0, "s1");
    bracket.revertMatchWinner(1, 0);

    bracket.reportMatchWinner(1, 0, "s4");

    expect(bracket.getMatch(2, 0).getPlayer1Id()).toBe("s4");
  });

  it("throws if the next round's match has already been decided", () => {
    const bracket = TopCutBracket.create(["s1", "s2", "s3", "s4"]);
    bracket.reportMatchWinner(1, 0, "s1");
    bracket.reportMatchWinner(1, 1, "s3");
    bracket.reportMatchWinner(2, 0, "s1");

    expect(() => bracket.revertMatchWinner(1, 0)).toThrow(
      "the next round's match has already been decided",
    );
  });

  it("allows reverting the final round directly (no downstream match to worry about)", () => {
    const bracket = TopCutBracket.create(["s1", "s2", "s3", "s4"]);
    bracket.reportMatchWinner(1, 0, "s1");
    bracket.reportMatchWinner(1, 1, "s3");
    bracket.reportMatchWinner(2, 0, "s1");

    expect(() => bracket.revertMatchWinner(2, 0)).not.toThrow();
    expect(bracket.getChampion()).toBeNull();
  });

  it("throws if there's no winner to revert", () => {
    const bracket = TopCutBracket.create(["s1", "s2", "s3", "s4"]);
    expect(() => bracket.revertMatchWinner(1, 0)).toThrow(
      "has no reported winner to revert",
    );
  });
});

describe("TopCutBracket.getChampion / isComplete", () => {
  it("returns null before the final is decided", () => {
    const bracket = TopCutBracket.create(["s1", "s2", "s3", "s4"]);
    expect(bracket.getChampion()).toBeNull();
    expect(bracket.isComplete()).toBe(false);
  });
});
