import { describe, it, expect, beforeEach } from "vitest";
import { CreateTournament } from "../CreateTournament";
import { RegisterPlayer } from "../RegisterPlayer";
import { StartTournament } from "../StartTournament";
import { GenerateNextRound } from "../GenerateNextRound";
import { RegisterMatchResult } from "../RegisterMatchResult";
import { CompleteRound } from "../CompleteRound";
import { RevertRoundCompletion } from "../RevertRoundCompletion";
import { TournamentNotOwnedError } from "../shared/loadOwnedTournament";
import {
  InMemoryTournamentRepository,
  RecordingLogger,
  SequentialIdGenerator,
} from "./fakes";

describe("RevertRoundCompletion", () => {
  let repository: InMemoryTournamentRepository;
  let logger: RecordingLogger;
  let idGenerator: SequentialIdGenerator;
  let createTournament: CreateTournament;
  let registerPlayer: RegisterPlayer;
  let startTournament: StartTournament;
  let generateNextRound: GenerateNextRound;
  let registerMatchResult: RegisterMatchResult;
  let completeRound: CompleteRound;
  let revertRoundCompletion: RevertRoundCompletion;

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
    revertRoundCompletion = new RevertRoundCompletion(repository, logger);
  });

  async function setUpTournamentWithCompletedRound1(playerNames: string[]) {
    const created = await createTournament.execute({
      ownerId: "u1",
      name: "Cup",
      totalSwissRounds: 3,
    });
    for (const name of playerNames) {
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
    for (const match of withRound1.getRound(1).getMatches()) {
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
    }
    await completeRound.execute({
      tournamentId: created.getId(),
      requestingUserId: "u1",
      roundNumber: 1,
    });

    return created.getId();
  }

  it("reverts a completed round back to pending", async () => {
    const tournamentId = await setUpTournamentWithCompletedRound1([
      "Ash",
      "Misty",
    ]);

    await revertRoundCompletion.execute({
      tournamentId,
      requestingUserId: "u1",
      roundNumber: 1,
    });

    const persisted = await repository.findById(tournamentId);
    expect(persisted!.getRound(1).isCompleted()).toBe(false);
  });

  it("does not touch the underlying match results", async () => {
    const tournamentId = await setUpTournamentWithCompletedRound1([
      "Ash",
      "Misty",
    ]);
    const tournamentBefore = (await repository.findById(tournamentId))!;
    const matchId = tournamentBefore.getRound(1).getMatches()[0].getId();

    await revertRoundCompletion.execute({
      tournamentId,
      requestingUserId: "u1",
      roundNumber: 1,
    });

    const persisted = await repository.findById(tournamentId);
    expect(persisted!.getRound(1).getMatch(matchId).isPending()).toBe(false);
  });

  it("allows completing the round again after reverting", async () => {
    const tournamentId = await setUpTournamentWithCompletedRound1([
      "Ash",
      "Misty",
    ]);
    await revertRoundCompletion.execute({
      tournamentId,
      requestingUserId: "u1",
      roundNumber: 1,
    });

    await expect(
      completeRound.execute({
        tournamentId,
        requestingUserId: "u1",
        roundNumber: 1,
      }),
    ).resolves.not.toThrow();
  });

  it("propagates the domain error when the round is not completed", async () => {
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

    await expect(
      revertRoundCompletion.execute({
        tournamentId: created.getId(),
        requestingUserId: "u1",
        roundNumber: 1,
      }),
    ).rejects.toThrow("is not completed, nothing to revert");
  });

  it("propagates the domain error when trying to revert a round that is no longer the most recent one", async () => {
    const tournamentId = await setUpTournamentWithCompletedRound1([
      "Ash",
      "Misty",
      "Brock",
      "Gary",
    ]);
    await generateNextRound.execute({ tournamentId, requestingUserId: "u1" });

    await expect(
      revertRoundCompletion.execute({
        tournamentId,
        requestingUserId: "u1",
        roundNumber: 1,
      }),
    ).rejects.toThrow("Only the most recently played round can be reverted");
  });

  it("throws if the requesting user is not the tournament owner", async () => {
    const tournamentId = await setUpTournamentWithCompletedRound1([
      "Ash",
      "Misty",
    ]);

    await expect(
      revertRoundCompletion.execute({
        tournamentId,
        requestingUserId: "someone-else",
        roundNumber: 1,
      }),
    ).rejects.toThrow(TournamentNotOwnedError);
  });

  it("logs the reverted round completion", async () => {
    const tournamentId = await setUpTournamentWithCompletedRound1([
      "Ash",
      "Misty",
    ]);
    const logCountBefore = logger.infoLogs.length;

    await revertRoundCompletion.execute({
      tournamentId,
      requestingUserId: "u1",
      roundNumber: 1,
    });

    expect(logger.infoLogs).toHaveLength(logCountBefore + 1);
    const log = logger.infoLogs[logger.infoLogs.length - 1];
    expect(log.message).toBe("Round completion reverted");
    expect(log.context).toMatchObject({ roundNumber: 1 });
  });
});
