import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
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
import { Round } from "../../../domain/entities/Round";

async function setUpTournamentWithPlayers(
  repository: InMemoryTournamentRepository,
  logger: RecordingLogger,
  idGenerator: SequentialIdGenerator,
  playerNames: string[],
): Promise<Tournament> {
  const createTournament = new CreateTournament(
    repository,
    idGenerator,
    logger,
  );
  const registerPlayer = new RegisterPlayer(repository, idGenerator, logger);
  const startTournament = new StartTournament(repository, logger);

  const tournament = await createTournament.execute({
    ownerId: "u1",
    name: "Cup",
    totalSwissRounds: 3,
  });
  for (const name of playerNames) {
    await registerPlayer.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
      playerName: name,
    });
  }
  await startTournament.execute({
    tournamentId: tournament.getId(),
    requestingUserId: "u1",
  });

  return (await repository.findById(tournament.getId()))!;
}

/**
 * Reports a win for player1 on every match of the given round and completes
 * it. This only satisfies Match/Round's own invariants (no pending matches)
 * so that Tournament.addRound() will accept the next round — it does NOT
 * update Player stats (points, opponentIds), since that synchronization is
 * the responsibility of the future RegisterMatchResult use-case, not this one.
 */
async function completeRoundWithArbitraryResults(
  repository: InMemoryTournamentRepository,
  tournament: Tournament,
  roundNumber: number,
): Promise<void> {
  const round = tournament.getRound(roundNumber);
  for (const match of round.getMatches()) {
    if (!match.isBye()) {
      match.reportWin(match.getPlayer1Id(), 2, 0);
    }
  }
  tournament.completeRound(roundNumber);
  await repository.save(tournament);
}

/**
 * Reports a 2-0 win for player1 on every match of the round through the real
 * RegisterMatchResult use-case (so player stats stay in sync), then completes
 * the round. Used to build real standings for the next round's pairing.
 */
async function reportPlayer1WinsAndComplete(
  repository: InMemoryTournamentRepository,
  logger: RecordingLogger,
  tournamentId: string,
  roundNumber: number,
): Promise<void> {
  const registerMatchResult = new RegisterMatchResult(repository, logger);
  let tournament = (await repository.findById(tournamentId))!;
  for (const match of tournament.getRound(roundNumber).getMatches()) {
    if (match.isBye()) continue;
    await registerMatchResult.execute({
      tournamentId,
      requestingUserId: "u1",
      roundNumber,
      matchId: match.getId(),
      result: {
        type: "win",
        winnerId: match.getPlayer1Id(),
        winnerGames: 2,
        loserGames: 0,
      },
    });
  }
  tournament = (await repository.findById(tournamentId))!;
  tournament.completeRound(roundNumber);
  await repository.save(tournament);
}

function pairingsOf(round: Round): [string, string][] {
  return round
    .getMatches()
    .map((match) => [match.getPlayer1Id(), match.getPlayer2Id()!]);
}

