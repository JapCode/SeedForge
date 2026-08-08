import { describe, it, expect } from "vitest";
import { TournamentMapper } from "../TournamentMapper";
import { Tournament } from "../../../../domain/entities/Tournament";
import { Player } from "../../../../domain/entities/Player";
import { Match } from "../../../../domain/entities/Match";
import { Round } from "../../../../domain/entities/Round";
import { TournamentRuleset } from "../../../../domain/value-objects/TournamentRuleset";

describe("TournamentMapper", () => {
  it("round-trips a freshly created tournament with no players or rounds", () => {
    const tournament = Tournament.create({
      id: "t1",
      ownerId: "u1",
      name: "Cup",
      totalSwissRounds: 3,
    });

    const serialized = TournamentMapper.toSerializable(tournament);
    const rebuilt = TournamentMapper.toDomain(serialized);

    expect(rebuilt.getId()).toBe("t1");
    expect(rebuilt.getOwnerId()).toBe("u1");
    expect(rebuilt.getName()).toBe("Cup");
    expect(rebuilt.getPhase()).toBe("registration");
    expect(rebuilt.getPlayers()).toHaveLength(0);
    expect(rebuilt.getRounds()).toHaveLength(0);
  });

  it("produces output that survives an actual JSON.stringify/parse cycle (simulating jsonb storage)", () => {
    const tournament = Tournament.create({
      id: "t1",
      ownerId: "u1",
      name: "Cup",
      totalSwissRounds: 1,
    });
    tournament.registerPlayer(Player.create("p1", "Ash"));
    tournament.registerPlayer(Player.create("p2", "Misty"));
    tournament.startSwissRounds();
    const match = Match.createPairing("m1", 1, 1, "p1", "p2");
    match.reportWin("p1", 2, 0);
    tournament.getPlayer("p1").recordMatchWin("p2", 2, 2);
    tournament.getPlayer("p2").recordMatchLoss("p1", 0, 2);
    tournament.addRound(Round.create(1, [match]));
    tournament.completeRound(1);

    const serialized = TournamentMapper.toSerializable(tournament);
    const roundTripped = JSON.parse(JSON.stringify(serialized));
    const rebuilt = TournamentMapper.toDomain(roundTripped);

    expect(rebuilt.getPlayers()).toHaveLength(2);
    expect(rebuilt.getPlayer("p1").getPoints()).toBe(3);
    expect(rebuilt.getRound(1).isCompleted()).toBe(true);
    expect(rebuilt.getRound(1).getMatch("m1").getResult()).toEqual({
      type: "win",
      winnerId: "p1",
      winnerGames: 2,
      loserGames: 0,
    });
  });

  it("preserves the ruleset", () => {
    const tournament = Tournament.create({
      id: "t1",
      ownerId: "u1",
      name: "Cup",
      totalSwissRounds: 1,
      ruleset: TournamentRuleset.legacy(),
    });

    const rebuilt = TournamentMapper.toDomain(
      TournamentMapper.toSerializable(tournament),
    );

    expect(rebuilt.getRuleset().allowsDraws()).toBe(true);
    expect(rebuilt.getRuleset().getMatchTimeMinutes()).toBe(40);
  });

  it("preserves the shareToken", () => {
    const tournament = Tournament.create({
      id: "t1",
      ownerId: "u1",
      name: "Cup",
      totalSwissRounds: 1,
    });
    tournament.setShareToken("share-abc");

    const rebuilt = TournamentMapper.toDomain(
      TournamentMapper.toSerializable(tournament),
    );

    expect(rebuilt.getShareToken()).toBe("share-abc");
  });

  it("preserves a dropped player's state and topCutSeed", () => {
    const tournament = Tournament.create({
      id: "t1",
      ownerId: "u1",
      name: "Cup",
      totalSwissRounds: 1,
      topCutSize: 4,
    });
    tournament.registerPlayer(Player.create("p1", "Ash"));
    tournament.dropPlayer("p1");
    tournament.getPlayer("p1").assignTopCutSeed(2);

    const rebuilt = TournamentMapper.toDomain(
      TournamentMapper.toSerializable(tournament),
    );

    expect(rebuilt.getPlayer("p1").isDropped()).toBe(true);
    expect(rebuilt.getPlayer("p1").getTopCutSeed()).toBe(2);
  });

  it("preserves multiple rounds with mixed match result types", () => {
    const tournament = Tournament.create({
      id: "t1",
      ownerId: "u1",
      name: "Cup",
      totalSwissRounds: 2,
    });
    tournament.registerPlayer(Player.create("p1", "Ash"));
    tournament.registerPlayer(Player.create("p2", "Misty"));
    tournament.registerPlayer(Player.create("p3", "Brock"));
    tournament.startSwissRounds();

    const m1 = Match.createPairing("m1", 1, 1, "p1", "p2");
    m1.reportDoubleLoss(1, 1);
    const bye = Match.createBye("m2", 1, 2, "p3");
    tournament.addRound(Round.create(1, [m1, bye]));
    tournament.completeRound(1);

    const serialized = TournamentMapper.toSerializable(tournament);
    const rebuilt = TournamentMapper.toDomain(serialized);

    expect(rebuilt.getRound(1).getMatch("m1").getResult()).toEqual({
      type: "double_loss",
      player1Games: 1,
      player2Games: 1,
    });
    expect(rebuilt.getRound(1).getMatch("m2").isBye()).toBe(true);
  });
});
