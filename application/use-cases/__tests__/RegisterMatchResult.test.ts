import { describe, it, expect, beforeEach } from "vitest";
import { CreateTournament } from "../CreateTournament";
import { RegisterPlayer } from "../RegisterPlayer";
import { StartTournament } from "../StartTournament";
import { GenerateNextRound } from "../GenerateNextRound";
import { RegisterMatchResult } from "../RegisterMatchResult";
import { TournamentNotOwnedError } from "../shared/loadOwnedTournament";
import {
  InMemoryTournamentRepository,
  RecordingLogger,
  SequentialIdGenerator,
} from "./fakes";
import { Tournament } from "../../../domain/entities/Tournament";

async function setUpTournamentWithRound1(
  repository: InMemoryTournamentRepository,
  logger: RecordingLogger,
  idGenerator: SequentialIdGenerator,
  useLegacyRuleset = false,
): Promise<{ tournament: Tournament; player1Id: string; player2Id: string }> {
  const createTournament = new CreateTournament(
    repository,
    idGenerator,
    logger,
  );
  const registerPlayer = new RegisterPlayer(repository, idGenerator, logger);
  const startTournament = new StartTournament(repository, logger);
  const generateNextRound = new GenerateNextRound(repository, logger);

  const created = await createTournament.execute({
    ownerId: "u1",
    name: "Cup",
    totalSwissRounds: 3,
    useLegacyRuleset,
  });
  await registerPlayer.execute({
    tournamentId: created.getId(),
    requestingUserId: "u1",
    playerName: "Ash",
  });
  await registerPlayer.execute({
    tournamentId: created.getId(),
    requestingUserId: "u1",
    playerName: "Misty",
  });
  await startTournament.execute({
    tournamentId: created.getId(),
    requestingUserId: "u1",
  });
  await generateNextRound.execute({
    tournamentId: created.getId(),
    requestingUserId: "u1",
  });

  const tournament = (await repository.findById(created.getId()))!;
  const [player1, player2] = tournament.getPlayers();
  return { tournament, player1Id: player1.getId(), player2Id: player2.getId() };
}

