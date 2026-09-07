import { describe, it, expect, vi, afterEach } from "vitest";
import { Tournament } from "../Tournament";
import { Player } from "../Player";
import { Round } from "../Round";
import { Match } from "../Match";
import { TournamentRuleset } from "../../value-objects/TournamentRuleset";

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

describe("Tournament.create", () => {
  it("creates a tournament in the registration phase with no players or rounds", () => {
    const tournament = createTournament();

    expect(tournament.getId()).toBe("t1");
    expect(tournament.getOwnerId()).toBe("u1");
    expect(tournament.getName()).toBe("Regional YCS");
    expect(tournament.getPhase()).toBe("registration");
    expect(tournament.getPlayers()).toHaveLength(0);
    expect(tournament.getRounds()).toHaveLength(0);
    expect(tournament.getCurrentRound()).toBeNull();
  });

  it("defaults to the current ruleset (no draws) when none is given", () => {
    const tournament = createTournament();
    expect(tournament.getRuleset().allowsDraws()).toBe(false);
  });

  it("accepts an explicit legacy ruleset", () => {
    const tournament = createTournament({
      ruleset: TournamentRuleset.legacy(),
    });
    expect(tournament.getRuleset().allowsDraws()).toBe(true);
  });

  it("defaults topCutSize to null when not provided", () => {
    const tournament = createTournament();
    expect(tournament.getTopCutSize()).toBeNull();
  });

  it("throws if the name is empty", () => {
    expect(() => createTournament({ name: "  " })).toThrow(
      "Tournament name cannot be empty",
    );
  });

  it("throws if totalSwissRounds is 0 or negative", () => {
    expect(() => createTournament({ totalSwissRounds: 0 })).toThrow(
      "at least 1 swiss round",
    );
    expect(() => createTournament({ totalSwissRounds: -1 })).toThrow(
      "at least 1 swiss round",
    );
  });

  it("throws if topCutSize is not one of the allowed values", () => {
    // @ts-expect-error testing an invalid runtime value on purpose
    expect(() => createTournament({ topCutSize: 6 })).toThrow(
      "Top cut size must be 4, 8, 16, 32, or null",
    );
  });

  it("accepts valid top cut sizes", () => {
    expect(createTournament({ topCutSize: 8 }).getTopCutSize()).toBe(8);
  });

  it("defaults pairingMode to automatic when not provided", () => {
    const tournament = createTournament();
    expect(tournament.getPairingMode()).toBe("automatic");
  });

  it("accepts an explicit manual pairingMode (audit mode)", () => {
    const tournament = createTournament({ pairingMode: "manual" });
    expect(tournament.getPairingMode()).toBe("manual");
  });

  it("exposes pairingMode through toProps", () => {
    const tournament = createTournament({ pairingMode: "manual" });
    expect(tournament.toProps().pairingMode).toBe("manual");
  });
});

describe("Tournament player registration", () => {
  it("registers players during the registration phase", () => {
    const tournament = createTournament();
    const player = Player.create("p1", "Ash");

    tournament.registerPlayer(player);

    expect(tournament.getPlayers()).toHaveLength(1);
    expect(tournament.getPlayer("p1")).toBe(player);
  });

  it("throws when registering a duplicate player id", () => {
    const tournament = createTournament();
    tournament.registerPlayer(Player.create("p1", "Ash"));

    expect(() =>
      tournament.registerPlayer(Player.create("p1", "Ash 2")),
    ).toThrow("already registered");
  });

  it("throws when registering a player outside the registration phase", () => {
    const tournament = createTournament();
    registerPlayers(tournament, 2);
    tournament.startSwissRounds();

    expect(() =>
      tournament.registerPlayer(Player.create("p3", "Misty")),
    ).toThrow(
      "only be registered while the tournament is in the registration phase",
    );
  });

  it("unregisters a player during registration", () => {
    const tournament = createTournament();
    tournament.registerPlayer(Player.create("p1", "Ash"));

    tournament.unregisterPlayer("p1");

    expect(tournament.getPlayers()).toHaveLength(0);
  });

  it("throws when unregistering a player that does not exist", () => {
    const tournament = createTournament();
    expect(() => tournament.unregisterPlayer("p999")).toThrow(
      "not found in tournament",
    );
  });

  it("throws when getPlayer is called with an unknown id", () => {
    const tournament = createTournament();
    expect(() => tournament.getPlayer("p999")).toThrow(
      "not found in tournament",
    );
  });

  it("getActivePlayers excludes dropped players", () => {
    const tournament = createTournament();
    registerPlayers(tournament, 2);
    tournament.dropPlayer("p1");

    expect(tournament.getActivePlayers().map((p) => p.getId())).toEqual(["p2"]);
  });
});

