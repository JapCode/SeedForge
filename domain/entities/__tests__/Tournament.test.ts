import { describe, it, expect } from "vitest";
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

  it("throws when getRound is called with an unknown round number", () => {
    const tournament = tournamentWithOneRound();
    expect(() => tournament.getRound(99)).toThrow("Round 99 not found");
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
