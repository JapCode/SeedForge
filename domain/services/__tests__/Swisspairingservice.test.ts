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
    p2.recordMatchLoss(p1.getId(), 0, 2);
    p3.recordMatchWin(p4.getId(), 2, 2);
    p4.recordMatchLoss(p3.getId(), 0, 2);

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
    p2.recordMatchLoss(p1.getId(), 0, 2);
    p3.recordMatchWin(p4.getId(), 2, 2);
    p4.recordMatchLoss(p3.getId(), 0, 2);
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
    p2.recordMatchLoss(p1.getId(), 0, 2);
    p3.recordMatchWin(p4.getId(), 2, 2);
    p4.recordMatchLoss(p3.getId(), 0, 2);

    // Round 2: p3 beats p1 (rematch), p2 beats p4
    p3.recordMatchWin(p1.getId(), 2, 2);
    p1.recordMatchLoss(p3.getId(), 0, 2);
    p2.recordMatchWin(p4.getId(), 2, 2);
    p4.recordMatchLoss(p2.getId(), 0, 2);

    // Standings entering round 3: p3=6, p1=3 (better OMW), p2=3, p4=0
    const tournament = tournamentWithPlacedholderRounds([p1, p2, p3, p4], 2);

    const round = SwissPairingService.generateNextRound(tournament);

    expect(round.getRoundNumber()).toBe(3);
    // p3 (alone at 6 pts) can't pair p1 (already played), so floats down and
    // pairs p2 instead; p1 then floats further down and pairs p4.
    expect(hasPairing(round, "p3", "p2")).toBe(true);
    expect(hasPairing(round, "p1", "p4")).toBe(true);
  });

  it("throws a clear, actionable error when no valid pairing exists", () => {
    const [p1, p2] = players("p1", "p2");
    p1.recordMatchWin(p2.getId(), 2, 2);
    p2.recordMatchLoss(p1.getId(), 0, 2);

    const tournament = tournamentWithPlacedholderRounds([p1, p2], 1);

    expect(() => SwissPairingService.generateNextRound(tournament)).toThrow(
      /Could not find a valid pairing.*buildManualRound/,
    );
  });

  it("excludes dropped players from pairing but keeps them available for tiebreaker lookups", () => {
    const [p1, p2, p3] = players("p1", "p2", "p3");
    p1.recordMatchWin(p3.getId(), 2, 2);
    p3.recordMatchLoss(p1.getId(), 0, 2);
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
