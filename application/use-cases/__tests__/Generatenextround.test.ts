import { describe, it, expect, beforeEach } from "vitest";
import { CreateTournament } from "../CreateTournament";
import { RegisterPlayer } from "../RegisterPlayer";
import { StartTournament } from "../StartTournament";
import { GenerateNextRound } from "../GenerateNextRound";
import { TournamentNotOwnedError } from "../shared/loadOwnedTournament";
import {
  InMemoryTournamentRepository,
  RecordingLogger,
  SequentialIdGenerator,
} from "./fakes";
import { Tournament } from "../../../domain/entities/Tournament";

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
