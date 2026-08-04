import { describe, it, expect, beforeEach } from "vitest";
import { CreateTournament } from "../CreateTournament";
import { RegisterPlayer } from "../RegisterPlayer";
import { StartTournament } from "../StartTournament";
import { GenerateNextRound } from "../GenerateNextRound";
import { RegisterMatchResult } from "../RegisterMatchResult";
import { CompleteRound } from "../CompleteRound";
import { AdvanceToTopCut } from "../AdvanceToTopCut";
import { ReportBracketMatchWinner } from "../ReportBracketMatchWinner";
import { TournamentNotOwnedError } from "../shared/loadOwnedTournament";
import {
  InMemoryTournamentRepository,
  InMemoryTopCutBracketRepository,
  RecordingLogger,
  SequentialIdGenerator,
} from "./fakes";

describe("ReportBracketMatchWinner", () => {
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

  it("reports a round-1 bracket match winner and advances them into round 2", async () => {
    const tournamentId = await setUpTournamentInTopCut();
    const bracket = (await bracketRepository.findByTournamentId(tournamentId))!;
    const [round1Match0] = bracket.getRound(1);
    const winnerId = round1Match0.getPlayer1Id()!;

    await reportBracketMatchWinner.execute({
      tournamentId,
      requestingUserId: "u1",
      roundIndex: 1,
      position: 0,
      winnerId,
    });

    const persistedBracket =
      (await bracketRepository.findByTournamentId(tournamentId))!;
    expect(persistedBracket.getMatch(1, 0).getWinnerId()).toBe(winnerId);
    const finalMatch = persistedBracket.getMatch(2, 0);
    expect([finalMatch.getPlayer1Id(), finalMatch.getPlayer2Id()]).toContain(
      winnerId,
    );
  });

  it("does not complete the tournament after a non-final match", async () => {
    const tournamentId = await setUpTournamentInTopCut();
    const bracket = (await bracketRepository.findByTournamentId(tournamentId))!;
    const [round1Match0] = bracket.getRound(1);

    await reportBracketMatchWinner.execute({
      tournamentId,
      requestingUserId: "u1",
      roundIndex: 1,
      position: 0,
      winnerId: round1Match0.getPlayer1Id()!,
    });

    const persisted = await tournamentRepository.findById(tournamentId);
    expect(persisted!.getPhase()).toBe("top_cut");
  });

  it("completes the tournament once the final's winner is reported", async () => {
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

    const persistedTournament =
      await tournamentRepository.findById(tournamentId);
    const persistedBracket =
      await bracketRepository.findByTournamentId(tournamentId);
    expect(persistedTournament!.getPhase()).toBe("completed");
    expect(persistedBracket!.isComplete()).toBe(true);
  });

  it("propagates the domain error when the winner is not part of the match", async () => {
    const tournamentId = await setUpTournamentInTopCut();

    await expect(
      reportBracketMatchWinner.execute({
        tournamentId,
        requestingUserId: "u1",
        roundIndex: 1,
        position: 0,
        winnerId: "not-a-real-player",
      }),
    ).rejects.toThrow("is not part of match");
  });

  it("throws if the tournament is not in the top cut phase yet", async () => {
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

    await expect(
      reportBracketMatchWinner.execute({
        tournamentId: created.getId(),
        requestingUserId: "u1",
        roundIndex: 1,
        position: 0,
        winnerId: "whoever",
      }),
    ).rejects.toThrow("is not in the top cut phase");
  });

  it("throws if the requesting user is not the tournament owner", async () => {
    const tournamentId = await setUpTournamentInTopCut();
    const bracket = (await bracketRepository.findByTournamentId(tournamentId))!;

    await expect(
      reportBracketMatchWinner.execute({
        tournamentId,
        requestingUserId: "someone-else",
        roundIndex: 1,
        position: 0,
        winnerId: bracket.getRound(1)[0].getPlayer1Id()!,
      }),
    ).rejects.toThrow(TournamentNotOwnedError);
  });

  it("logs the reported winner", async () => {
    const tournamentId = await setUpTournamentInTopCut();
    const bracket = (await bracketRepository.findByTournamentId(tournamentId))!;
    const logCountBefore = logger.infoLogs.length;

    await reportBracketMatchWinner.execute({
      tournamentId,
      requestingUserId: "u1",
      roundIndex: 1,
      position: 0,
      winnerId: bracket.getRound(1)[0].getPlayer1Id()!,
    });

    expect(logger.infoLogs).toHaveLength(logCountBefore + 1);
    const log = logger.infoLogs[logger.infoLogs.length - 1];
    expect(log.message).toBe("Bracket match winner reported");
    expect(log.context).toMatchObject({
      roundIndex: 1,
      position: 0,
      tournamentCompleted: false,
    });
  });
});
