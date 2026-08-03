import { describe, it, expect, beforeEach } from "vitest";
import { CreateTournament } from "../CreateTournament";
import { RegisterPlayer } from "../RegisterPlayer";
import { StartTournament } from "../StartTournament";
import { GenerateNextRound } from "../GenerateNextRound";
import { RegisterMatchResult } from "../RegisterMatchResult";
import { CompleteRound } from "../CompleteRound";
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
): Promise<{ tournament: Tournament; player1Id: string }> {
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
  return { tournament, player1Id: tournament.getPlayers()[0].getId() };
}

describe("CompleteRound", () => {
  let repository: InMemoryTournamentRepository;
  let logger: RecordingLogger;
  let idGenerator: SequentialIdGenerator;
  let registerMatchResult: RegisterMatchResult;
  let completeRound: CompleteRound;

  beforeEach(() => {
    repository = new InMemoryTournamentRepository();
    logger = new RecordingLogger();
    idGenerator = new SequentialIdGenerator();
    registerMatchResult = new RegisterMatchResult(repository, logger);
    completeRound = new CompleteRound(repository, logger);
  });

  it("completes a round once every match has a reported result", async () => {
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

    await completeRound.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
      roundNumber: 1,
    });

    const persisted = await repository.findById(tournament.getId());
    expect(persisted!.getRound(1).isCompleted()).toBe(true);
  });

  it("propagates the domain error when a match is still pending", async () => {
    const { tournament } = await setUpTournamentWithRound1(
      repository,
      logger,
      idGenerator,
    );

    await expect(
      completeRound.execute({
        tournamentId: tournament.getId(),
        requestingUserId: "u1",
        roundNumber: 1,
      }),
    ).rejects.toThrow("still has pending matches");
  });

  it("throws if the requesting user is not the tournament owner", async () => {
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
      completeRound.execute({
        tournamentId: tournament.getId(),
        requestingUserId: "someone-else",
        roundNumber: 1,
      }),
    ).rejects.toThrow(TournamentNotOwnedError);
  });

  it("logs the completed round", async () => {
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
    const logCountBefore = logger.infoLogs.length;

    await completeRound.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
      roundNumber: 1,
    });

    expect(logger.infoLogs).toHaveLength(logCountBefore + 1);
    const log = logger.infoLogs[logger.infoLogs.length - 1];
    expect(log.message).toBe("Round completed");
    expect(log.context).toMatchObject({ roundNumber: 1 });
  });
});