describe("Tournament.randomizePlayerOrder", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reorders the players according to the random draw, keeping the same set", () => {
    const tournament = createTournament();
    registerPlayers(tournament, 4);
    vi.spyOn(Math, "random").mockReturnValue(0);

    tournament.randomizePlayerOrder();

    expect(tournament.getPlayers().map((p) => p.getId())).toEqual([
      "p2",
      "p3",
      "p4",
      "p1",
    ]);
  });

  it("throws once a round already exists", () => {
    const tournament = createTournament();
    registerPlayers(tournament, 2);
    tournament.startSwissRounds();
    tournament.addRound(
      Round.create(1, [Match.createPairing("m1", 1, 1, "p1", "p2")]),
    );

    expect(() => tournament.randomizePlayerOrder()).toThrow(
      "before the first round is generated",
    );
  });
});

describe("Tournament.reorderPlayers", () => {
  it("reorders the players to the given seed", () => {
    const tournament = createTournament();
    registerPlayers(tournament, 4);

    tournament.reorderPlayers(["p3", "p1", "p4", "p2"]);

    expect(tournament.getPlayers().map((p) => p.getId())).toEqual([
      "p3",
      "p1",
      "p4",
      "p2",
    ]);
  });

  it("throws if the seed does not contain exactly the same players", () => {
    const tournament = createTournament();
    registerPlayers(tournament, 3);

    expect(() => tournament.reorderPlayers(["p1", "p2"])).toThrow(
      "must contain exactly the same players",
    );
  });

  it("throws if the seed is missing a player", () => {
    const tournament = createTournament();
    registerPlayers(tournament, 3);

    expect(() => tournament.reorderPlayers(["p1", "p2", "p999"])).toThrow(
      "Seed order is missing these players: p3",
    );
  });

  it("throws if the seed contains a duplicate player", () => {
    const tournament = createTournament();
    registerPlayers(tournament, 3);

    expect(() => tournament.reorderPlayers(["p1", "p1", "p2"])).toThrow(
      "Seed order contains duplicate player p1",
    );
  });

  it("throws once a round already exists", () => {
    const tournament = createTournament();
    registerPlayers(tournament, 2);
    tournament.startSwissRounds();
    tournament.addRound(
      Round.create(1, [Match.createPairing("m1", 1, 1, "p1", "p2")]),
    );

    expect(() => tournament.reorderPlayers(["p2", "p1"])).toThrow(
      "before the first round is generated",
    );
  });
});

describe("Tournament.startSwissRounds", () => {
  it("transitions to the swiss phase with at least 2 players", () => {
    const tournament = createTournament();
    registerPlayers(tournament, 2);

    tournament.startSwissRounds();

    expect(tournament.getPhase()).toBe("swiss");
  });

  it("throws with fewer than 2 players", () => {
    const tournament = createTournament();
    registerPlayers(tournament, 1);

    expect(() => tournament.startSwissRounds()).toThrow(
      "At least 2 players are required",
    );
  });

  it("throws if called outside the registration phase", () => {
    const tournament = createTournament();
    registerPlayers(tournament, 2);
    tournament.startSwissRounds();

    expect(() => tournament.startSwissRounds()).toThrow(
      "already left the registration phase",
    );
  });
});

