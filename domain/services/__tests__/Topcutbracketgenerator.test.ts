import { describe, it, expect } from "vitest";
import { TopCutBracketGenerator } from "../TopCutBracketGenerator";
import { Tournament } from "../../entities/Tournament";
import { Player } from "../../entities/Player";

function tournamentReadyForTopCut(topCutSize: 4 | 8) {
  const tournament = Tournament.create({
    id: "t1",
    ownerId: "u1",
    name: "Test Cup",
    totalSwissRounds: 1,
    topCutSize,
  });
  const players = Array.from({ length: 4 }, (_, i) =>
    Player.create(`p${i + 1}`, `Player ${i + 1}`),
  );
  players.forEach((p) => tournament.registerPlayer(p));
  tournament.startSwissRounds();
  return { tournament, players };
}

describe("TopCutBracketGenerator.generate", () => {
  it("seeds qualifiers by swiss standings (points, then tiebreakers) and builds the bracket", () => {
    const { tournament, players } = tournamentReadyForTopCut(4);
    const [p1, p2, p3, p4] = players;

    // p3 ends up in first place (most points), p1 second, then p2, p4 tied
    // at 0 with no distinguishing tiebreakers (stable order keeps p2 ahead).
    p3.recordMatchWin(p4.getId(), 2, 2);
    p4.recordMatchLoss(p3.getId(), 1, 0, 2);
    p1.recordMatchWin(p2.getId(), 2, 2);
    p2.recordMatchLoss(p1.getId(), 1, 0, 2);
    p3.recordMatchWin(p1.getId(), 2, 2);
    p1.recordMatchLoss(p3.getId(), 2, 0, 2);

    const bracket = TopCutBracketGenerator.generate(tournament);

    expect(bracket.getSize()).toBe(4);
    expect(p3.getTopCutSeed()).toBe(1); // 6 points, top seed
    expect(p1.getTopCutSeed()).toBe(2); // 3 points
    // seed 1 vs seed 4, seed 2 vs seed 3 (standard size-4 seeding)
    const round1 = bracket.getRound(1);
    expect([round1[0].getPlayer1Id(), round1[0].getPlayer2Id()]).toContain(
      p3.getId(),
    );
    expect([round1[1].getPlayer1Id(), round1[1].getPlayer2Id()]).toContain(
      p1.getId(),
    );
  });

  it("only takes the top N players when there are more active players than the top cut size", () => {
    const tournament = Tournament.create({
      id: "t1",
      ownerId: "u1",
      name: "Big Cup",
      totalSwissRounds: 1,
      topCutSize: 4,
    });
    const players = Array.from({ length: 6 }, (_, i) =>
      Player.create(`p${i + 1}`, `Player ${i + 1}`),
    );
    players.forEach((p) => tournament.registerPlayer(p));
    tournament.startSwissRounds();

    const bracket = TopCutBracketGenerator.generate(tournament);

    expect(bracket.getSize()).toBe(4);
    // exactly 4 of the 6 players should have received a seed
    const seededCount = players.filter(
      (p) => p.getTopCutSeed() !== null,
    ).length;
    expect(seededCount).toBe(4);
  });

  it("throws if the tournament has no top cut configured", () => {
    const tournament = Tournament.create({
      id: "t1",
      ownerId: "u1",
      name: "No Cut",
      totalSwissRounds: 1,
    });
    tournament.registerPlayer(Player.create("p1", "Ash"));
    tournament.registerPlayer(Player.create("p2", "Misty"));
    tournament.startSwissRounds();

    expect(() => TopCutBracketGenerator.generate(tournament)).toThrow(
      "was not configured with a top cut",
    );
  });

  it("throws if there aren't enough active players to fill the configured top cut", () => {
    const { tournament } = tournamentReadyForTopCut(8);

    expect(() => TopCutBracketGenerator.generate(tournament)).toThrow(
      "Not enough active players",
    );
  });

  it("excludes dropped players from the seeding", () => {
    const { tournament, players } = tournamentReadyForTopCut(4);
    // drop one player, so only 3 remain — not enough for a top cut of 4
    tournament.dropPlayer(players[0].getId());

    expect(() => TopCutBracketGenerator.generate(tournament)).toThrow(
      "Not enough active players",
    );
  });
});
