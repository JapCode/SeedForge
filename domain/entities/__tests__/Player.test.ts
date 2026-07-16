import { describe, it, expect } from "vitest";
import { Player } from "../Player";

describe("Player.create", () => {
  it("creates a player with zeroed-out stats", () => {
    const player = Player.create("p1", "Ash Ketchum");

    expect(player.getId()).toBe("p1");
    expect(player.getName()).toBe("Ash Ketchum");
    expect(player.getPoints()).toBe(0);
    expect(player.getOpponentIds()).toEqual([]);
    expect(player.hasHadBye()).toBe(false);
    expect(player.isDropped()).toBe(false);
    expect(player.getGameWinPercentage()).toBe(0);
  });

  it("trims the player name", () => {
    const player = Player.create("p1", "  Ash Ketchum  ");
    expect(player.getName()).toBe("Ash Ketchum");
  });

  it("throws when the name is empty", () => {
    expect(() => Player.create("p1", "")).toThrow(
      "Player name cannot be empty",
    );
  });

  it("throws when the name is only whitespace", () => {
    expect(() => Player.create("p1", "   ")).toThrow(
      "Player name cannot be empty",
    );
  });
});

describe("Player match results", () => {
  it("awards 3 points and registers the opponent on a win", () => {
    const player = Player.create("p1", "Ash");

    player.recordMatchWin("p2", 2, 3);

    expect(player.getPoints()).toBe(3);
    expect(player.hasPlayedAgainst("p2")).toBe(true);
    expect(player.getGamesWon()).toBe(2);
    expect(player.getGamesPlayed()).toBe(3);
    expect(player.getGameWinPercentage()).toBeCloseTo(2 / 3);
  });

  it("awards 1 point on a draw (legacy ruleset)", () => {
    const player = Player.create("p1", "Ash");

    player.recordMatchDraw("p2", 1, 2);

    expect(player.getPoints()).toBe(1);
    expect(player.hasPlayedAgainst("p2")).toBe(true);
  });

  it("awards 0 points and still registers games/opponent on a loss", () => {
    const player = Player.create("p1", "Ash");

    player.recordMatchLoss("p2", 0, 2);

    expect(player.getPoints()).toBe(0);
    expect(player.hasPlayedAgainst("p2")).toBe(true);
    expect(player.getGamesPlayed()).toBe(2);
  });

  it("accumulates points and games across multiple rounds", () => {
    const player = Player.create("p1", "Ash");

    player.recordMatchWin("p2", 2, 3);
    player.recordMatchLoss("p3", 1, 2);
    player.recordMatchDraw("p4", 1, 2);

    expect(player.getPoints()).toBe(3 + 0 + 1);
    expect(player.getOpponentIds()).toEqual(["p2", "p3", "p4"]);
    expect(player.getGamesWon()).toBe(2 + 1 + 1);
    expect(player.getGamesPlayed()).toBe(3 + 2 + 2);
  });
});

describe("Player bye handling", () => {
  it("awards 3 points and marks the player as having had a bye", () => {
    const player = Player.create("p1", "Ash");

    player.recordBye();

    expect(player.getPoints()).toBe(3);
    expect(player.hasHadBye()).toBe(true);
  });

  it("awards a 2-0 game record along with the bye (for game-win percentage purposes)", () => {
    const player = Player.create("p1", "Ash");

    player.recordBye();

    expect(player.getGamesWon()).toBe(2);
    expect(player.getGamesPlayed()).toBe(2);
    expect(player.getGameWinPercentage()).toBe(1);
  });

  it("throws if the player already had a bye", () => {
    const player = Player.create("p1", "Ash");
    player.recordBye();

    expect(() => player.recordBye()).toThrow("has already received a bye");
  });
});

describe("Player rollback", () => {
  it("reverting a match result undoes points, opponent and games exactly", () => {
    const player = Player.create("p1", "Ash");
    player.recordMatchWin("p2", 2, 3);

    player.revertMatchResult("p2", 3, 2, 3);

    expect(player.getPoints()).toBe(0);
    expect(player.hasPlayedAgainst("p2")).toBe(false);
    expect(player.getGamesWon()).toBe(0);
    expect(player.getGamesPlayed()).toBe(0);
  });

  it("reverting a draw result undoes the single point awarded", () => {
    const player = Player.create("p1", "Ash");
    player.recordMatchDraw("p2", 1, 2);

    player.revertMatchResult("p2", 1, 1, 2);

    expect(player.getPoints()).toBe(0);
    expect(player.hasPlayedAgainst("p2")).toBe(false);
  });

  it("only removes the reverted opponent, keeping other match history intact", () => {
    const player = Player.create("p1", "Ash");
    player.recordMatchWin("p2", 2, 3);
    player.recordMatchWin("p3", 2, 2);

    player.revertMatchResult("p2", 3, 2, 3);

    expect(player.getPoints()).toBe(3);
    expect(player.hasPlayedAgainst("p2")).toBe(false);
    expect(player.hasPlayedAgainst("p3")).toBe(true);
  });

  it("reverting a bye restores hadBye to false and removes the 3 points", () => {
    const player = Player.create("p1", "Ash");
    player.recordBye();

    player.revertBye();

    expect(player.getPoints()).toBe(0);
    expect(player.hasHadBye()).toBe(false);
  });

  it("reverting a bye also removes the 2-0 game record it granted", () => {
    const player = Player.create("p1", "Ash");
    player.recordMatchWin("p2", 2, 3); // unrelated prior game history should be untouched
    player.recordBye();

    player.revertBye();

    expect(player.getGamesWon()).toBe(2);
    expect(player.getGamesPlayed()).toBe(3);
  });

  it("throws when reverting a bye that was never given", () => {
    const player = Player.create("p1", "Ash");
    expect(() => player.revertBye()).toThrow("did not have a bye to revert");
  });

  it("allows a fresh bye to be recorded again after reverting", () => {
    const player = Player.create("p1", "Ash");
    player.recordBye();
    player.revertBye();

    expect(() => player.recordBye()).not.toThrow();
    expect(player.getPoints()).toBe(3);
  });
});

describe("Player drop and top cut seeding", () => {
  it("marks a player as dropped", () => {
    const player = Player.create("p1", "Ash");
    player.drop();
    expect(player.isDropped()).toBe(true);
  });

  it("assigns a top cut seed", () => {
    const player = Player.create("p1", "Ash");
    expect(player.getTopCutSeed()).toBeNull();

    player.assignTopCutSeed(1);

    expect(player.getTopCutSeed()).toBe(1);
  });
});

describe("Player.toProps / fromProps round-trip", () => {
  it("reconstructs an identical player from its props", () => {
    const original = Player.create("p1", "Ash");
    original.recordMatchWin("p2", 2, 3);
    original.assignTopCutSeed(4);

    const rebuilt = Player.fromProps(original.toProps());

    expect(rebuilt.toProps()).toEqual(original.toProps());
  });

  it("toProps returns a defensive copy of opponentIds", () => {
    const player = Player.create("p1", "Ash");
    player.recordMatchWin("p2", 2, 3);

    const props = player.toProps();
    props.opponentIds.push("p999");

    expect(player.getOpponentIds()).toEqual(["p2"]);
  });
});