describe("Tournament.addRound", () => {
  function tournamentReadyForRounds(totalSwissRounds = 3) {
    const tournament = createTournament({ totalSwissRounds });
    registerPlayers(tournament, 4);
    tournament.startSwissRounds();
    return tournament;
  }

  it("adds round 1 successfully", () => {
    const tournament = tournamentReadyForRounds();
    const round1 = Round.create(1, [
      Match.createPairing("m1", 1, 1, "p1", "p2"),
    ]);

    tournament.addRound(round1);

    expect(tournament.getRounds()).toHaveLength(1);
    expect(tournament.getCurrentRound()).toBe(round1);
  });

  it("throws if called outside the swiss phase", () => {
    const tournament = createTournament();
    registerPlayers(tournament, 2);
    const round1 = Round.create(1, [
      Match.createPairing("m1", 1, 1, "p1", "p2"),
    ]);

    expect(() => tournament.addRound(round1)).toThrow(
      "only be added during the swiss phase",
    );
  });

  it("throws if the round number is not sequential", () => {
    const tournament = tournamentReadyForRounds();
    const round2 = Round.create(2, [
      Match.createPairing("m1", 2, 1, "p1", "p2"),
    ]);

    expect(() => tournament.addRound(round2)).toThrow(
      "Expected round number 1, got 2",
    );
  });

  it("throws if adding a round beyond totalSwissRounds", () => {
    const tournament = tournamentReadyForRounds(1);
    const m1 = Match.createPairing("m1", 1, 1, "p1", "p2");
    m1.reportWin("p1", 2, 0);
    const round1 = Round.create(1, [m1]);
    tournament.addRound(round1);
    tournament.completeRound(1);

    const round2 = Round.create(2, [
      Match.createPairing("m2", 2, 1, "p1", "p2"),
    ]);
    expect(() => tournament.addRound(round2)).toThrow(
      "only has 1 swiss rounds",
    );
  });

  it("throws if the previous round has not been completed yet", () => {
    const tournament = tournamentReadyForRounds();
    const round1 = Round.create(1, [
      Match.createPairing("m1", 1, 1, "p1", "p2"),
    ]);
    tournament.addRound(round1);

    const round2 = Round.create(2, [
      Match.createPairing("m2", 2, 1, "p1", "p2"),
    ]);
    expect(() => tournament.addRound(round2)).toThrow(
      "must be completed before adding a new round",
    );
  });

  it("allows adding round 2 once round 1 is completed", () => {
    const tournament = tournamentReadyForRounds();
    const m1 = Match.createPairing("m1", 1, 1, "p1", "p2");
    m1.reportWin("p1", 2, 0);
    tournament.addRound(Round.create(1, [m1]));
    tournament.completeRound(1);

    const round2 = Round.create(2, [
      Match.createPairing("m2", 2, 1, "p1", "p2"),
    ]);
    expect(() => tournament.addRound(round2)).not.toThrow();
  });
});

describe("Tournament.completeRound / revertRoundCompletion", () => {
  function tournamentWithOneRound() {
    const tournament = createTournament({ totalSwissRounds: 2 });
    registerPlayers(tournament, 2);
    tournament.startSwissRounds();
    const match = Match.createPairing("m1", 1, 1, "p1", "p2");
    match.reportWin("p1", 2, 0);
    tournament.addRound(Round.create(1, [match]));
    return tournament;
  }

  it("completes a round with all matches resolved", () => {
    const tournament = tournamentWithOneRound();

    tournament.completeRound(1);

    expect(tournament.getRound(1).isCompleted()).toBe(true);
  });

  it("reverts the completion of the most recent round", () => {
    const tournament = tournamentWithOneRound();
    tournament.completeRound(1);

    tournament.revertRoundCompletion(1);

    expect(tournament.getRound(1).isCompleted()).toBe(false);
  });

  it("throws when trying to revert a round that is not the most recent one", () => {
    const tournament = tournamentWithOneRound();
    tournament.completeRound(1);
    const m2 = Match.createPairing("m2", 2, 1, "p1", "p2");
    m2.reportWin("p2", 2, 0);
    tournament.addRound(Round.create(2, [m2]));
    tournament.completeRound(2);

    expect(() => tournament.revertRoundCompletion(1)).toThrow(
      "Only the most recently played round can be reverted",
    );
  });

  it("throws when the tournament is already completed", () => {
    const tournament = createTournament({ totalSwissRounds: 1 });
    registerPlayers(tournament, 2);
    tournament.startSwissRounds();
    const match = Match.createPairing("m1", 1, 1, "p1", "p2");
    match.reportWin("p1", 2, 0);
    tournament.addRound(Round.create(1, [match]));
    tournament.completeRound(1);
    tournament.complete();

    expect(() => tournament.revertRoundCompletion(1)).toThrow(
      "tournament is completed",
    );
  });

  it("throws when getRound is called with an unknown round number", () => {
    const tournament = tournamentWithOneRound();
    expect(() => tournament.getRound(99)).toThrow("Round 99 not found");
  });
});

