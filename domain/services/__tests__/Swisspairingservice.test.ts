import { describe, it, expect } from "vitest";
import { SwissPairingService, ManualPairing } from "../SwissPairingService";
import { Player } from "../../entities/Player";
import { Tournament } from "../../entities/Tournament";
import { Match } from "../../entities/Match";
import { Round } from "../../entities/Round";

function players(...ids: string[]): Player[] {
  return ids.map((id) => Player.create(id, `Player ${id}`));
}

function pairedPlayerIds(round: Round): Set<string> {
  const ids = new Set<string>();
  for (const match of round.getMatches()) {
    ids.add(match.getPlayer1Id());
    if (match.getPlayer2Id()) ids.add(match.getPlayer2Id()!);
  }
  return ids;
}

function hasPairing(round: Round, idA: string, idB: string): boolean {
  return round
    .getMatches()
    .some(
      (m) =>
        !m.isBye() &&
        ((m.getPlayer1Id() === idA && m.getPlayer2Id() === idB) ||
          (m.getPlayer1Id() === idB && m.getPlayer2Id() === idA)),
    );
}

function byeRecipient(round: Round): string | null {
  const bye = round.getMatches().find((m) => m.isBye());
  return bye ? bye.getPlayer1Id() : null;
}

describe("SwissPairingService.buildManualRound", () => {
  it("builds a round from fully manual pairings", () => {
    const active = players("p1", "p2", "p3", "p4");
    const pairings: ManualPairing[] = [
      { player1Id: "p1", player2Id: "p2" },
      { player1Id: "p3", player2Id: "p4" },
    ];

    const round = SwissPairingService.buildManualRound(1, active, pairings);

    expect(round.getRoundNumber()).toBe(1);
    expect(round.getMatches()).toHaveLength(2);
    expect(round.getMatches()[0].getPlayer1Id()).toBe("p1");
    expect(round.getMatches()[0].getPlayer2Id()).toBe("p2");
    expect(round.getMatches()[1].getPlayer1Id()).toBe("p3");
    expect(round.getMatches()[1].getPlayer2Id()).toBe("p4");
  });

  it("assigns sequential table numbers in the order pairings were given", () => {
    const active = players("p1", "p2", "p3", "p4");
    const pairings: ManualPairing[] = [
      { player1Id: "p3", player2Id: "p4" },
      { player1Id: "p1", player2Id: "p2" },
    ];

    const round = SwissPairingService.buildManualRound(1, active, pairings);

    expect(round.getMatches()[0].getTableNumber()).toBe(1);
    expect(round.getMatches()[0].getPlayer1Id()).toBe("p3");
    expect(round.getMatches()[1].getTableNumber()).toBe(2);
  });

  it("supports a manual bye (player2Id === null)", () => {
    const active = players("p1", "p2", "p3");
    const pairings: ManualPairing[] = [
      { player1Id: "p1", player2Id: "p2" },
      { player1Id: "p3", player2Id: null },
    ];

    const round = SwissPairingService.buildManualRound(1, active, pairings);

    const byeMatch = round.getMatches()[1];
    expect(byeMatch.isBye()).toBe(true);
    expect(byeMatch.getPlayer1Id()).toBe("p3");
  });

  it("works for a round other than round 1 (e.g. reproducing round 3 for an audit)", () => {
    const active = players("p1", "p2");
    const round = SwissPairingService.buildManualRound(3, active, [
      { player1Id: "p1", player2Id: "p2" },
    ]);

    expect(round.getRoundNumber()).toBe(3);
    expect(round.getMatches()[0].getRoundNumber()).toBe(3);
  });

  it("throws if a player is paired against themselves", () => {
    const active = players("p1", "p2");

    expect(() =>
      SwissPairingService.buildManualRound(1, active, [
        { player1Id: "p1", player2Id: "p1" },
      ]),
    ).toThrow("cannot be paired against themselves");
  });

  it("throws if a pairing references a player who is not active in the tournament", () => {
    const active = players("p1", "p2");

    expect(() =>
      SwissPairingService.buildManualRound(1, active, [
        { player1Id: "p1", player2Id: "p999" },
      ]),
    ).toThrow("Player p999 is not an active player");
  });

  it("throws if a player appears more than once across the pairings", () => {
    const active = players("p1", "p2", "p3", "p4");
    const pairings: ManualPairing[] = [
      { player1Id: "p1", player2Id: "p2" },
      { player1Id: "p1", player2Id: "p3" }, // p1 reused
    ];

    expect(() =>
      SwissPairingService.buildManualRound(1, active, pairings),
    ).toThrow("Player p1 appears more than once");
  });

  it("throws if some active players are missing from the pairings entirely", () => {
    const active = players("p1", "p2", "p3", "p4");
    const pairings: ManualPairing[] = [{ player1Id: "p1", player2Id: "p2" }]; // p3, p4 missing

    expect(() =>
      SwissPairingService.buildManualRound(1, active, pairings),
    ).toThrow(/missing these active players: p3, p4/);
  });

  it("throws if no pairings are given at all", () => {
    const active = players("p1", "p2");

    expect(() => SwissPairingService.buildManualRound(1, active, [])).toThrow(
      "missing these active players: p1, p2",
    );
  });
});

