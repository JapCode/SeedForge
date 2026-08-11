import { describe, it, expect, beforeEach } from "vitest";
import { CreateTournament } from "../CreateTournament";
import { GetTournament } from "../GetTournament";
import { TournamentNotOwnedError } from "../shared/loadOwnedTournament";
import {
  InMemoryTournamentRepository,
  RecordingLogger,
  SequentialIdGenerator,
} from "./fakes";

describe("GetTournament", () => {
  let repository: InMemoryTournamentRepository;
  let logger: RecordingLogger;
  let idGenerator: SequentialIdGenerator;
  let createTournament: CreateTournament;
  let getTournament: GetTournament;

  beforeEach(() => {
    repository = new InMemoryTournamentRepository();
    logger = new RecordingLogger();
    idGenerator = new SequentialIdGenerator();
    createTournament = new CreateTournament(repository, idGenerator, logger);
    getTournament = new GetTournament(repository);
  });

  it("returns the tournament for its owner", async () => {
    const created = await createTournament.execute({
      ownerId: "u1",
      name: "Cup",
      totalSwissRounds: 3,
    });

    const result = await getTournament.execute({
      tournamentId: created.getId(),
      requestingUserId: "u1",
    });

    expect(result.getId()).toBe(created.getId());
  });

  it("throws if the requesting user is not the owner", async () => {
    const created = await createTournament.execute({
      ownerId: "u1",
      name: "Cup",
      totalSwissRounds: 3,
    });

    await expect(
      getTournament.execute({
        tournamentId: created.getId(),
        requestingUserId: "someone-else",
      }),
    ).rejects.toThrow(TournamentNotOwnedError);
  });

  it("throws if the tournament does not exist", async () => {
    await expect(
      getTournament.execute({
        tournamentId: "not-real",
        requestingUserId: "u1",
      }),
    ).rejects.toThrow();
  });
});
