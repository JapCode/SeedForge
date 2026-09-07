import { describe, it, expect } from "vitest";
import { Tournament } from "../../entities/Tournament";
import { Player } from "../../entities/Player";
import { Round } from "../../entities/Round";
import { Match } from "../../entities/Match";
import { StandingsBeforeRoundService } from "../StandingsBeforeRoundService";

function createTournament(
  overrides: Partial<Parameters<typeof Tournament.create>[0]> = {},
) {
  return Tournament.create({
    id: "t1",
    ownerId: "u1",
    name: "Regional YCS",
    totalSwissRounds: 3,
    ...overrides,
  });
}

function registerPlayers(tournament: Tournament, count: number): Player[] {
  const players = Array.from({ length: count }, (_, i) =>
    Player.create(`p${i + 1}`, `Player ${i + 1}`),
  );
  players.forEach((p) => tournament.registerPlayer(p));
  return players;
}

/**
 * Reports a win on the match AND records the stats on both players, the
 * same way the RegisterMatchResult use-case does in the application layer.
 */
function reportWinAndRecordStats(
  tournament: Tournament,
  match: Match,
  winnerId: string,
  winnerGames = 2,
  loserGames = 0,
): void {
  const loserId =
    match.getPlayer1Id() === winnerId
      ? match.getPlayer2Id()!
      : match.getPlayer1Id();
  match.reportWin(winnerId, winnerGames, loserGames);
  const totalGames = winnerGames + loserGames;
  tournament
    .getPlayer(winnerId)
    .recordMatchWin(loserId, winnerGames, totalGames);
  tournament
    .getPlayer(loserId)
    .recordMatchLoss(winnerId, match.getRoundNumber(), loserGames, totalGames);
}

/** 4 players, 3 rounds: p1 and p3 win round 1, p1 and p2 win round 2. */
function tournamentWithThreeRounds(): Tournament {
  const tournament = createTournament();
  registerPlayers(tournament, 4);
  tournament.startSwissRounds();

  const m1 = Match.createPairing("m1", 1, 1, "p1", "p2");
  reportWinAndRecordStats(tournament, m1, "p1");
  const m2 = Match.createPairing("m2", 1, 2, "p3", "p4");
  reportWinAndRecordStats(tournament, m2, "p3");
  tournament.addRound(Round.create(1, [m1, m2]));
  tournament.completeRound(1);

  const m3 = Match.createPairing("m3", 2, 1, "p1", "p3");
  reportWinAndRecordStats(tournament, m3, "p1", 2, 1);
  const m4 = Match.createPairing("m4", 2, 2, "p2", "p4");
  reportWinAndRecordStats(tournament, m4, "p2");
  tournament.addRound(Round.create(2, [m3, m4]));
  tournament.completeRound(2);

  const m5 = Match.createPairing("m5", 3, 1, "p1", "p4");
  reportWinAndRecordStats(tournament, m5, "p1");
  const m6 = Match.createPairing("m6", 3, 2, "p2", "p3");
  reportWinAndRecordStats(tournament, m6, "p2", 2, 1);
  tournament.addRound(Round.create(3, [m5, m6]));

  return tournament;
}

