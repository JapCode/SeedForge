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

    const result = await listTournaments.execute({
      requestingUserId: "u1",
      page: 1,
      pageSize: 10,
    });

    expect(result.total).toBe(2);
    expect(result.totalPages).toBe(1);
    expect(result.page).toBe(1);
    expect(result.tournaments.map((t) => t.getName()).sort()).toEqual([
      "Cup A",
      "Cup B",
    ]);
  });

  it("returns an empty page when the user has no tournaments", async () => {
    const result = await listTournaments.execute({
      requestingUserId: "u1",
      page: 1,
      pageSize: 10,
    });

    expect(result.total).toBe(0);
    expect(result.tournaments).toEqual([]);
    expect(result.totalPages).toBe(1);
    expect(result.page).toBe(1);
  });

  it("paginates the owned tournaments", async () => {
    for (let i = 1; i <= 5; i++) {
      await createTournament.execute({
        ownerId: "u1",
        name: `Cup ${i}`,
        totalSwissRounds: 3,
      });
    }

    const page1 = await listTournaments.execute({
      requestingUserId: "u1",
      page: 1,
      pageSize: 2,
    });
    const page3 = await listTournaments.execute({
      requestingUserId: "u1",
      page: 3,
      pageSize: 2,
    });

    expect(page1.tournaments.map((t) => t.getName())).toEqual([
      "Cup 1",
      "Cup 2",
    ]);
    expect(page3.tournaments.map((t) => t.getName())).toEqual(["Cup 5"]);
    expect(page1.total).toBe(5);
    expect(page1.totalPages).toBe(3);
  });

  it("clamps out-of-range pages to the last page", async () => {
    for (let i = 1; i <= 5; i++) {
      await createTournament.execute({
        ownerId: "u1",
        name: `Cup ${i}`,
        totalSwissRounds: 3,
      });
    }

    const result = await listTournaments.execute({
      requestingUserId: "u1",
      page: 99,
      pageSize: 2,
    });

    expect(result.page).toBe(3);
    expect(result.tournaments.map((t) => t.getName())).toEqual(["Cup 5"]);
  });

  it("clamps pages below 1 to the first page", async () => {
    for (let i = 1; i <= 5; i++) {
      await createTournament.execute({
        ownerId: "u1",
        name: `Cup ${i}`,
        totalSwissRounds: 3,
      });
    }

    const result = await listTournaments.execute({
      requestingUserId: "u1",
      page: 0,
      pageSize: 2,
    });

    expect(result.page).toBe(1);
    expect(result.tournaments.map((t) => t.getName())).toEqual([
      "Cup 1",
      "Cup 2",
    ]);
  });

  it("rejects a non-positive page size", async () => {
    await expect(
      listTournaments.execute({ requestingUserId: "u1", page: 1, pageSize: 0 }),
    ).rejects.toThrow("pageSize must be a positive number");
  });
});
