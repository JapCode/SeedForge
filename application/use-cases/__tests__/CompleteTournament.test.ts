import { describe, it, expect, beforeEach } from "vitest";
import { CreateTournament } from "../CreateTournament";
import { RegisterPlayer } from "../RegisterPlayer";
import { StartTournament } from "../StartTournament";
import { GenerateNextRound } from "../GenerateNextRound";
import { RegisterMatchResult } from "../RegisterMatchResult";
import { CompleteRound } from "../CompleteRound";
import { CompleteTournament } from "../CompleteTournament";
import { TournamentNotOwnedError } from "../shared/loadOwnedTournament";
import {
  InMemoryTournamentRepository,
  RecordingLogger,
  SequentialIdGenerator,
} from "./fakes";

describe("CompleteTournament", () => {
  let repository: InMemoryTournamentRepository;
  let logger: RecordingLogger;
  let idGenerator: SequentialIdGenerator;
  let createTournament: CreateTournament;
  let registerPlayer: RegisterPlayer;
  let startTournament: StartTournament;
  let generateNextRound: GenerateNextRound;
  let registerMatchResult: RegisterMatchResult;
  let completeRound: CompleteRound;
  let completeTournament: CompleteTournament;

  beforeEach(() => {
    repository = new InMemoryTournamentRepository();
    logger = new RecordingLogger();
    idGenerator = new SequentialIdGenerator();
    createTournament = new CreateTournament(repository, idGenerator, logger);
    registerPlayer = new RegisterPlayer(repository, idGenerator, logger);
    startTournament = new StartTournament(repository, logger);
    generateNextRound = new GenerateNextRound(repository, logger);
    registerMatchResult = new RegisterMatchResult(repository, logger);
    completeRound = new CompleteRound(repository, logger);
    completeTournament = new CompleteTournament(repository, logger);
  });

  async function setUpTournamentWithSwissFinished(
    topCutSize: 4 | null = null,
  ): Promise<string> {
    const created = await createTournament.execute({
      ownerId: "u1",
      name: "Cup",
      totalSwissRounds: 1,
      topCutSize,
    });
    for (const name of ["Ash", "Misty"]) {
      await registerPlayer.execute({
        tournamentId: created.getId(),
        requestingUserId: "u1",
        playerName: name,
      });
    }
    await startTournament.execute({
      tournamentId: created.getId(),
      requestingUserId: "u1",
    });
    await generateNextRound.execute({
      tournamentId: created.getId(),
      requestingUserId: "u1",
    });

    const withRound1 = (await repository.findById(created.getId()))!;
    const match = withRound1.getRound(1).getMatches()[0];
    await registerMatchResult.execute({
      tournamentId: created.getId(),
      requestingUserId: "u1",
      roundNumber: 1,
      matchId: match.getId(),
      result: {
        type: "win",
        winnerId: match.getPlayer1Id(),
        winnerGames: 2,
        loserGames: 0,
      },
    });
    await completeRound.execute({
      tournamentId: created.getId(),
      requestingUserId: "u1",
      roundNumber: 1,
    });

    return created.getId();
  }

  it("completes a tournament with no top cut once swiss rounds are done", async () => {
    const tournamentId = await setUpTournamentWithSwissFinished();

    await completeTournament.execute({ tournamentId, requestingUserId: "u1" });

    const persisted = await repository.findById(tournamentId);
    expect(persisted!.getPhase()).toBe("completed");
  });

  it("propagates the domain error when a top cut is configured", async () => {
    const tournamentId = await setUpTournamentWithSwissFinished(4);

    await expect(
      completeTournament.execute({ tournamentId, requestingUserId: "u1" }),
    ).rejects.toThrow("has a top cut configured");
  });

  it("propagates the domain error when swiss rounds are not finished", async () => {
    const created = await createTournament.execute({
      ownerId: "u1",
      name: "Cup",
      totalSwissRounds: 2,
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

    await expect(
      completeTournament.execute({
        tournamentId: created.getId(),
        requestingUserId: "u1",
      }),
    ).rejects.toThrow("All swiss rounds must be completed");
  });

  it("throws if the requesting user is not the tournament owner", async () => {
    const tournamentId = await setUpTournamentWithSwissFinished();

    await expect(
      completeTournament.execute({
        tournamentId,
        requestingUserId: "someone-else",
      }),
    ).rejects.toThrow(TournamentNotOwnedError);
  });

  it("logs the completed tournament", async () => {
    const tournamentId = await setUpTournamentWithSwissFinished();
    const logCountBefore = logger.infoLogs.length;

    await completeTournament.execute({ tournamentId, requestingUserId: "u1" });

    expect(logger.infoLogs).toHaveLength(logCountBefore + 1);
    const log = logger.infoLogs[logger.infoLogs.length - 1];
    expect(log.message).toBe("Tournament completed");
    expect(log.context).toMatchObject({ tournamentId });
  });
});
