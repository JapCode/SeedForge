import { describe, it, expect, beforeEach } from "vitest";
import { CreateTournament } from "../CreateTournament";
import { RegisterPlayer } from "../RegisterPlayer";
import { StartTournament } from "../StartTournament";
import { GenerateNextRound } from "../GenerateNextRound";
import { RegisterMatchResult } from "../RegisterMatchResult";
import { CompleteRound } from "../CompleteRound";
import { AdvanceToTopCut } from "../AdvanceToTopCut";
import { ReportBracketMatchWinner } from "../ReportBracketMatchWinner";
import { RevertBracketMatchWinner } from "../RevertBracketMatchWinner";
import { TournamentNotOwnedError } from "../shared/loadOwnedTournament";
import {
  InMemoryTournamentRepository,
  InMemoryTopCutBracketRepository,
  RecordingLogger,
  SequentialIdGenerator,
} from "./fakes";

describe("RevertBracketMatchWinner", () => {
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
  let reportBracketMatchWinner: ReportBracketMatchWinner;
  let revertBracketMatchWinner: RevertBracketMatchWinner;

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
    reportBracketMatchWinner = new ReportBracketMatchWinner(
      tournamentRepository,
      bracketRepository,
      logger,
    );
    revertBracketMatchWinner = new RevertBracketMatchWinner(
      tournamentRepository,
      bracketRepository,
      logger,
    );
  });

  async function setUpTournamentInTopCut(): Promise<string> {
    const created = await createTournament.execute({
      ownerId: "u1",
      name: "Cup",
      totalSwissRounds: 1,
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
    await advanceToTopCut.execute({
      tournamentId: created.getId(),
      requestingUserId: "u1",
    });

    return created.getId();
  }

  it("reverts a round-1 winner, clearing the slot it had advanced into", async () => {
    const tournamentId = await setUpTournamentInTopCut();
    const bracket = (await bracketRepository.findByTournamentId(tournamentId))!;
    const winnerId = bracket.getRound(1)[0].getPlayer1Id()!;
    await reportBracketMatchWinner.execute({
      tournamentId,
      requestingUserId: "u1",
      roundIndex: 1,
      position: 0,
      winnerId,
    });

    await revertBracketMatchWinner.execute({
      tournamentId,
      requestingUserId: "u1",
      roundIndex: 1,
      position: 0,
    });

    const persisted =
      (await bracketRepository.findByTournamentId(tournamentId))!;
    expect(persisted.getMatch(1, 0).getWinnerId()).toBeNull();
    const finalMatch = persisted.getMatch(2, 0);
    expect([
      finalMatch.getPlayer1Id(),
      finalMatch.getPlayer2Id(),
    ]).not.toContain(winnerId);
  });

  it("propagates the domain error when the next round's match was already decided", async () => {
    const tournamentId = await setUpTournamentInTopCut();
    let bracket = (await bracketRepository.findByTournamentId(tournamentId))!;

    for (const match of bracket.getRound(1)) {
      await reportBracketMatchWinner.execute({
        tournamentId,
        requestingUserId: "u1",
        roundIndex: 1,
        position: match.getPosition(),
        winnerId: match.getPlayer1Id()!,
      });
    }
    bracket = (await bracketRepository.findByTournamentId(tournamentId))!;
    const finalMatch = bracket.getMatch(2, 0);
    await reportBracketMatchWinner.execute({
      tournamentId,
      requestingUserId: "u1",
      roundIndex: 2,
      position: 0,
      winnerId: finalMatch.getPlayer1Id()!,
    });

    await expect(
      revertBracketMatchWinner.execute({
        tournamentId,
        requestingUserId: "u1",
        roundIndex: 1,
        position: 0,
      }),
    ).rejects.toThrow("the next round's match has already been decided");
  });

  it("reopens the tournament back to top_cut when reverting the final's winner", async () => {
    const tournamentId = await setUpTournamentInTopCut();
    let bracket = (await bracketRepository.findByTournamentId(tournamentId))!;
    for (const match of bracket.getRound(1)) {
      await reportBracketMatchWinner.execute({
        tournamentId,
        requestingUserId: "u1",
        roundIndex: 1,
        position: match.getPosition(),
        winnerId: match.getPlayer1Id()!,
      });
    }
    bracket = (await bracketRepository.findByTournamentId(tournamentId))!;
    const finalMatch = bracket.getMatch(2, 0);
    await reportBracketMatchWinner.execute({
      tournamentId,
      requestingUserId: "u1",
      roundIndex: 2,
      position: 0,
      winnerId: finalMatch.getPlayer1Id()!,
    });
    expect(
      (await tournamentRepository.findById(tournamentId))!.getPhase(),
    ).toBe("completed");

    await revertBracketMatchWinner.execute({
      tournamentId,
      requestingUserId: "u1",
      roundIndex: 2,
      position: 0,
    });

    const persisted = await tournamentRepository.findById(tournamentId);
    expect(persisted!.getPhase()).toBe("top_cut");
    const persistedBracket =
      await bracketRepository.findByTournamentId(tournamentId);
    expect(persistedBracket!.isComplete()).toBe(false);
  });

  it("allows reporting a different final winner after reverting", async () => {
    const tournamentId = await setUpTournamentInTopCut();
    let bracket = (await bracketRepository.findByTournamentId(tournamentId))!;
    for (const match of bracket.getRound(1)) {
      await reportBracketMatchWinner.execute({
        tournamentId,
        requestingUserId: "u1",
        roundIndex: 1,
        position: match.getPosition(),
        winnerId: match.getPlayer1Id()!,
      });
    }
    bracket = (await bracketRepository.findByTournamentId(tournamentId))!;
    const finalMatch = bracket.getMatch(2, 0);
    const [candidateA, candidateB] = [
      finalMatch.getPlayer1Id()!,
      finalMatch.getPlayer2Id()!,
    ];

    await reportBracketMatchWinner.execute({
      tournamentId,
      requestingUserId: "u1",
      roundIndex: 2,
      position: 0,
      winnerId: candidateA,
    });
    await revertBracketMatchWinner.execute({
      tournamentId,
      requestingUserId: "u1",
      roundIndex: 2,
      position: 0,
    });
    await reportBracketMatchWinner.execute({
      tournamentId,
      requestingUserId: "u1",
      roundIndex: 2,
      position: 0,
      winnerId: candidateB,
    });

    const persistedBracket =
      await bracketRepository.findByTournamentId(tournamentId);
    expect(persistedBracket!.getChampion()).toBe(candidateB);
  });

  it("throws if the requesting user is not the tournament owner", async () => {
    const tournamentId = await setUpTournamentInTopCut();
    const bracket = (await bracketRepository.findByTournamentId(tournamentId))!;
    await reportBracketMatchWinner.execute({
      tournamentId,
      requestingUserId: "u1",
      roundIndex: 1,
      position: 0,
      winnerId: bracket.getRound(1)[0].getPlayer1Id()!,
    });

    await expect(
      revertBracketMatchWinner.execute({
        tournamentId,
        requestingUserId: "someone-else",
        roundIndex: 1,
        position: 0,
      }),
    ).rejects.toThrow(TournamentNotOwnedError);
  });

  it("logs the reverted winner", async () => {
    const tournamentId = await setUpTournamentInTopCut();
    const bracket = (await bracketRepository.findByTournamentId(tournamentId))!;
    await reportBracketMatchWinner.execute({
      tournamentId,
      requestingUserId: "u1",
      roundIndex: 1,
      position: 0,
      winnerId: bracket.getRound(1)[0].getPlayer1Id()!,
    });
    const logCountBefore = logger.infoLogs.length;

    await revertBracketMatchWinner.execute({
      tournamentId,
      requestingUserId: "u1",
      roundIndex: 1,
      position: 0,
    });

    expect(logger.infoLogs).toHaveLength(logCountBefore + 1);
    const log = logger.infoLogs[logger.infoLogs.length - 1];
    expect(log.message).toBe("Bracket match winner reverted");
    expect(log.context).toMatchObject({ roundIndex: 1, position: 0 });
  });
});
