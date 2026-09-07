import { describe, it, expect, beforeEach } from "vitest";
import { CreateTournament } from "../CreateTournament";
import { RegisterPlayer } from "../RegisterPlayer";
import { StartTournament } from "../StartTournament";
import { GenerateNextRound } from "../GenerateNextRound";
import { RegisterMatchResult } from "../RegisterMatchResult";
import { CompleteRound } from "../CompleteRound";
import { RevertRoundForEdit } from "../RevertRoundForEdit";
import { TournamentNotOwnedError } from "../shared/loadOwnedTournament";
import {
  InMemoryTournamentRepository,
  RecordingLogger,
  SequentialIdGenerator,
} from "./fakes";

describe("RevertRoundForEdit", () => {
  let repository: InMemoryTournamentRepository;
  let logger: RecordingLogger;
  let idGenerator: SequentialIdGenerator;
  let createTournament: CreateTournament;
  let registerPlayer: RegisterPlayer;
  let startTournament: StartTournament;
  let generateNextRound: GenerateNextRound;
  let registerMatchResult: RegisterMatchResult;
  let completeRound: CompleteRound;
  let revertRoundForEdit: RevertRoundForEdit;

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
    revertRoundForEdit = new RevertRoundForEdit(repository, logger);
  });

  async function setUpTournamentWithRound1Completed(playerNames: string[]) {
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

  it("removes every later round and reopens the target round", async () => {
    const tournamentId = await setUpTournamentWithRound1Completed([
      "Ash",
      "Misty",
      "Brock",
      "Gary",
    ]);
    await generateNextRound.execute({ tournamentId, requestingUserId: "u1" });

    await revertRoundForEdit.execute({
      tournamentId,
      requestingUserId: "u1",
      roundNumber: 1,
    });

    const persisted = (await repository.findById(tournamentId))!;
    expect(persisted.getRounds().map((r) => r.getRoundNumber())).toEqual([1]);
    expect(persisted.getRound(1).isCompleted()).toBe(false);
  });

  it("restores the standings to the state after the target round", async () => {
    const tournamentId = await setUpTournamentWithRound1Completed([
      "Ash",
      "Misty",
      "Brock",
      "Gary",
    ]);
    await generateNextRound.execute({ tournamentId, requestingUserId: "u1" });

    // Round 1 pairings are random, so derive the expected standings from the
    // actual round 1 results instead of assuming which player won.
    const tournamentBefore = (await repository.findById(tournamentId))!;
    const expectedPoints = new Map<string, number>();
    for (const match of tournamentBefore.getRound(1).getMatches()) {
      const result = match.getResult();
      if (result.type === "win") {
        expectedPoints.set(result.winnerId, 3);
      }
    }

    await revertRoundForEdit.execute({
      tournamentId,
      requestingUserId: "u1",
      roundNumber: 1,
    });

    const persisted = (await repository.findById(tournamentId))!;
    for (const player of persisted.getPlayers()) {
      expect(player.getPoints()).toBe(expectedPoints.get(player.getId()) ?? 0);
    }
  });

  it("allows generating a new round with recalculated pairings afterwards", async () => {
    const tournamentId = await setUpTournamentWithRound1Completed([
      "Ash",
      "Misty",
      "Brock",
      "Gary",
    ]);
    await generateNextRound.execute({ tournamentId, requestingUserId: "u1" });
    await revertRoundForEdit.execute({
      tournamentId,
      requestingUserId: "u1",
      roundNumber: 1,
    });
    // The target round's results are kept, so it can be completed again right
    // away; only then can the next round be generated (the domain requires
    // the current round to be completed before adding a new one).
    await completeRound.execute({
      tournamentId,
      requestingUserId: "u1",
      roundNumber: 1,
    });

    await expect(
      generateNextRound.execute({ tournamentId, requestingUserId: "u1" }),
    ).resolves.not.toThrow();

    const persisted = (await repository.findById(tournamentId))!;
    expect(persisted.getRounds().map((r) => r.getRoundNumber())).toEqual([
      1, 2,
    ]);
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
      revertRoundForEdit.execute({
        tournamentId: created.getId(),
        requestingUserId: "u1",
        roundNumber: 1,
      }),
    ).rejects.toThrow(
      "must be completed before it can be reverted for editing",
    );
  });

  it("propagates the domain error when the round is the most recently played one", async () => {
    const tournamentId = await setUpTournamentWithRound1Completed([
      "Ash",
      "Misty",
    ]);

    await expect(
      revertRoundForEdit.execute({
        tournamentId,
        requestingUserId: "u1",
        roundNumber: 1,
      }),
    ).rejects.toThrow("is the last round; use revertRoundCompletion instead");
  });

  it("throws if the requesting user is not the tournament owner", async () => {
    const tournamentId = await setUpTournamentWithRound1Completed([
      "Ash",
      "Misty",
      "Brock",
      "Gary",
    ]);
    await generateNextRound.execute({ tournamentId, requestingUserId: "u1" });

    await expect(
      revertRoundForEdit.execute({
        tournamentId,
        requestingUserId: "someone-else",
        roundNumber: 1,
      }),
    ).rejects.toThrow(TournamentNotOwnedError);
  });

  it("logs the reverted round", async () => {
    const tournamentId = await setUpTournamentWithRound1Completed([
      "Ash",
      "Misty",
      "Brock",
      "Gary",
    ]);
    await generateNextRound.execute({ tournamentId, requestingUserId: "u1" });
    const logCountBefore = logger.infoLogs.length;

    await revertRoundForEdit.execute({
      tournamentId,
      requestingUserId: "u1",
      roundNumber: 1,
    });

    expect(logger.infoLogs).toHaveLength(logCountBefore + 1);
    const log = logger.infoLogs[logger.infoLogs.length - 1];
    expect(log.message).toBe("Round reverted for editing");
    expect(log.context).toMatchObject({ roundNumber: 1 });
  });
});