describe("SwissPairingService.generateFirstRound", () => {
  it("pairs every player exactly once with a random pairing", () => {
    const active = players("p1", "p2", "p3", "p4", "p5", "p6");

    const round = SwissPairingService.generateFirstRound(active);

    expect(round.getRoundNumber()).toBe(1);
    expect(round.getMatches()).toHaveLength(3);
    expect(pairedPlayerIds(round)).toEqual(
      new Set(active.map((p) => p.getId())),
    );
  });

  it("gives the last-seeded player the bye when there's an odd number of players", () => {
    const active = players("p1", "p2", "p3");

    const round = SwissPairingService.generateFirstRound(active, {
      seedOrder: ["p1", "p2", "p3"],
    });

    expect(byeRecipient(round)).toBe("p3");
    expect(hasPairing(round, "p1", "p2")).toBe(true);
  });

  it("pairs top-half vs bottom-half in seed order when a seedOrder is given", () => {
    const active = players("p1", "p2", "p3", "p4");

    const round = SwissPairingService.generateFirstRound(active, {
      seedOrder: ["p3", "p1", "p4", "p2"],
    });

    expect(hasPairing(round, "p3", "p1")).toBe(true);
    expect(hasPairing(round, "p4", "p2")).toBe(true);
  });

  it("throws if the seed order is missing a player", () => {
    const active = players("p1", "p2", "p3");

    expect(() =>
      SwissPairingService.generateFirstRound(active, {
        seedOrder: ["p1", "p2"],
      }),
    ).toThrow("must contain exactly the same players");
  });

  it("throws if the seed order references an unknown player", () => {
    const active = players("p1", "p2");

    expect(() =>
      SwissPairingService.generateFirstRound(active, {
        seedOrder: ["p1", "p999"],
      }),
    ).toThrow("Seed order is missing these players: p2");
  });

  it("throws with fewer than 2 players", () => {
    const active = players("p1");
    expect(() => SwissPairingService.generateFirstRound(active)).toThrow(
      "At least 2 players are required",
    );
  });
});