describe("Tournament.revertRoundsForEdit", () => {
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
      .recordMatchLoss(
        winnerId,
        match.getRoundNumber(),
        loserGames,
        totalGames,
      );
  }

  function tournamentWithThreeRounds() {
    const tournament = createTournament({ totalSwissRounds: 3 });
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

  it("removes every later round, reverts their results and stats, and reopens the target round", () => {
    const tournament = tournamentWithThreeRounds();

    tournament.revertRoundsForEdit(2);

    expect(tournament.getRounds().map((r) => r.getRoundNumber())).toEqual([
      1, 2,
    ]);
    expect(tournament.getRound(2).isCompleted()).toBe(false);
    // Stats restored to the state right after round 2 was completed.
    expect(tournament.getPlayer("p1").getPoints()).toBe(6); // 3 + 3
    expect(tournament.getPlayer("p2").getPoints()).toBe(3); // 0 + 3
    expect(tournament.getPlayer("p3").getPoints()).toBe(3); // 3 + 0
    expect(tournament.getPlayer("p4").getPoints()).toBe(0);
  });

  it("reverts the individual matches of the removed rounds back to pending", () => {
    const tournament = tournamentWithThreeRounds();
    const round3Matches = tournament.getRound(3).getMatches();

    tournament.revertRoundsForEdit(2);

    expect(round3Matches.every((m) => m.isPending())).toBe(true);
  });

  it("removes a later round that still has pending matches", () => {
    const tournament = createTournament({ totalSwissRounds: 3 });
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

    // Round 3 generated but no results reported yet.
    tournament.addRound(
      Round.create(3, [
        Match.createPairing("m5", 3, 1, "p1", "p4"),
        Match.createPairing("m6", 3, 2, "p2", "p3"),
      ]),
    );

    tournament.revertRoundsForEdit(2);

    expect(tournament.getRounds().map((r) => r.getRoundNumber())).toEqual([
      1, 2,
    ]);
    expect(tournament.getRound(2).isCompleted()).toBe(false);
  });

  it("records a bye's points and game record when the round is added", () => {
    const tournament = createTournament({ totalSwissRounds: 2 });
    registerPlayers(tournament, 3); // odd count -> one bye per round
    tournament.startSwissRounds();

    const m1 = Match.createPairing("m1", 1, 1, "p1", "p2");
    reportWinAndRecordStats(tournament, m1, "p1");
    const bye = Match.createBye("m2", 1, 2, "p3");
    tournament.addRound(Round.create(1, [m1, bye]));

    // The bye is granted as soon as the round exists: 3 points + a 2-0
    // game record, exactly like the pairing services' tests expect.
    expect(tournament.getPlayer("p3").getPoints()).toBe(3);
    expect(tournament.getPlayer("p3").hasHadBye()).toBe(true);
  });

  it("throws when a round gives a second bye to a player", () => {
    const tournament = createTournament({ totalSwissRounds: 2 });
    registerPlayers(tournament, 3);
    tournament.startSwissRounds();

    const bye1 = Match.createBye("m1", 1, 1, "p3");
    tournament.addRound(Round.create(1, [bye1]));
    tournament.completeRound(1);

    const bye2 = Match.createBye("m2", 2, 1, "p3");
    expect(() => tournament.addRound(Round.create(2, [bye2]))).toThrow(
      "p3 has already received a bye",
    );
  });

  it("reverts a bye granted in a removed round but keeps byes from kept rounds", () => {
    const tournament = createTournament({ totalSwissRounds: 2 });
    registerPlayers(tournament, 3); // odd count -> one bye per round
    tournament.startSwissRounds();

    const m1 = Match.createPairing("m1", 1, 1, "p1", "p2");
    reportWinAndRecordStats(tournament, m1, "p1");
    const bye1 = Match.createBye("m2", 1, 2, "p3");
    tournament.addRound(Round.create(1, [m1, bye1]));
    tournament.completeRound(1);

    const m3 = Match.createPairing("m3", 2, 1, "p1", "p3");
    reportWinAndRecordStats(tournament, m3, "p1", 2, 1);
    const bye2 = Match.createBye("m4", 2, 2, "p2");
    tournament.addRound(Round.create(2, [m3, bye2]));

    tournament.revertRoundsForEdit(1);

    expect(tournament.getRounds().map((r) => r.getRoundNumber())).toEqual([1]);
    expect(tournament.getRound(1).isCompleted()).toBe(false);
    // p2's bye was in the removed round 2: fully undone.
    expect(tournament.getPlayer("p2").getPoints()).toBe(0);
    expect(tournament.getPlayer("p2").hasHadBye()).toBe(false);
    // p3's bye was in the kept round 1: untouched.
    expect(tournament.getPlayer("p3").getPoints()).toBe(3);
    expect(tournament.getPlayer("p3").hasHadBye()).toBe(true);
    // p1 keeps the round 1 win; the round 2 win is reverted.
    expect(tournament.getPlayer("p1").getPoints()).toBe(3);
  });

  it("throws when the target round is not completed", () => {
    const tournament = createTournament({ totalSwissRounds: 2 });
    registerPlayers(tournament, 2);
    tournament.startSwissRounds();
    const m1 = Match.createPairing("m1", 1, 1, "p1", "p2");
    m1.reportWin("p1", 2, 0);
    tournament.addRound(Round.create(1, [m1]));

    expect(() => tournament.revertRoundsForEdit(1)).toThrow(
      "must be completed before it can be reverted for editing",
    );
  });

  it("throws when the target round is the most recently played one", () => {
    const tournament = tournamentWithThreeRounds();
    tournament.completeRound(3);

    expect(() => tournament.revertRoundsForEdit(3)).toThrow(
      "is the last round; use revertRoundCompletion instead",
    );
  });

  it("throws outside the swiss phase", () => {
    const tournament = createTournament();
    registerPlayers(tournament, 2);

    expect(() => tournament.revertRoundsForEdit(1)).toThrow(
      "Rounds can only be reverted for editing during the swiss phase",
    );
  });

  it("throws when the round does not exist", () => {
    const tournament = tournamentWithThreeRounds();

    expect(() => tournament.revertRoundsForEdit(99)).toThrow(
      "Round 99 not found",
    );
  });
});

