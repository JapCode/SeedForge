import { describe, it, expect, beforeEach } from "vitest";
import { CreateTournament } from "../CreateTournament";
import { RegisterPlayer } from "../RegisterPlayer";
import { StartTournament } from "../StartTournament";
import { GenerateNextRound } from "../GenerateNextRound";
import { RegisterMatchResult } from "../RegisterMatchResult";
import { CompleteRound } from "../CompleteRound";
import { AdvanceToTopCut } from "../AdvanceToTopCut";
import { TournamentNotOwnedError } from "../shared/loadOwnedTournament";
import {
  InMemoryTournamentRepository,
  InMemoryTopCutBracketRepository,
  RecordingLogger,
  SequentialIdGenerator,
} from "./fakes";
import { TopCutSize } from "../../../domain/entities/Tournament";

describe("AdvanceToTopCut", () => {
  let tournamentRepository: InMemoryTournamentRepository;
  let bracketRepository: InMemoryTopCutBracketRepository;
  let logger: RecordingLogger;
  let idGenerator: SequentialIdGenerator;
  let createTournament: CreateTournament;
  let registerPlayer: RegisterPlayer;
  let startTournament: StartTournament;
  let generateNextRound: GenerateNextRound;
  let registerMatchResult: RegisterMatchResult;
  let completeRound: CompleteRound;
  let advanceToTopCut: AdvanceToTopCut;

  beforeEach(() => {
    tournamentRepository = new InMemoryTournamentRepository();
    bracketRepository = new InMemoryTopCutBracketRepository();
    logger = new RecordingLogger();
    idGenerator = new SequentialIdGenerator();
    createTournament = new CreateTournament(
      tournamentRepository,
      idGenerator,
      logger,
    );
    registerPlayer = new RegisterPlayer(
      tournamentRepository,
      idGenerator,
      logger,
    );
    startTournament = new StartTournament(tournamentRepository, logger);
    generateNextRound = new GenerateNextRound(tournamentRepository, logger);
    registerMatchResult = new RegisterMatchResult(tournamentRepository, logger);
    completeRound = new CompleteRound(tournamentRepository, logger);
    advanceToTopCut = new AdvanceToTopCut(
      tournamentRepository,
      bracketRepository,
      logger,
    );
  });

  async function setUpTournamentReadyForTopCut(
    topCutSize: TopCutSize,
    playerNames: string[],
  ): Promise<string> {
    const created = await createTournament.execute({
      ownerId: "u1",
      name: "Cup",
      totalSwissRounds: 1,
      topCutSize,
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

    const withRound1 = (await tournamentRepository.findById(created.getId()))!;
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

  it("advances the tournament phase to top_cut", async () => {
    const tournamentId = await setUpTournamentReadyForTopCut(4, [
      "Ash",
      "Misty",
      "Brock",
      "Gary",
    ]);

    await advanceToTopCut.execute({ tournamentId, requestingUserId: "u1" });

    const persisted = await tournamentRepository.findById(tournamentId);
    expect(persisted!.getPhase()).toBe("top_cut");
  });

  it("returns a bracket sized to the configured top cut, and persists it separately", async () => {
    const tournamentId = await setUpTournamentReadyForTopCut(4, [
      "Ash",
      "Misty",
      "Brock",
      "Gary",
    ]);

    const bracket = await advanceToTopCut.execute({
      tournamentId,
      requestingUserId: "u1",
    });

    expect(bracket.getSize()).toBe(4);
    const persistedBracket =
      await bracketRepository.findByTournamentId(tournamentId);
    expect(persistedBracket).not.toBeNull();
    expect(persistedBracket!.getSize()).toBe(4);
  });

  it("assigns a topCutSeed to each qualifying player", async () => {
    const tournamentId = await setUpTournamentReadyForTopCut(4, [
      "Ash",
      "Misty",
      "Brock",
      "Gary",
    ]);

    await advanceToTopCut.execute({ tournamentId, requestingUserId: "u1" });

    const persisted = await tournamentRepository.findById(tournamentId);
    const seeds = persisted!.getPlayers().map((p) => p.getTopCutSeed());
    expect(seeds.every((seed) => seed !== null)).toBe(true);
    expect(new Set(seeds).size).toBe(4); // all seeds are unique (1,2,3,4)
  });

  it("propagates the domain error when swiss rounds are not finished", async () => {
    const created = await createTournament.execute({
      ownerId: "u1",
      name: "Cup",
      totalSwissRounds: 2,
      topCutSize: 4,
    });
    for (const name of ["Ash", "Misty", "Brock", "Gary"]) {
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

    await expect(
      advanceToTopCut.execute({
        tournamentId: created.getId(),
        requestingUserId: "u1",
      }),
    ).rejects.toThrow(
      "All swiss rounds must be completed before advancing to top cut",
    );
  });

  it("propagates the domain error when no top cut was configured", async () => {
    const tournamentId = await setUpTournamentReadyForTopCut(null, [
      "Ash",
      "Misty",
    ]);

    await expect(
      advanceToTopCut.execute({ tournamentId, requestingUserId: "u1" }),
    ).rejects.toThrow("was not configured with a top cut");
  });

  it("propagates the domain error when there aren't enough active players for the configured top cut", async () => {
    const tournamentId = await setUpTournamentReadyForTopCut(8, [
      "Ash",
      "Misty",
      "Brock",
      "Gary",
    ]);

    await expect(
      advanceToTopCut.execute({ tournamentId, requestingUserId: "u1" }),
    ).rejects.toThrow("Not enough active players");
  });

  it("throws if the requesting user is not the tournament owner", async () => {
    const tournamentId = await setUpTournamentReadyForTopCut(4, [
      "Ash",
      "Misty",
      "Brock",
      "Gary",
    ]);

    await expect(
      advanceToTopCut.execute({
        tournamentId,
        requestingUserId: "someone-else",
      }),
    ).rejects.toThrow(TournamentNotOwnedError);
  });

  it("logs the advancement to top cut", async () => {
    const tournamentId = await setUpTournamentReadyForTopCut(4, [
      "Ash",
      "Misty",
      "Brock",
      "Gary",
    ]);
    const logCountBefore = logger.infoLogs.length;

    await advanceToTopCut.execute({ tournamentId, requestingUserId: "u1" });

    expect(logger.infoLogs).toHaveLength(logCountBefore + 1);
    const log = logger.infoLogs[logger.infoLogs.length - 1];
    expect(log.message).toBe("Advanced to top cut");
    expect(log.context).toMatchObject({ topCutSize: 4 });
  });
});
