import { describe, it, expect } from "vitest";
import { Round } from "../Round";
import { Match } from "../Match";

describe("Round.create", () => {
  it("creates a pending round with the given matches", () => {
    const matches = [
      Match.createPairing("m1", 1, 1, "p1", "p2"),
      Match.createPairing("m2", 1, 2, "p3", "p4"),
    ];

    const round = Round.create(1, matches);

    expect(round.getRoundNumber()).toBe(1);
    expect(round.getStatus()).toBe("pending");
    expect(round.isCompleted()).toBe(false);
    expect(round.getMatches()).toHaveLength(2);
  });

  it("throws if no matches are provided", () => {
    expect(() => Round.create(1, [])).toThrow(
      "must contain at least one match",
    );
  });

  it("throws if a match belongs to a different round number", () => {
    const matches = [Match.createPairing("m1", 2, 1, "p1", "p2")];

    expect(() => Round.create(1, matches)).toThrow(
      "All matches must belong to round 1",
    );
  });
});

describe("Round.getMatch", () => {
  it("returns the match with the given id", () => {
    const match = Match.createPairing("m1", 1, 1, "p1", "p2");
    const round = Round.create(1, [match]);

    expect(round.getMatch("m1")).toBe(match);
  });

  it("throws if the match id does not exist in the round", () => {
    const round = Round.create(1, [
      Match.createPairing("m1", 1, 1, "p1", "p2"),
    ]);

    expect(() => round.getMatch("m999")).toThrow(
      "Match m999 not found in round 1",
    );
  });
});

describe("Round.allMatchesResolved / getPendingMatches", () => {
  it("is false while any match is still pending", () => {
    const round = Round.create(1, [
      Match.createPairing("m1", 1, 1, "p1", "p2"),
      Match.createPairing("m2", 1, 2, "p3", "p4"),
    ]);

    expect(round.allMatchesResolved()).toBe(false);
    expect(round.getPendingMatches()).toHaveLength(2);
  });

  it("is true once every match has a result", () => {
    const m1 = Match.createPairing("m1", 1, 1, "p1", "p2");
    const m2 = Match.createPairing("m2", 1, 2, "p3", "p4");
    m1.reportWin("p1", 2, 0);
    m2.reportDoubleLoss(0, 0);

    const round = Round.create(1, [m1, m2]);

    expect(round.allMatchesResolved()).toBe(true);
    expect(round.getPendingMatches()).toHaveLength(0);
  });

  it("treats a bye as already resolved", () => {
    const m1 = Match.createPairing("m1", 1, 1, "p1", "p2");
    m1.reportWin("p1", 2, 0);
    const bye = Match.createBye("m2", 1, 2, "p5");

    const round = Round.create(1, [m1, bye]);

    expect(round.allMatchesResolved()).toBe(true);
  });
});

describe("Round.complete", () => {
  it("completes the round once all matches are resolved", () => {
    const m1 = Match.createPairing("m1", 1, 1, "p1", "p2");
    m1.reportWin("p1", 2, 0);
    const round = Round.create(1, [m1]);

    round.complete();

    expect(round.isCompleted()).toBe(true);
    expect(round.getStatus()).toBe("completed");
  });

  it("throws if there are still pending matches", () => {
    const round = Round.create(1, [
      Match.createPairing("m1", 1, 1, "p1", "p2"),
    ]);

    expect(() => round.complete()).toThrow("still has pending matches");
  });

  it("throws if the round is already completed", () => {
    const m1 = Match.createPairing("m1", 1, 1, "p1", "p2");
    m1.reportWin("p1", 2, 0);
    const round = Round.create(1, [m1]);
    round.complete();

    expect(() => round.complete()).toThrow("is already completed");
  });
});

describe("Round.revertCompletion", () => {
  it("marks a completed round back as pending", () => {
    const m1 = Match.createPairing("m1", 1, 1, "p1", "p2");
    m1.reportWin("p1", 2, 0);
    const round = Round.create(1, [m1]);
    round.complete();

    round.revertCompletion();

    expect(round.getStatus()).toBe("pending");
    expect(round.isCompleted()).toBe(false);
  });

  it("does not touch the underlying match results", () => {
    const m1 = Match.createPairing("m1", 1, 1, "p1", "p2");
    m1.reportWin("p1", 2, 0);
    const round = Round.create(1, [m1]);
    round.complete();

    round.revertCompletion();

    // the match itself still holds its result; reverting the round's
    // completion status is a separate step from reverting each match
    expect(round.getMatch("m1").getResult()).toEqual({
      type: "win",
      winnerId: "p1",
      winnerGames: 2,
      loserGames: 0,
    });
  });

  it("allows completing the round again after reverting, once matches are still resolved", () => {
    const m1 = Match.createPairing("m1", 1, 1, "p1", "p2");
    m1.reportWin("p1", 2, 0);
    const round = Round.create(1, [m1]);
    round.complete();
    round.revertCompletion();

    expect(() => round.complete()).not.toThrow();
  });

  it("throws if the round is not completed", () => {
    const round = Round.create(1, [
      Match.createPairing("m1", 1, 1, "p1", "p2"),
    ]);

    expect(() => round.revertCompletion()).toThrow(
      "is not completed, nothing to revert",
    );
  });
});

describe("Round.toProps / fromProps round-trip", () => {
  it("reconstructs an identical round from its props", () => {
    const m1 = Match.createPairing("m1", 1, 1, "p1", "p2");
    m1.reportWin("p1", 2, 0);
    const original = Round.create(1, [m1]);
    original.complete();

    const rebuilt = Round.fromProps(original.toProps());

    expect(rebuilt.getStatus()).toBe(original.getStatus());
    expect(rebuilt.getRoundNumber()).toBe(original.getRoundNumber());
    expect(rebuilt.getMatches()).toHaveLength(original.getMatches().length);
  });
});