describe("Tournament.isSwissStageComplete", () => {
  it("is false until all rounds are added and completed", () => {
    const tournament = createTournament({ totalSwissRounds: 2 });
    registerPlayers(tournament, 2);
    tournament.startSwissRounds();

    expect(tournament.isSwissStageComplete()).toBe(false);

    const m1 = Match.createPairing("m1", 1, 1, "p1", "p2");
    m1.reportWin("p1", 2, 0);
    tournament.addRound(Round.create(1, [m1]));
    tournament.completeRound(1);

    expect(tournament.isSwissStageComplete()).toBe(false); // round 2 still missing
  });

  it("is true once every swiss round is completed", () => {
    const tournament = createTournament({ totalSwissRounds: 1 });
    registerPlayers(tournament, 2);
    tournament.startSwissRounds();

    const m1 = Match.createPairing("m1", 1, 1, "p1", "p2");
    m1.reportWin("p1", 2, 0);
    tournament.addRound(Round.create(1, [m1]));
    tournament.completeRound(1);

    expect(tournament.isSwissStageComplete()).toBe(true);
  });
});

describe("Tournament.advanceToTopCut", () => {
  function tournamentReadyForTopCut(topCutSize: 4 | 8 = 4) {
    const tournament = createTournament({ totalSwissRounds: 1, topCutSize });
    const players = registerPlayers(tournament, 4);
    tournament.startSwissRounds();

    const m1 = Match.createPairing(
      "m1",
      1,
      1,
      players[0].getId(),
      players[1].getId(),
    );
    m1.reportWin(players[0].getId(), 2, 0);
    const m2 = Match.createPairing(
      "m2",
      1,
      2,
      players[2].getId(),
      players[3].getId(),
    );
    m2.reportWin(players[2].getId(), 2, 0);
    tournament.addRound(Round.create(1, [m1, m2]));
    tournament.completeRound(1);

    return tournament;
  }

  it("advances to the top_cut phase once swiss is complete and enough players remain", () => {
    const tournament = tournamentReadyForTopCut(4);

    tournament.advanceToTopCut();

    expect(tournament.getPhase()).toBe("top_cut");
  });

  it("throws if swiss rounds are not finished", () => {
    const tournament = createTournament({ totalSwissRounds: 2, topCutSize: 4 });
    registerPlayers(tournament, 4);
    tournament.startSwissRounds();

    expect(() => tournament.advanceToTopCut()).toThrow(
      "All swiss rounds must be completed",
    );
  });

  it("throws if no topCutSize was configured", () => {
    const tournament = createTournament({ totalSwissRounds: 1 });
    registerPlayers(tournament, 2);
    tournament.startSwissRounds();
    const m1 = Match.createPairing("m1", 1, 1, "p1", "p2");
    m1.reportWin("p1", 2, 0);
    tournament.addRound(Round.create(1, [m1]));
    tournament.completeRound(1);

    expect(() => tournament.advanceToTopCut()).toThrow(
      "was not configured with a top cut",
    );
  });

  it("throws if not enough active players remain for the configured top cut size", () => {
    const tournament = tournamentReadyForTopCut(8); // only 4 players registered, need 8

    expect(() => tournament.advanceToTopCut()).toThrow(
      "Not enough active players",
    );
  });

  it("throws if called outside the swiss phase", () => {
    const tournament = tournamentReadyForTopCut(4);
    tournament.advanceToTopCut();

    expect(() => tournament.advanceToTopCut()).toThrow(
      "must be in the swiss phase to advance to top cut",
    );
  });
});