describe("SwissPairingService.generateNextRound", () => {
  function tournamentWithPlacedholderRounds(
    activePlayers: Player[],
    completedRounds: number,
  ) {
    const tournament = Tournament.create({
      id: "t1",
      ownerId: "u1",
      name: "Test Cup",
      totalSwissRounds: 10,
    });
    activePlayers.forEach((p) => tournament.registerPlayer(p));
    tournament.startSwissRounds();

    // Placeholder rounds just to advance the round counter — generateNextRound
    // relies on Player's own recorded stats (mutated directly below in each
    // test), not on these matches, for its pairing decisions.
    for (let r = 1; r <= completedRounds; r++) {
      const [a, b] = activePlayers;
      const match = Match.createPairing(
        `filler-${r}`,
        r,
        1,
        a.getId(),
        b.getId(),
      );
      match.reportWin(a.getId(), 2, 0);
      tournament.addRound(Round.create(r, [match]));
      tournament.completeRound(r);
    }

    return tournament;
  }

  it("pairs players within the same score group, avoiding the round-1 rematch", () => {
    const [p1, p2, p3, p4] = players("p1", "p2", "p3", "p4");
    p1.recordMatchWin(p2.getId(), 2, 2);
    p2.recordMatchLoss(p1.getId(), 1, 0, 2);
    p3.recordMatchWin(p4.getId(), 2, 2);
    p4.recordMatchLoss(p3.getId(), 1, 0, 2);

    const tournament = tournamentWithPlacedholderRounds([p1, p2, p3, p4], 1);

    const round = SwissPairingService.generateNextRound(tournament);

    expect(round.getRoundNumber()).toBe(2);
    expect(hasPairing(round, "p1", "p3")).toBe(true); // both on 3 points
    expect(hasPairing(round, "p2", "p4")).toBe(true); // both on 0 points
    expect(byeRecipient(round)).toBeNull();
  });

  it("assigns the bye to the lowest-ranked player who hasn't had one yet", () => {
    const [p1, p2, p3, p4, p5] = players("p1", "p2", "p3", "p4", "p5");
    p1.recordMatchWin(p2.getId(), 2, 2);
    p2.recordMatchLoss(p1.getId(), 1, 0, 2);
    p3.recordMatchWin(p4.getId(), 2, 2);
    p4.recordMatchLoss(p3.getId(), 1, 0, 2);
    p5.recordBye();

    const tournament = tournamentWithPlacedholderRounds(
      [p1, p2, p3, p4, p5],
      1,
    );

    const round = SwissPairingService.generateNextRound(tournament);

    // p5 already had a bye, so among the remaining lowest score group (p2, p4)
    // the bye goes to p4 (both are fully tied on every tiebreaker, so the
    // stable sort keeps p2 ahead — p4 is the one picked from the bottom).
    expect(byeRecipient(round)).toBe("p4");
    expect(hasPairing(round, "p1", "p3")).toBe(true);
    expect(hasPairing(round, "p5", "p2")).toBe(true);
  });

  it("downfloats a lone top-group player through multiple score groups until they can be paired", () => {
    const [p1, p2, p3, p4] = players("p1", "p2", "p3", "p4");

    // Round 1: p1 beats p2, p3 beats p4
    p1.recordMatchWin(p2.getId(), 2, 2);
    p2.recordMatchLoss(p1.getId(), 1, 0, 2);
    p3.recordMatchWin(p4.getId(), 2, 2);
    p4.recordMatchLoss(p3.getId(), 1, 0, 2);

    // Round 2: p3 beats p1 (rematch), p2 beats p4
    p3.recordMatchWin(p1.getId(), 2, 2);
    p1.recordMatchLoss(p3.getId(), 2, 0, 2);
    p2.recordMatchWin(p4.getId(), 2, 2);
    p4.recordMatchLoss(p2.getId(), 2, 0, 2);

    // Standings entering round 3: p3=6, p1=3 (better OMW), p2=3, p4=0
    const tournament = tournamentWithPlacedholderRounds([p1, p2, p3, p4], 2);

    const round = SwissPairingService.generateNextRound(tournament);

    expect(round.getRoundNumber()).toBe(3);
    // p3 (alone at 6 pts) can't pair p1 (already played), so floats down and
    // pairs p2 instead; p1 then floats further down and pairs p4.
    expect(hasPairing(round, "p3", "p2")).toBe(true);
    expect(hasPairing(round, "p1", "p4")).toBe(true);
  });

  it("finds a valid pairing via backtracking even when the naive first-match choice would strand two players (regression test for a real bug report)", () => {
    const [a, b, c, d] = players("a", "b", "c", "d");

    // Already-played pairs: a-c, b-d, c-d. A greedy algorithm trying "a" first
    // would pick a-b immediately (the first non-repeat candidate), leaving
    // c-d as the only remaining pair — but c-d already played, so greedy
    // fails here even though a-d + b-c is a perfectly valid solution.
    a.recordMatchWin(c.getId(), 2, 2);
    c.recordMatchLoss(a.getId(), 1, 0, 2);
    b.recordMatchWin(d.getId(), 2, 2);
    d.recordMatchLoss(b.getId(), 1, 0, 2);
    c.recordMatchWin(d.getId(), 2, 2);
    d.recordMatchLoss(c.getId(), 1, 0, 2);
    d.recordBye(); // brings d's points up to 3, tying everyone in one score group

    const tournament = tournamentWithPlacedholderRounds([a, b, c, d], 1);

    const round = SwissPairingService.generateNextRound(tournament);

    expect(hasPairing(round, "a", "d")).toBe(true);
    expect(hasPairing(round, "b", "c")).toBe(true);
  });

  it("pairs the user's round-4 standings (1 at 9 pts, 6 at 3 pts, 1 at 0 pts) instead of throwing (regression: the per-score-group pipeline locked in a bad downfloat)", () => {
    const [pepe, l1, l2, l3, w2, w3, w1, donald] = players(
      "pepe",
      "l1",
      "l2",
      "l3",
      "w2",
      "w3",
      "w1",
      "donald",
    );

    // Standings entering round 4, mirroring a real bug report: pepe on 9
    // points, six players on 3, donald on 0. The three double-losses below
    // are what make the points add up (byes or draws would work just as
    // well) — what matters for pairing is only each player's points and who
    // they have already played.
    pepe.recordMatchWin(l1.getId(), 2, 2);
    pepe.recordMatchWin(l2.getId(), 2, 2);
    pepe.recordMatchWin(l3.getId(), 2, 2);

    donald.recordMatchLoss(w1.getId(), 1, 0, 2);
    donald.recordMatchLoss(w2.getId(), 2, 0, 2);
    donald.recordMatchLoss(w3.getId(), 3, 0, 2);
    w1.recordMatchWin(donald.getId(), 2, 2);
    w2.recordMatchWin(donald.getId(), 2, 2);
    w3.recordMatchWin(donald.getId(), 2, 2);

    // Each "l" player beat one "w" player...
    l1.recordMatchWin(w1.getId(), 2, 2);
    w1.recordMatchLoss(l1.getId(), 2, 0, 2);
    l2.recordMatchWin(w2.getId(), 2, 2);
    w2.recordMatchLoss(l2.getId(), 2, 0, 2);
    l3.recordMatchWin(w3.getId(), 2, 2);
    w3.recordMatchLoss(l3.getId(), 2, 0, 2);

    // ...and the remaining matches were double losses (both players lose).
    w1.recordMatchLoss(l2.getId(), 3, 0, 2);
    l2.recordMatchLoss(w1.getId(), 3, 0, 2);
    w2.recordMatchLoss(l3.getId(), 3, 0, 2);
    l3.recordMatchLoss(w2.getId(), 3, 0, 2);
    w3.recordMatchLoss(l1.getId(), 3, 0, 2);
    l1.recordMatchLoss(w3.getId(), 3, 0, 2);

    const tournament = tournamentWithPlacedholderRounds(
      [pepe, l1, l2, l3, w2, w3, w1, donald],
      3,
    );

    const round = SwissPairingService.generateNextRound(tournament);

    expect(round.getRoundNumber()).toBe(4);
    expect(byeRecipient(round)).toBeNull();
    expect(pairedPlayerIds(round)).toEqual(
      new Set([pepe, l1, l2, l3, w2, w3, w1, donald].map((p) => p.getId())),
    );

    // No one is paired with an opponent they have already played.
    const playerById = new Map(
      [pepe, l1, l2, l3, w2, w3, w1, donald].map((p) => [p.getId(), p]),
    );
    for (const match of round.getMatches()) {
      const player1 = playerById.get(match.getPlayer1Id())!;
      const player2 = playerById.get(match.getPlayer2Id()!)!;
      expect(player1.hasPlayedAgainst(player2.getId())).toBe(false);
    }

    // The pairing is deterministic across runs.
    const secondRun = SwissPairingService.generateNextRound(tournament);
    expect(
      round.getMatches().map((m) => [m.getPlayer1Id(), m.getPlayer2Id()]),
    ).toEqual(
      secondRun.getMatches().map((m) => [m.getPlayer1Id(), m.getPlayer2Id()]),
    );
  });

  it("throws a clear, actionable error when no valid pairing exists", () => {
    const [p1, p2] = players("p1", "p2");
    p1.recordMatchWin(p2.getId(), 2, 2);
    p2.recordMatchLoss(p1.getId(), 1, 0, 2);

    const tournament = tournamentWithPlacedholderRounds([p1, p2], 1);

    expect(() => SwissPairingService.generateNextRound(tournament)).toThrow(
      /Could not find a valid pairing.*buildManualRound/,
    );
  });

  it("excludes dropped players from pairing but keeps them available for tiebreaker lookups", () => {
    const [p1, p2, p3] = players("p1", "p2", "p3");
    p1.recordMatchWin(p3.getId(), 2, 2);
    p3.recordMatchLoss(p1.getId(), 1, 0, 2);
    p2.recordBye();

    const tournament = tournamentWithPlacedholderRounds([p1, p2, p3], 1);
    tournament.dropPlayer("p3");

    const round = SwissPairingService.generateNextRound(tournament);

    expect(pairedPlayerIds(round)).toEqual(new Set(["p1", "p2"]));
  });

  it("throws with fewer than 2 active players", () => {
    const p1 = Player.create("p1", "Solo");
    const p2 = Player.create("p2", "Temp");
    const tournament = Tournament.create({
      id: "t1",
      ownerId: "u1",
      name: "Test",
      totalSwissRounds: 3,
    });
    tournament.registerPlayer(p1);
    tournament.registerPlayer(p2);
    tournament.startSwissRounds();
    tournament.dropPlayer("p2");

    expect(() => SwissPairingService.generateNextRound(tournament)).toThrow(
      "At least 2 active players are required",
    );
  });
});
