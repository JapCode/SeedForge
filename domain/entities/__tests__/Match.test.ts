import { describe, it, expect } from "vitest";
import { Match } from "../Match";

describe("Match.createPairing", () => {
  it("creates a pending match between two different players", () => {
    const match = Match.createPairing("m1", 1, 1, "p1", "p2");

    expect(match.getId()).toBe("m1");
    expect(match.getRoundNumber()).toBe(1);
    expect(match.getTableNumber()).toBe(1);
    expect(match.getPlayer1Id()).toBe("p1");
    expect(match.getPlayer2Id()).toBe("p2");
    expect(match.isBye()).toBe(false);
    expect(match.isPending()).toBe(true);
    expect(match.getResult()).toEqual({ type: "pending" });
  });

  it("throws if a player is paired against themselves", () => {
    expect(() => Match.createPairing("m1", 1, 1, "p1", "p1")).toThrow(
      "A player cannot be paired against themselves",
    );
  });
});

describe("Match.createBye", () => {
  it("creates a resolved bye match for a single player", () => {
    const match = Match.createBye("m1", 1, 1, "p1");

    expect(match.isBye()).toBe(true);
    expect(match.getPlayer1Id()).toBe("p1");
    expect(match.getPlayer2Id()).toBeNull();
    expect(match.getResult()).toEqual({ type: "bye" });
    expect(match.isPending()).toBe(false); // a bye is never "pending"
  });
});

describe("Match helpers", () => {
  it("involvesPlayer returns true for both players and false otherwise", () => {
    const match = Match.createPairing("m1", 1, 1, "p1", "p2");

    expect(match.involvesPlayer("p1")).toBe(true);
    expect(match.involvesPlayer("p2")).toBe(true);
    expect(match.involvesPlayer("p3")).toBe(false);
  });

  it("getOpponentOf returns the other player's id", () => {
    const match = Match.createPairing("m1", 1, 1, "p1", "p2");

    expect(match.getOpponentOf("p1")).toBe("p2");
    expect(match.getOpponentOf("p2")).toBe("p1");
  });

  it("getOpponentOf throws if the player is not part of the match", () => {
    const match = Match.createPairing("m1", 1, 1, "p1", "p2");

    expect(() => match.getOpponentOf("p3")).toThrow("is not part of match");
  });
});

describe("Match.reportWin", () => {
  it("reports a win with a valid game score", () => {
    const match = Match.createPairing("m1", 1, 1, "p1", "p2");

    match.reportWin("p1", 2, 1);

    expect(match.getResult()).toEqual({
      type: "win",
      winnerId: "p1",
      winnerGames: 2,
      loserGames: 1,
    });
    expect(match.isPending()).toBe(false);
  });

  it("throws if winnerGames is not greater than loserGames", () => {
    const match = Match.createPairing("m1", 1, 1, "p1", "p2");

    expect(() => match.reportWin("p1", 1, 1)).toThrow(
      "Winner games must be greater than loser games",
    );
    expect(() => match.reportWin("p1", 1, 2)).toThrow(
      "Winner games must be greater than loser games",
    );
  });

  it("throws if the declared winner is not part of the match", () => {
    const match = Match.createPairing("m1", 1, 1, "p1", "p2");

    expect(() => match.reportWin("p3", 2, 1)).toThrow("is not part of match");
  });

  it("throws if the match already has a result", () => {
    const match = Match.createPairing("m1", 1, 1, "p1", "p2");
    match.reportWin("p1", 2, 1);

    expect(() => match.reportWin("p2", 2, 0)).toThrow(
      "already has a reported result",
    );
  });

  it("throws when reporting a win on a bye match", () => {
    const match = Match.createBye("m1", 1, 1, "p1");

    expect(() => match.reportWin("p1", 2, 0)).toThrow(
      "is a bye and cannot report/revert a result",
    );
  });
});

describe("Match.reportDraw (legacy ruleset)", () => {
  it("reports a draw with the games from each player", () => {
    const match = Match.createPairing("m1", 1, 1, "p1", "p2");

    match.reportDraw(1, 1);

    expect(match.getResult()).toEqual({
      type: "draw",
      player1Games: 1,
      player2Games: 1,
    });
  });

  it("throws if the match already has a result", () => {
    const match = Match.createPairing("m1", 1, 1, "p1", "p2");
    match.reportDraw(1, 1);

    expect(() => match.reportDraw(1, 1)).toThrow(
      "already has a reported result",
    );
  });

  it("throws when reporting a draw on a bye match", () => {
    const match = Match.createBye("m1", 1, 1, "p1");

    expect(() => match.reportDraw(1, 1)).toThrow(
      "is a bye and cannot report/revert a result",
    );
  });
});

describe("Match.reportDoubleLoss (current Konami policy)", () => {
  it("reports a double loss with the tied game score", () => {
    const match = Match.createPairing("m1", 1, 1, "p1", "p2");

    match.reportDoubleLoss(1, 1);

    expect(match.getResult()).toEqual({
      type: "double_loss",
      player1Games: 1,
      player2Games: 1,
    });
    expect(match.isPending()).toBe(false);
  });

  it("throws if the match already has a result", () => {
    const match = Match.createPairing("m1", 1, 1, "p1", "p2");
    match.reportDoubleLoss(1, 1);

    expect(() => match.reportDoubleLoss(1, 1)).toThrow(
      "already has a reported result",
    );
  });

  it("throws when reporting a double loss on a bye match", () => {
    const match = Match.createBye("m1", 1, 1, "p1");

    expect(() => match.reportDoubleLoss(1, 1)).toThrow(
      "is a bye and cannot report/revert a result",
    );
  });
});

describe("Match.revertResult", () => {
  it("reverts a win back to pending", () => {
    const match = Match.createPairing("m1", 1, 1, "p1", "p2");
    match.reportWin("p1", 2, 1);

    match.revertResult();

    expect(match.getResult()).toEqual({ type: "pending" });
    expect(match.isPending()).toBe(true);
  });

  it("reverts a draw back to pending", () => {
    const match = Match.createPairing("m1", 1, 1, "p1", "p2");
    match.reportDraw(1, 1);

    match.revertResult();

    expect(match.isPending()).toBe(true);
  });

  it("reverts a double loss back to pending", () => {
    const match = Match.createPairing("m1", 1, 1, "p1", "p2");
    match.reportDoubleLoss(1, 1);

    match.revertResult();

    expect(match.isPending()).toBe(true);
  });

  it("allows reporting a new result after reverting", () => {
    const match = Match.createPairing("m1", 1, 1, "p1", "p2");
    match.reportWin("p1", 2, 1);
    match.revertResult();

    match.reportWin("p2", 2, 0);

    expect(match.getResult()).toEqual({
      type: "win",
      winnerId: "p2",
      winnerGames: 2,
      loserGames: 0,
    });
  });

  it("throws if the match is still pending", () => {
    const match = Match.createPairing("m1", 1, 1, "p1", "p2");

    expect(() => match.revertResult()).toThrow(
      "has no reported result to revert",
    );
  });

  it("throws when reverting a bye match", () => {
    const match = Match.createBye("m1", 1, 1, "p1");

    expect(() => match.revertResult()).toThrow(
      "is a bye and cannot report/revert a result",
    );
  });
});

describe("Match.toProps / fromProps round-trip", () => {
  it("reconstructs an identical match from its props", () => {
    const original = Match.createPairing("m1", 1, 1, "p1", "p2");
    original.reportWin("p1", 2, 1);

    const rebuilt = Match.fromProps(original.toProps());

    expect(rebuilt.toProps()).toEqual(original.toProps());
  });
});