describe("Tournament.complete", () => {
  it("completes a tournament with no top cut directly from the swiss phase", () => {
    const tournament = createTournament({ totalSwissRounds: 1 });
    registerPlayers(tournament, 2);
    tournament.startSwissRounds();
    const m1 = Match.createPairing("m1", 1, 1, "p1", "p2");
    m1.reportWin("p1", 2, 0);
    tournament.addRound(Round.create(1, [m1]));
    tournament.completeRound(1);

    tournament.complete();

    expect(tournament.getPhase()).toBe("completed");
  });

  it("throws if a top cut is configured but the tournament tries to finish from swiss", () => {
    const tournament = createTournament({ totalSwissRounds: 1, topCutSize: 4 });
    registerPlayers(tournament, 4);
    tournament.startSwissRounds();

    expect(() => tournament.complete()).toThrow("has a top cut configured");
  });

  it("throws if swiss rounds are not finished and there's no top cut", () => {
    const tournament = createTournament({ totalSwissRounds: 2 });
    registerPlayers(tournament, 2);
    tournament.startSwissRounds();

    expect(() => tournament.complete()).toThrow(
      "All swiss rounds must be completed",
    );
  });

  it("throws if called during registration", () => {
    const tournament = createTournament();
    expect(() => tournament.complete()).toThrow(
      "must be in swiss or top_cut phase",
    );
  });
});

describe("Tournament.revertCompletion", () => {
  it("reverts back to swiss when the tournament had no top cut configured", () => {
    const tournament = createTournament({ totalSwissRounds: 1 });
    registerPlayers(tournament, 2);
    tournament.startSwissRounds();
    const m1 = Match.createPairing("m1", 1, 1, "p1", "p2");
    m1.reportWin("p1", 2, 0);
    tournament.addRound(Round.create(1, [m1]));
    tournament.completeRound(1);
    tournament.complete();

    tournament.revertCompletion();

    expect(tournament.getPhase()).toBe("swiss");
  });

  it("reverts back to top_cut when the tournament had a top cut configured", () => {
    const tournament = createTournament({ totalSwissRounds: 1, topCutSize: 4 });
    const players = registerPlayers(tournament, 4);
    tournament.startSwissRounds();
    const m1 = Match.createPairing(
      "m1",
      1,
      1,
      players[0].getId(),
      players[1].getId(),
    );
    m1.reportWin(players[0].getId(), 2, 0);
    const m2 = Match.createPairing(
      "m2",
      1,
      2,
      players[2].getId(),
      players[3].getId(),
    );
    m2.reportWin(players[2].getId(), 2, 0);
    tournament.addRound(Round.create(1, [m1, m2]));
    tournament.completeRound(1);
    tournament.advanceToTopCut();
    tournament.complete();

    tournament.revertCompletion();

    expect(tournament.getPhase()).toBe("top_cut");
  });

  it("throws if the tournament is not completed", () => {
    const tournament = createTournament({ totalSwissRounds: 1 });
    registerPlayers(tournament, 2);
    tournament.startSwissRounds();

    expect(() => tournament.revertCompletion()).toThrow(
      "is not completed, nothing to revert",
    );
  });
});

describe("Tournament.toProps / fromProps round-trip", () => {
  it("reconstructs an identical tournament from its props", () => {
    const original = createTournament({ totalSwissRounds: 1 });
    registerPlayers(original, 2);
    original.startSwissRounds();

    const rebuilt = Tournament.fromProps(original.toProps());

    expect(rebuilt.getId()).toBe(original.getId());
    expect(rebuilt.getPhase()).toBe(original.getPhase());
    expect(rebuilt.getPlayers()).toHaveLength(original.getPlayers().length);
  });
});
