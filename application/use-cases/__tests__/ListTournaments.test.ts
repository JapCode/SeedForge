import { describe, it, expect, beforeEach } from "vitest";
import { CreateTournament } from "../CreateTournament";
import { ListTournaments } from "../ListTournaments";
import {
  InMemoryTournamentRepository,
  RecordingLogger,
  SequentialIdGenerator,
} from "./fakes";

describe("ListTournaments", () => {
  let repository: InMemoryTournamentRepository;
  let logger: RecordingLogger;
  let idGenerator: SequentialIdGenerator;
  let createTournament: CreateTournament;
  let listTournaments: ListTournaments;

  beforeEach(() => {
    repository = new InMemoryTournamentRepository();
    logger = new RecordingLogger();
    idGenerator = new SequentialIdGenerator();
    createTournament = new CreateTournament(repository, idGenerator, logger);
    listTournaments = new ListTournaments(repository);
  });

  it("returns only tournaments owned by the requesting user", async () => {
    await createTournament.execute({
      ownerId: "u1",
      name: "Cup A",
      totalSwissRounds: 3,
    });
    await createTournament.execute({
      ownerId: "u1",
      name: "Cup B",
      totalSwissRounds: 3,
    });
    await createTournament.execute({
      ownerId: "u2",
      name: "Someone else's Cup",
      totalSwissRounds: 3,
    });

    const result = await listTournaments.execute({ requestingUserId: "u1" });

    expect(result).toHaveLength(2);
    expect(result.map((t) => t.getName()).sort()).toEqual(["Cup A", "Cup B"]);
  });

  it("returns an empty array when the user has no tournaments", async () => {
    const result = await listTournaments.execute({ requestingUserId: "u1" });
    expect(result).toEqual([]);
  });
});
