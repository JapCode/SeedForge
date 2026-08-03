import { describe, it, expect, beforeEach } from "vitest";
import { CreateTournament } from "../CreateTournament";
import { RegisterPlayer } from "../RegisterPlayer";
import { StartTournament } from "../StartTournament";
import { GenerateNextRound } from "../GenerateNextRound";
import { RegisterMatchResult } from "../RegisterMatchResult";
import { RevertMatchResult } from "../RevertMatchResult";
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

describe("RevertMatchResult", () => {
  let repository: InMemoryTournamentRepository;
  let logger: RecordingLogger;
  let idGenerator: SequentialIdGenerator;
  let registerMatchResult: RegisterMatchResult;
  let revertMatchResult: RevertMatchResult;

  beforeEach(() => {
    repository = new InMemoryTournamentRepository();
    logger = new RecordingLogger();
    idGenerator = new SequentialIdGenerator();
    registerMatchResult = new RegisterMatchResult(repository, logger);
    revertMatchResult = new RevertMatchResult(repository, logger);
  });

  it("reverts a win, restoring both players exactly to their pre-result state", async () => {
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

    await revertMatchResult.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
      roundNumber: 1,
      matchId,
    });

    const persisted = await repository.findById(tournament.getId());
    const p1 = persisted!.getPlayer(player1Id);
    const p2 = persisted!.getPlayer(player2Id);

    expect(p1.getPoints()).toBe(0);
    expect(p2.getPoints()).toBe(0);
    expect(p1.hasPlayedAgainst(player2Id)).toBe(false);
    expect(p2.hasPlayedAgainst(player1Id)).toBe(false);
    expect(p1.getGamesPlayed()).toBe(0);
    expect(p2.getGamesPlayed()).toBe(0);
    expect(persisted!.getRound(1).getMatch(matchId).isPending()).toBe(true);
  });

  it("reverts a double loss", async () => {
    const { tournament, player1Id, player2Id } =
      await setUpTournamentWithRound1(repository, logger, idGenerator);
    const matchId = tournament.getRound(1).getMatches()[0].getId();

    await registerMatchResult.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
      roundNumber: 1,
      matchId,
      result: { type: "double_loss", player1Games: 1, player2Games: 1 },
    });

    await revertMatchResult.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
      roundNumber: 1,
      matchId,
    });

    const persisted = await repository.findById(tournament.getId());
    expect(persisted!.getPlayer(player1Id).hasPlayedAgainst(player2Id)).toBe(
      false,
    );
    expect(persisted!.getPlayer(player1Id).getGamesPlayed()).toBe(0);
  });

  it("reverts a draw (legacy ruleset)", async () => {
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

    await revertMatchResult.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
      roundNumber: 1,
      matchId,
    });

    const persisted = await repository.findById(tournament.getId());
    expect(persisted!.getPlayer(player1Id).getPoints()).toBe(0);
    expect(persisted!.getPlayer(player2Id).getPoints()).toBe(0);
  });

  it("allows re-registering a different result after reverting", async () => {
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
        loserGames: 0,
      },
    });
    await revertMatchResult.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
      roundNumber: 1,
      matchId,
    });
    await registerMatchResult.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
      roundNumber: 1,
      matchId,
      result: {
        type: "win",
        winnerId: player2Id,
        winnerGames: 2,
        loserGames: 0,
      },
    });

    const persisted = await repository.findById(tournament.getId());
    expect(persisted!.getPlayer(player2Id).getPoints()).toBe(3);
    expect(persisted!.getPlayer(player1Id).getPoints()).toBe(0);
  });

  it("automatically un-completes the round when reverting a match from an already-completed round", async () => {
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
    const afterRegister = (await repository.findById(tournament.getId()))!;
    afterRegister.completeRound(1);
    await repository.save(afterRegister);

    await revertMatchResult.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
      roundNumber: 1,
      matchId,
    });

    const persisted = await repository.findById(tournament.getId());
    expect(persisted!.getRound(1).isCompleted()).toBe(false);
  });

  it("throws when trying to revert a match in a round that is no longer the most recent one", async () => {
    // Needs 4 players: with only 2, round 2 could never be generated at all
    // (they'd have no valid opponent left without repeating), which would
    // make this test fail for the wrong reason.
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

    const afterRound1Generated = (await repository.findById(created.getId()))!;
    const round1 = afterRound1Generated.getRound(1);
    const [match1, match2] = round1.getMatches();

    for (const match of [match1, match2]) {
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

    const afterResults = (await repository.findById(created.getId()))!;
    afterResults.completeRound(1);
    await repository.save(afterResults);

    await generateNextRound.execute({
      tournamentId: created.getId(),
      requestingUserId: "u1",
    });

    await expect(
      revertMatchResult.execute({
        tournamentId: created.getId(),
        requestingUserId: "u1",
        roundNumber: 1,
        matchId: match1.getId(),
      }),
    ).rejects.toThrow("Only the most recently played round can be reverted");
  });

  it("throws if the match has no result to revert", async () => {
    const { tournament } = await setUpTournamentWithRound1(
      repository,
      logger,
      idGenerator,
    );
    const matchId = tournament.getRound(1).getMatches()[0].getId();

    await expect(
      revertMatchResult.execute({
        tournamentId: tournament.getId(),
        requestingUserId: "u1",
        roundNumber: 1,
        matchId,
      }),
    ).rejects.toThrow("has no reported result to revert");
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
      revertMatchResult.execute({
        tournamentId: tournament.getId(),
        requestingUserId: "someone-else",
        roundNumber: 1,
        matchId,
      }),
    ).rejects.toThrow(TournamentNotOwnedError);
  });

  it("logs the reverted result", async () => {
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

    await revertMatchResult.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
      roundNumber: 1,
      matchId,
    });

    expect(logger.infoLogs).toHaveLength(logCountBefore + 1);
    const log = logger.infoLogs[logger.infoLogs.length - 1];
    expect(log.message).toBe("Match result reverted");
    expect(log.context).toMatchObject({
      roundNumber: 1,
      matchId,
      revertedResultType: "win",
    });
  });
});
