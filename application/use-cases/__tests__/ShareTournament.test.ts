import { describe, it, expect, beforeEach } from "vitest";
import { CreateTournament } from "../CreateTournament";
import { ShareTournament } from "../ShareTournament";
import { TournamentNotOwnedError } from "../shared/loadOwnedTournament";
import {
  InMemoryTournamentRepository,
  RecordingLogger,
  SequentialIdGenerator,
} from "./fakes";

describe("ShareTournament", () => {
  let repository: InMemoryTournamentRepository;
  let logger: RecordingLogger;
  let idGenerator: SequentialIdGenerator;
  let createTournament: CreateTournament;
  let shareTournament: ShareTournament;

  beforeEach(() => {
    repository = new InMemoryTournamentRepository();
    logger = new RecordingLogger();
    idGenerator = new SequentialIdGenerator();
    createTournament = new CreateTournament(repository, idGenerator, logger);
    shareTournament = new ShareTournament(repository, idGenerator, logger);
  });

  it("generates a share token and persists it on the tournament", async () => {
    const tournament = await createTournament.execute({
      ownerId: "u1",
      name: "Cup",
      totalSwissRounds: 1,
    });

    const token = await shareTournament.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
    });

    expect(token).toBeTruthy();
    const persisted = await repository.findById(tournament.getId());
    expect(persisted!.getShareToken()).toBe(token);
  });

  it("returns the same token on subsequent calls instead of generating a new one", async () => {
    const tournament = await createTournament.execute({
      ownerId: "u1",
      name: "Cup",
      totalSwissRounds: 1,
    });

    const firstToken = await shareTournament.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
    });
    const secondToken = await shareTournament.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
    });

    expect(secondToken).toBe(firstToken);
  });

  it("throws if the requesting user is not the tournament owner", async () => {
    const tournament = await createTournament.execute({
      ownerId: "u1",
      name: "Cup",
      totalSwissRounds: 1,
    });

    await expect(
      shareTournament.execute({
        tournamentId: tournament.getId(),
        requestingUserId: "someone-else",
      }),
    ).rejects.toThrow(TournamentNotOwnedError);
  });

  it("logs the share link creation only the first time", async () => {
    const tournament = await createTournament.execute({
      ownerId: "u1",
      name: "Cup",
      totalSwissRounds: 1,
    });
    const logCountBefore = logger.infoLogs.length;

    await shareTournament.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
    });
    await shareTournament.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
    });

    expect(logger.infoLogs).toHaveLength(logCountBefore + 1);
    expect(logger.infoLogs[logger.infoLogs.length - 1].message).toBe(
      "Tournament share link created",
    );
  });
});
