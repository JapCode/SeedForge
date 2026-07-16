import { describe, it, expect } from "vitest";
import { TiebreakerCalculator } from "../TiebreakerCalculator";
import { Player } from "../../entities/Player";

describe("TiebreakerCalculator.calculateFor — matchWinPercentage", () => {
  it("matches the reference example: a 5-3 record over 8 matches yields 62.5% MWP", () => {
    const player = Player.create("p1", "Ash");
    const opponents = Array.from({ length: 8 }, (_, i) =>
      Player.create(`o${i}`, `Opponent ${i}`),
    );

    // 5 wins, 3 losses
    for (let i = 0; i < 5; i++)
      player.recordMatchWin(opponents[i].getId(), 2, 3);
    for (let i = 5; i < 8; i++)
      player.recordMatchLoss(opponents[i].getId(), 1, 3);

    const tiebreakers = TiebreakerCalculator.calculateFor(player, [
      player,
      ...opponents,
    ]);

    expect(tiebreakers.matchWinPercentage).toBeCloseTo(15 / 24);
  });

  it("counts a bye as a match played and won when computing MWP", () => {
    const player = Player.create("p1", "Ash");
    const opponent = Player.create("p2", "Misty");
    player.recordMatchWin(opponent.getId(), 2, 3);
    player.recordBye();

    const tiebreakers = TiebreakerCalculator.calculateFor(player, [
      player,
      opponent,
    ]);

    // 2 matches played (1 real win + 1 bye), 6 points out of a possible 6
    expect(tiebreakers.matchWinPercentage).toBeCloseTo(1);
  });

  it("returns 0% MWP for a player who has not played any matches", () => {
    const player = Player.create("p1", "Ash");
    const tiebreakers = TiebreakerCalculator.calculateFor(player, [player]);

    expect(tiebreakers.matchWinPercentage).toBe(0);
  });
});

describe("TiebreakerCalculator.calculateFor — opponentsMatchWinPercentage", () => {
  it("averages the current MWP of each real opponent", () => {
    const player = Player.create("p1", "Ash");
    const opp1 = Player.create("o1", "Opponent 1");
    const opp2 = Player.create("o2", "Opponent 2");

    player.recordMatchWin(opp1.getId(), 2, 3);
    player.recordMatchWin(opp2.getId(), 2, 3);
    opp1.recordMatchLoss(player.getId(), 1, 3);
    opp2.recordMatchLoss(player.getId(), 1, 3);

    // opp1 went on to win their other match; opp2 lost theirs too
    opp1.recordMatchWin("o3", 2, 3);
    opp2.recordMatchLoss("o4", 0, 2);

    const tiebreakers = TiebreakerCalculator.calculateFor(player, [
      player,
      opp1,
      opp2,
    ]);

    // opp1 MWP = 3/6 = 0.5 (1 win, 1 loss); opp2 MWP = 0/6 -> floored to 1/3
    expect(tiebreakers.opponentsMatchWinPercentage).toBeCloseTo(
      (0.5 + 1 / 3) / 2,
    );
  });

  it("applies the 33% floor to an opponent who lost every match", () => {
    const player = Player.create("p1", "Ash");
    const weakOpponent = Player.create("o1", "Weak Opponent");

    player.recordMatchLoss(weakOpponent.getId(), 1, 2); // player lost, but that's irrelevant to OMW
    weakOpponent.recordMatchLoss("o2", 0, 2);

    const tiebreakers = TiebreakerCalculator.calculateFor(player, [
      player,
      weakOpponent,
    ]);

    expect(tiebreakers.opponentsMatchWinPercentage).toBeCloseTo(1 / 3);
  });

  it("excludes byes: a player who only had a bye does not affect anyone's OMW%", () => {
    const player = Player.create("p1", "Ash");
    const opponent = Player.create("o1", "Opponent");
    player.recordMatchWin(opponent.getId(), 2, 0);
    opponent.recordMatchLoss(player.getId(), 0, 2);

    // opponent also received a bye earlier, on top of the loss to player
    opponent.recordBye();

    const tiebreakers = TiebreakerCalculator.calculateFor(player, [
      player,
      opponent,
    ]);

    // opponent's own MWP includes the bye (3 pts from bye + 0 from loss = 3/6 = 0.5)
    expect(tiebreakers.opponentsMatchWinPercentage).toBeCloseTo(0.5);
  });

  it("defaults to the 33% floor for a player with no opponents at all", () => {
    const player = Player.create("p1", "Ash");
    player.recordBye(); // only a bye, no real opponents

    const tiebreakers = TiebreakerCalculator.calculateFor(player, [player]);

    expect(tiebreakers.opponentsMatchWinPercentage).toBeCloseTo(1 / 3);
  });
});