describe("RegisterMatchResult", () => {
  let repository: InMemoryTournamentRepository;
  let logger: RecordingLogger;
  let idGenerator: SequentialIdGenerator;
  let registerMatchResult: RegisterMatchResult;

  beforeEach(() => {
    repository = new InMemoryTournamentRepository();
    logger = new RecordingLogger();
    idGenerator = new SequentialIdGenerator();
    registerMatchResult = new RegisterMatchResult(repository, logger);
  });

  it("registers a win and updates both players' points, opponents and games", async () => {
    const { tournament, player1Id, player2Id } =
      await setUpTournamentWithRound1(repository, logger, idGenerator);
    const matchId = tournament.getRound(1).getMatches()[0].getId();

    await registerMatchResult.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
      roundNumber: 1,
      matchId,
      result: {
        type: "win",
        winnerId: player1Id,
        winnerGames: 2,
        loserGames: 1,
      },
    });

    const persisted = await repository.findById(tournament.getId());
    const winner = persisted!.getPlayer(player1Id);
    const loser = persisted!.getPlayer(player2Id);

    expect(winner.getPoints()).toBe(3);
    expect(winner.hasPlayedAgainst(player2Id)).toBe(true);
    expect(winner.getGamesWon()).toBe(2);
    expect(winner.getGamesPlayed()).toBe(3);

    expect(loser.getPoints()).toBe(0);
    expect(loser.hasPlayedAgainst(player1Id)).toBe(true);
    expect(loser.getGamesWon()).toBe(1);
    expect(loser.getGamesPlayed()).toBe(3);
    // the loser's round is tracked for the DDD tiebreaker
    expect(loser.getLostRoundNumbers()).toEqual([1]);
    expect(winner.getLostRoundNumbers()).toEqual([]);
  });

  it("marks the match as resolved so the round can be completed afterward", async () => {
    const { tournament, player1Id } = await setUpTournamentWithRound1(
      repository,
      logger,
      idGenerator,
    );
    const matchId = tournament.getRound(1).getMatches()[0].getId();

    await registerMatchResult.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
      roundNumber: 1,
      matchId,
      result: {
        type: "win",
        winnerId: player1Id,
        winnerGames: 2,
        loserGames: 0,
      },
    });

    const persisted = await repository.findById(tournament.getId());
    expect(() => persisted!.completeRound(1)).not.toThrow();
  });

  it("registers a double loss: both players get 0 points, no games count, but the opponent still counts", async () => {
    const { tournament, player1Id, player2Id } =
      await setUpTournamentWithRound1(repository, logger, idGenerator);
    const matchId = tournament.getRound(1).getMatches()[0].getId();

    await registerMatchResult.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
      roundNumber: 1,
      matchId,
      result: { type: "double_loss", player1Games: 0, player2Games: 0 },
    });

    const persisted = await repository.findById(tournament.getId());
    const p1 = persisted!.getPlayer(player1Id);
    const p2 = persisted!.getPlayer(player2Id);

    expect(p1.getPoints()).toBe(0);
    expect(p2.getPoints()).toBe(0);
    expect(p1.hasPlayedAgainst(player2Id)).toBe(true);
    expect(p1.getGamesPlayed()).toBe(0);
    expect(p1.getGamesWon()).toBe(0);
    // a double loss counts as a lost round for both players (DDD)
    expect(p1.getLostRoundNumbers()).toEqual([1]);
    expect(p2.getLostRoundNumbers()).toEqual([1]);
  });

  it("registers a draw when the tournament ruleset allows it (legacy)", async () => {
    const { tournament, player1Id, player2Id } =
      await setUpTournamentWithRound1(repository, logger, idGenerator, true);
    const matchId = tournament.getRound(1).getMatches()[0].getId();

    await registerMatchResult.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
      roundNumber: 1,
      matchId,
      result: { type: "draw", player1Games: 1, player2Games: 1 },
    });

    const persisted = await repository.findById(tournament.getId());
    expect(persisted!.getPlayer(player1Id).getPoints()).toBe(1);
    expect(persisted!.getPlayer(player2Id).getPoints()).toBe(1);
  });

  it("throws when trying to register a draw under the current (no-draws) ruleset", async () => {
    const { tournament } = await setUpTournamentWithRound1(
      repository,
      logger,
      idGenerator,
    ); // defaults to current()
    const matchId = tournament.getRound(1).getMatches()[0].getId();

    await expect(
      registerMatchResult.execute({
        tournamentId: tournament.getId(),
        requestingUserId: "u1",
        roundNumber: 1,
        matchId,
        result: { type: "draw", player1Games: 1, player2Games: 1 },
      }),
    ).rejects.toThrow(
      "Draws are not allowed under this tournament's current ruleset",
    );
  });

  it("propagates the domain error when the match already has a result", async () => {
    const { tournament, player1Id } = await setUpTournamentWithRound1(
      repository,
      logger,
      idGenerator,
    );
    const matchId = tournament.getRound(1).getMatches()[0].getId();
    await registerMatchResult.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
      roundNumber: 1,
      matchId,
      result: {
        type: "win",
        winnerId: player1Id,
        winnerGames: 2,
        loserGames: 0,
      },
    });

    await expect(
      registerMatchResult.execute({
        tournamentId: tournament.getId(),
        requestingUserId: "u1",
        roundNumber: 1,
        matchId,
        result: {
          type: "win",
          winnerId: player1Id,
          winnerGames: 2,
          loserGames: 0,
        },
      }),
    ).rejects.toThrow("already has a reported result");
  });

  it("throws if the requesting user is not the tournament owner", async () => {
    const { tournament, player1Id } = await setUpTournamentWithRound1(
      repository,
      logger,
      idGenerator,
    );
    const matchId = tournament.getRound(1).getMatches()[0].getId();

    await expect(
      registerMatchResult.execute({
        tournamentId: tournament.getId(),
        requestingUserId: "someone-else",
        roundNumber: 1,
        matchId,
        result: {
          type: "win",
          winnerId: player1Id,
          winnerGames: 2,
          loserGames: 0,
        },
      }),
    ).rejects.toThrow(TournamentNotOwnedError);
  });

  it("logs the registered result", async () => {
    const { tournament, player1Id } = await setUpTournamentWithRound1(
      repository,
      logger,
      idGenerator,
    );
    const matchId = tournament.getRound(1).getMatches()[0].getId();
    const logCountBefore = logger.infoLogs.length;

    await registerMatchResult.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
      roundNumber: 1,
      matchId,
      result: {
        type: "win",
        winnerId: player1Id,
        winnerGames: 2,
        loserGames: 0,
      },
    });

    expect(logger.infoLogs).toHaveLength(logCountBefore + 1);
    const log = logger.infoLogs[logger.infoLogs.length - 1];
    expect(log.message).toBe("Match result registered");
    expect(log.context).toMatchObject({
      roundNumber: 1,
      matchId,
      resultType: "win",
    });
  });
});