describe("GenerateNextRound", () => {
  let repository: InMemoryTournamentRepository;
  let logger: RecordingLogger;
  let idGenerator: SequentialIdGenerator;
  let generateNextRound: GenerateNextRound;

  beforeEach(() => {
    repository = new InMemoryTournamentRepository();
    logger = new RecordingLogger();
    idGenerator = new SequentialIdGenerator();
    generateNextRound = new GenerateNextRound(repository, logger);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("generates round 1 automatically, pairing every registered player", async () => {
    const tournament = await setUpTournamentWithPlayers(
      repository,
      logger,
      idGenerator,
      ["Ash", "Misty", "Brock", "Gary"],
    );

    const round = await generateNextRound.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
    });

    expect(round.getRoundNumber()).toBe(1);
    expect(round.getMatches()).toHaveLength(2);

    const persisted = await repository.findById(tournament.getId());
    expect(persisted!.getRounds()).toHaveLength(1);
  });

  it("generates round 1 using a provided seedOrder", async () => {
    const tournament = await setUpTournamentWithPlayers(
      repository,
      logger,
      idGenerator,
      ["Ash", "Misty"],
    );
    const [p1, p2] = tournament.getPlayers();

    const round = await generateNextRound.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
      seedOrder: [p1.getId(), p2.getId()],
    });

    expect(round.getMatches()[0].getPlayer1Id()).toBe(p1.getId());
    expect(round.getMatches()[0].getPlayer2Id()).toBe(p2.getId());
  });

  it("persists the round-1 random draw as the player order used for pairing", async () => {
    const tournament = await setUpTournamentWithPlayers(
      repository,
      logger,
      idGenerator,
      ["Ash", "Misty", "Brock", "Gary"],
    );
    vi.spyOn(Math, "random").mockReturnValue(0);

    const round1 = await generateNextRound.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
    });

    const persisted = (await repository.findById(tournament.getId()))!;
    expect(persisted.getPlayers().map((p) => p.getId())).toEqual([
      "id-3",
      "id-4",
      "id-5",
      "id-2",
    ]);
    expect(pairingsOf(round1)).toEqual([
      ["id-3", "id-4"],
      ["id-5", "id-2"],
    ]);
  });

  it("reorders the players to an explicit seedOrder so it breaks later ties", async () => {
    const tournament = await setUpTournamentWithPlayers(
      repository,
      logger,
      idGenerator,
      ["Ash", "Misty", "Brock", "Gary"],
    );

    const round1 = await generateNextRound.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
      seedOrder: ["id-3", "id-2", "id-5", "id-4"],
    });

    const persisted = (await repository.findById(tournament.getId()))!;
    expect(persisted.getPlayers().map((p) => p.getId())).toEqual([
      "id-3",
      "id-2",
      "id-5",
      "id-4",
    ]);
    expect(pairingsOf(round1)).toEqual([
      ["id-3", "id-2"],
      ["id-5", "id-4"],
    ]);
  });

  it("leaves the player order untouched when round 1 is built from manual pairings", async () => {
    const tournament = await setUpTournamentWithPlayers(
      repository,
      logger,
      idGenerator,
      ["Ash", "Misty", "Brock", "Gary"],
    );
    const [p1, p2, p3, p4] = tournament.getPlayers();

    await generateNextRound.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
      manualPairings: [
        { player1Id: p1.getId(), player2Id: p2.getId() },
        { player1Id: p3.getId(), player2Id: p4.getId() },
      ],
    });

    const persisted = (await repository.findById(tournament.getId()))!;
    expect(persisted.getPlayers().map((p) => p.getId())).toEqual([
      "id-2",
      "id-3",
      "id-4",
      "id-5",
    ]);
  });

  it("pairs fully-tied players in round 2 according to the persisted round-1 draw", async () => {
    const tournament = await setUpTournamentWithPlayers(
      repository,
      logger,
      idGenerator,
      ["Ash", "Misty", "Brock", "Gary", "May", "Max"],
    );
    vi.spyOn(Math, "random").mockReturnValue(0);

    const round1 = await generateNextRound.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
    });
    expect(pairingsOf(round1)).toEqual([
      ["id-3", "id-4"],
      ["id-5", "id-6"],
      ["id-7", "id-2"],
    ]);

    await reportPlayer1WinsAndComplete(
      repository,
      logger,
      tournament.getId(),
      1,
    );

    const round2 = await generateNextRound.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
    });

    // The three winners (id-3, id-5, id-7) are fully tied on every
    // tiebreaker, so the persisted draw order decides: id-3 vs id-5, and
    // id-7 downfloats against the first 0-point player.
    expect(pairingsOf(round2)).toEqual([
      ["id-3", "id-5"],
      ["id-7", "id-4"],
      ["id-6", "id-2"],
    ]);
  });

  it("generates round 1 from manual pairings instead of automatically", async () => {
    const tournament = await setUpTournamentWithPlayers(
      repository,
      logger,
      idGenerator,
      ["Ash", "Misty"],
    );
    const [p1, p2] = tournament.getPlayers();

    const round = await generateNextRound.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
      manualPairings: [{ player1Id: p2.getId(), player2Id: p1.getId() }],
    });

    expect(round.getMatches()[0].getPlayer1Id()).toBe(p2.getId());
    expect(round.getMatches()[0].getPlayer2Id()).toBe(p1.getId());
  });

  it("throws if both manualPairings and seedOrder are given", async () => {
    const tournament = await setUpTournamentWithPlayers(
      repository,
      logger,
      idGenerator,
      ["Ash", "Misty"],
    );
    const [p1, p2] = tournament.getPlayers();

    await expect(
      generateNextRound.execute({
        tournamentId: tournament.getId(),
        requestingUserId: "u1",
        seedOrder: [p1.getId(), p2.getId()],
        manualPairings: [{ player1Id: p1.getId(), player2Id: p2.getId() }],
      }),
    ).rejects.toThrow("Provide either manualPairings or seedOrder, not both");
  });

  it("throws if seedOrder is given for a round other than round 1", async () => {
    const tournament = await setUpTournamentWithPlayers(
      repository,
      logger,
      idGenerator,
      ["Ash", "Misty"],
    );
    await generateNextRound.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
    });
    const updated = (await repository.findById(tournament.getId()))!;
    await completeRoundWithArbitraryResults(repository, updated, 1);

    const [p1, p2] = tournament.getPlayers();
    await expect(
      generateNextRound.execute({
        tournamentId: tournament.getId(),
        requestingUserId: "u1",
        seedOrder: [p1.getId(), p2.getId()],
      }),
    ).rejects.toThrow("seedOrder is only applicable when generating round 1");
  });

  it("generates round 2 automatically once round 1 is completed", async () => {
    const tournament = await setUpTournamentWithPlayers(
      repository,
      logger,
      idGenerator,
      ["Ash", "Misty", "Brock", "Gary"],
    );
    await generateNextRound.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
    });
    const afterRound1 = (await repository.findById(tournament.getId()))!;
    await completeRoundWithArbitraryResults(repository, afterRound1, 1);

    const round2 = await generateNextRound.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
    });

    expect(round2.getRoundNumber()).toBe(2);
    const persisted = await repository.findById(tournament.getId());
    expect(persisted!.getRounds()).toHaveLength(2);
  });

  it("generates round 2 from manual pairings (e.g. reproducing a real event for an audit)", async () => {
    const tournament = await setUpTournamentWithPlayers(
      repository,
      logger,
      idGenerator,
      ["Ash", "Misty"],
    );
    await generateNextRound.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
    });
    const afterRound1 = (await repository.findById(tournament.getId()))!;
    await completeRoundWithArbitraryResults(repository, afterRound1, 1);
    const [p1, p2] = tournament.getPlayers();

    const round2 = await generateNextRound.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
      manualPairings: [{ player1Id: p1.getId(), player2Id: p2.getId() }],
    });

    expect(round2.getRoundNumber()).toBe(2);
  });

  it("propagates the domain error when trying to add a round before the previous one is completed", async () => {
    const tournament = await setUpTournamentWithPlayers(
      repository,
      logger,
      idGenerator,
      ["Ash", "Misty"],
    );
    await generateNextRound.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
    });

    await expect(
      generateNextRound.execute({
        tournamentId: tournament.getId(),
        requestingUserId: "u1",
      }),
    ).rejects.toThrow("must be completed before adding a new round");
  });

  it("throws if the requesting user is not the tournament owner", async () => {
    const tournament = await setUpTournamentWithPlayers(
      repository,
      logger,
      idGenerator,
      ["Ash", "Misty"],
    );

    await expect(
      generateNextRound.execute({
        tournamentId: tournament.getId(),
        requestingUserId: "u2",
      }),
    ).rejects.toThrow(TournamentNotOwnedError);
  });

  it("logs the round generation with the mode used", async () => {
    const tournament = await setUpTournamentWithPlayers(
      repository,
      logger,
      idGenerator,
      ["Ash", "Misty"],
    );
    const logCountBeforeGeneratingRound = logger.infoLogs.length;

    await generateNextRound.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
    });

    expect(logger.infoLogs).toHaveLength(logCountBeforeGeneratingRound + 1);
    const roundGeneratedLog = logger.infoLogs[logger.infoLogs.length - 1];
    expect(roundGeneratedLog.message).toBe("Round generated");
    expect(roundGeneratedLog.context).toMatchObject({
      roundNumber: 1,
      mode: "automatic",
      matchCount: 1,
    });
  });
});