describe("TiebreakerCalculator.calculateFor — gameWinPercentage / opponentsGameWinPercentage", () => {
  it("computes the player's own GW% directly from games won/played", () => {
    const player = Player.create("p1", "Ash");
    const opponent = Player.create("o1", "Opponent");
    player.recordMatchWin(opponent.getId(), 2, 3);

    const tiebreakers = TiebreakerCalculator.calculateFor(player, [
      player,
      opponent,
    ]);

    expect(tiebreakers.gameWinPercentage).toBeCloseTo(2 / 3);
  });

  it("a bye contributes a 2-0 game record toward the player's own GW%", () => {
    const player = Player.create("p1", "Ash");
    player.recordBye();

    const tiebreakers = TiebreakerCalculator.calculateFor(player, [player]);

    expect(tiebreakers.gameWinPercentage).toBe(1);
  });

  it("averages opponents' GW% with the 33% floor applied", () => {
    const player = Player.create("p1", "Ash");
    const opponent = Player.create("o1", "Opponent");
    player.recordMatchLoss(opponent.getId(), 0, 2);
    opponent.recordMatchWin(player.getId(), 2, 2); // opponent's own perspective: 100% GW%

    const tiebreakers = TiebreakerCalculator.calculateFor(player, [
      player,
      opponent,
    ]);

    expect(tiebreakers.opponentsGameWinPercentage).toBeCloseTo(1);
  });
});

describe("TiebreakerCalculator.calculateForAll", () => {
  it("returns tiebreakers for every player keyed by id", () => {
    const p1 = Player.create("p1", "Ash");
    const p2 = Player.create("p2", "Misty");
    p1.recordMatchWin(p2.getId(), 2, 0);
    p2.recordMatchLoss(p1.getId(), 0, 2);

    const results = TiebreakerCalculator.calculateForAll([p1, p2]);

    expect(results.size).toBe(2);
    expect(results.get("p1")!.matchPoints).toBe(3);
    expect(results.get("p2")!.matchPoints).toBe(0);
  });
});

describe("TiebreakerCalculator.compare", () => {
  it("ranks higher match points first", () => {
    const better = {
      matchPoints: 6,
      matchWinPercentage: 1,
      opponentsMatchWinPercentage: 0,
      gameWinPercentage: 0,
      opponentsGameWinPercentage: 0,
    };
    const worse = {
      matchPoints: 3,
      matchWinPercentage: 0.5,
      opponentsMatchWinPercentage: 1,
      gameWinPercentage: 1,
      opponentsGameWinPercentage: 1,
    };

    expect(TiebreakerCalculator.compare(better, worse)).toBeLessThan(0);
  });

  it("falls back to OMW% when match points are tied", () => {
    const better = {
      matchPoints: 6,
      matchWinPercentage: 1,
      opponentsMatchWinPercentage: 0.6,
      gameWinPercentage: 0,
      opponentsGameWinPercentage: 0,
    };
    const worse = {
      matchPoints: 6,
      matchWinPercentage: 1,
      opponentsMatchWinPercentage: 0.4,
      gameWinPercentage: 1,
      opponentsGameWinPercentage: 1,
    };

    expect(TiebreakerCalculator.compare(better, worse)).toBeLessThan(0);
  });

  it("falls back to GW% when match points and OMW% are tied", () => {
    const better = {
      matchPoints: 6,
      matchWinPercentage: 1,
      opponentsMatchWinPercentage: 0.5,
      gameWinPercentage: 0.8,
      opponentsGameWinPercentage: 0,
    };
    const worse = {
      matchPoints: 6,
      matchWinPercentage: 1,
      opponentsMatchWinPercentage: 0.5,
      gameWinPercentage: 0.6,
      opponentsGameWinPercentage: 1,
    };

    expect(TiebreakerCalculator.compare(better, worse)).toBeLessThan(0);
  });

  it("falls back to OGW% as the final tiebreaker", () => {
    const better = {
      matchPoints: 6,
      matchWinPercentage: 1,
      opponentsMatchWinPercentage: 0.5,
      gameWinPercentage: 0.7,
      opponentsGameWinPercentage: 0.6,
    };
    const worse = {
      matchPoints: 6,
      matchWinPercentage: 1,
      opponentsMatchWinPercentage: 0.5,
      gameWinPercentage: 0.7,
      opponentsGameWinPercentage: 0.4,
    };

    expect(TiebreakerCalculator.compare(better, worse)).toBeLessThan(0);
  });

  it("returns 0 when every tiebreaker is fully tied", () => {
    const a = {
      matchPoints: 6,
      matchWinPercentage: 1,
      opponentsMatchWinPercentage: 0.5,
      gameWinPercentage: 0.7,
      opponentsGameWinPercentage: 0.5,
    };
    const b = {
      matchPoints: 6,
      matchWinPercentage: 1,
      opponentsMatchWinPercentage: 0.5,
      gameWinPercentage: 0.7,
      opponentsGameWinPercentage: 0.5,
    };

    expect(TiebreakerCalculator.compare(a, b)).toBe(0);
  });
});