describe("StandingsBeforeRoundService.snapshot", () => {
  it("returns every player at 0 points before round 1", () => {
    const tournament = createTournament();
    registerPlayers(tournament, 3);
    tournament.startSwissRounds();

    const snapshot = StandingsBeforeRoundService.snapshot(tournament, 1);

    expect(snapshot).toHaveLength(3);
    for (const player of snapshot) {
      expect(player.getPoints()).toBe(0);
      expect(player.getOpponentIds()).toHaveLength(0);
      expect(player.hasHadBye()).toBe(false);
    }
  });

  it("reflects only the rounds played before the target round", () => {
    const tournament = tournamentWithThreeRounds();

    const beforeRound3 = StandingsBeforeRoundService.snapshot(tournament, 3);
    const pointsById = new Map(
      beforeRound3.map((p) => [p.getId(), p.getPoints()]),
    );

    // p1 won rounds 1 and 2 (6 pts); round 3's win must NOT count yet.
    expect(pointsById.get("p1")).toBe(6);
    expect(pointsById.get("p2")).toBe(3); // lost r1, won r2
    expect(pointsById.get("p3")).toBe(3); // won r1, lost r2
    expect(pointsById.get("p4")).toBe(0);
  });

  it("sorts the snapshot best-to-worst by standings", () => {
    const tournament = tournamentWithThreeRounds();

    const beforeRound3 = StandingsBeforeRoundService.snapshot(tournament, 3);

    expect(beforeRound3.map((p) => p.getId())).toEqual([
      "p1",
      "p2",
      "p3",
      "p4",
    ]);
  });

  it("counts a bye as 3 points and a 2-0 game record", () => {
    const tournament = createTournament();
    registerPlayers(tournament, 3);
    tournament.startSwissRounds();

    const m1 = Match.createPairing("m1", 1, 1, "p1", "p2");
    reportWinAndRecordStats(tournament, m1, "p1");
    const bye = Match.createBye("m2", 1, 2, "p3");
    tournament.addRound(Round.create(1, [m1, bye]));
    tournament.completeRound(1);

    const beforeRound2 = StandingsBeforeRoundService.snapshot(tournament, 2);
    const p3 = beforeRound2.find((p) => p.getId() === "p3")!;

    expect(p3.getPoints()).toBe(3);
    expect(p3.hasHadBye()).toBe(true);
    expect(p3.getGamesWon()).toBe(2);
    expect(p3.getGamesPlayed()).toBe(2);
  });

  it("carries the dropped flag over to the snapshot", () => {
    const tournament = tournamentWithThreeRounds();
    tournament.dropPlayer("p4");

    const beforeRound3 = StandingsBeforeRoundService.snapshot(tournament, 3);
    const p4 = beforeRound3.find((p) => p.getId() === "p4")!;

    expect(p4.isDropped()).toBe(true);
  });

  it("ignores pending matches in earlier rounds", () => {
    const tournament = createTournament();
    registerPlayers(tournament, 2);
    tournament.startSwissRounds();

    const pending = Match.createPairing("m1", 1, 1, "p1", "p2");
    tournament.addRound(Round.create(1, [pending]));

    const beforeRound2 = StandingsBeforeRoundService.snapshot(tournament, 2);

    expect(beforeRound2.find((p) => p.getId() === "p1")!.getPoints()).toBe(0);
    expect(beforeRound2.find((p) => p.getId() === "p2")!.getPoints()).toBe(0);
  });

  it("awards 1 point each for a draw and 0 for a double loss", () => {
    const tournament = createTournament();
    registerPlayers(tournament, 4);
    tournament.startSwissRounds();

    const draw = Match.createPairing("m1", 1, 1, "p1", "p2");
    draw.reportDraw(1, 1);
    tournament.getPlayer("p1").recordMatchDraw("p2", 1, 2);
    tournament.getPlayer("p2").recordMatchDraw("p1", 1, 2);

    const doubleLoss = Match.createPairing("m2", 1, 2, "p3", "p4");
    doubleLoss.reportDoubleLoss(0, 0);
    tournament.getPlayer("p3").recordMatchLoss("p4", 1, 0, 0);
    tournament.getPlayer("p4").recordMatchLoss("p3", 1, 0, 0);

    tournament.addRound(Round.create(1, [draw, doubleLoss]));
    tournament.completeRound(1);

    const beforeRound2 = StandingsBeforeRoundService.snapshot(tournament, 2);
    const pointsById = new Map(
      beforeRound2.map((p) => [p.getId(), p.getPoints()]),
    );

    expect(pointsById.get("p1")).toBe(1);
    expect(pointsById.get("p2")).toBe(1);
    expect(pointsById.get("p3")).toBe(0);
    expect(pointsById.get("p4")).toBe(0);
    // Opponents are still recorded for tiebreaker purposes.
    expect(
      beforeRound2.find((p) => p.getId() === "p3")!.getOpponentIds(),
    ).toEqual(["p4"]);
  });

  it("does not mutate the tournament's live players", () => {
    const tournament = tournamentWithThreeRounds();

    StandingsBeforeRoundService.snapshot(tournament, 2);

    // Live stats still include all three rounds.
    expect(tournament.getPlayer("p1").getPoints()).toBe(9);
    expect(tournament.getPlayer("p2").getPoints()).toBe(6);
  });
});
