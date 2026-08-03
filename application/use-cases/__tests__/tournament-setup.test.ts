import { describe, it, expect, beforeEach } from "vitest";
import { CreateTournament } from "../CreateTournament";
import { RegisterPlayer } from "../RegisterPlayer";
import { StartTournament } from "../StartTournament";
import {
  TournamentNotFoundError,
  TournamentNotOwnedError,
} from "../shared/loadOwnedTournament";
import {
  InMemoryTournamentRepository,
  RecordingLogger,
  SequentialIdGenerator,
} from "./fakes";

describe("CreateTournament", () => {
  let repository: InMemoryTournamentRepository;
  let logger: RecordingLogger;
  let idGenerator: SequentialIdGenerator;
  let createTournament: CreateTournament;

  beforeEach(() => {
    repository = new InMemoryTournamentRepository();
    logger = new RecordingLogger();
    idGenerator = new SequentialIdGenerator();
    createTournament = new CreateTournament(repository, idGenerator, logger);
  });

  it("creates and persists a tournament with a generated id", async () => {
    const tournament = await createTournament.execute({
      ownerId: "u1",
      name: "Regional YCS",
      totalSwissRounds: 5,
    });

    expect(tournament.getId()).toBe("id-1");
    expect(tournament.getOwnerId()).toBe("u1");
    expect(await repository.findById("id-1")).toBe(tournament);
  });

  it("defaults to the current (no-draws) ruleset", async () => {
    const tournament = await createTournament.execute({
      ownerId: "u1",
      name: "Regional YCS",
      totalSwissRounds: 5,
    });

    expect(tournament.getRuleset().allowsDraws()).toBe(false);
  });

  it("uses the legacy ruleset when explicitly requested", async () => {
    const tournament = await createTournament.execute({
      ownerId: "u1",
      name: "Old Format Cup",
      totalSwissRounds: 5,
      useLegacyRuleset: true,
    });

    expect(tournament.getRuleset().allowsDraws()).toBe(true);
  });

  it("passes through an optional top cut size", async () => {
    const tournament = await createTournament.execute({
      ownerId: "u1",
      name: "Regional YCS",
      totalSwissRounds: 5,
      topCutSize: 8,
    });

    expect(tournament.getTopCutSize()).toBe(8);
  });

  it("logs the creation", async () => {
    await createTournament.execute({
      ownerId: "u1",
      name: "Regional YCS",
      totalSwissRounds: 5,
    });

    expect(logger.infoLogs).toHaveLength(1);
    expect(logger.infoLogs[0].message).toBe("Tournament created");
    expect(logger.infoLogs[0].context).toMatchObject({
      tournamentId: "id-1",
      ownerId: "u1",
    });
  });

  it("propagates domain validation errors (e.g. empty name)", async () => {
    await expect(
      createTournament.execute({
        ownerId: "u1",
        name: "  ",
        totalSwissRounds: 5,
      }),
    ).rejects.toThrow("Tournament name cannot be empty");
  });
});

describe("RegisterPlayer", () => {
  let repository: InMemoryTournamentRepository;
  let logger: RecordingLogger;
  let idGenerator: SequentialIdGenerator;
  let createTournament: CreateTournament;
  let registerPlayer: RegisterPlayer;

  beforeEach(() => {
    repository = new InMemoryTournamentRepository();
    logger = new RecordingLogger();
    idGenerator = new SequentialIdGenerator();
    createTournament = new CreateTournament(repository, idGenerator, logger);
    registerPlayer = new RegisterPlayer(repository, idGenerator, logger);
  });

  it("registers a player and persists the updated tournament", async () => {
    const tournament = await createTournament.execute({
      ownerId: "u1",
      name: "Cup",
      totalSwissRounds: 3,
    });

    const player = await registerPlayer.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
      playerName: "Ash Ketchum",
    });

    expect(player.getName()).toBe("Ash Ketchum");
    const persisted = await repository.findById(tournament.getId());
    expect(persisted!.getPlayers()).toHaveLength(1);
    expect(persisted!.getPlayers()[0].getId()).toBe(player.getId());
  });

  it("throws if the tournament doesn't exist", async () => {
    await expect(
      registerPlayer.execute({
        tournamentId: "missing",
        requestingUserId: "u1",
        playerName: "Ash",
      }),
    ).rejects.toThrow(TournamentNotFoundError);
  });

  it("throws if the requesting user is not the tournament owner", async () => {
    const tournament = await createTournament.execute({
      ownerId: "u1",
      name: "Cup",
      totalSwissRounds: 3,
    });

    await expect(
      registerPlayer.execute({
        tournamentId: tournament.getId(),
        requestingUserId: "u2",
        playerName: "Ash",
      }),
    ).rejects.toThrow(TournamentNotOwnedError);
  });

  it("propagates domain validation errors (e.g. registering after the tournament started)", async () => {
    const tournament = await createTournament.execute({
      ownerId: "u1",
      name: "Cup",
      totalSwissRounds: 3,
    });
    await registerPlayer.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
      playerName: "Ash",
    });
    await registerPlayer.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
      playerName: "Misty",
    });
    tournament.startSwissRounds();
    await repository.save(tournament);

    await expect(
      registerPlayer.execute({
        tournamentId: tournament.getId(),
        requestingUserId: "u1",
        playerName: "Brock",
      }),
    ).rejects.toThrow(
      "only be registered while the tournament is in the registration phase",
    );
  });
});

describe("StartTournament", () => {
  let repository: InMemoryTournamentRepository;
  let logger: RecordingLogger;
  let idGenerator: SequentialIdGenerator;
  let createTournament: CreateTournament;
  let registerPlayer: RegisterPlayer;
  let startTournament: StartTournament;

  beforeEach(() => {
    repository = new InMemoryTournamentRepository();
    logger = new RecordingLogger();
    idGenerator = new SequentialIdGenerator();
    createTournament = new CreateTournament(repository, idGenerator, logger);
    registerPlayer = new RegisterPlayer(repository, idGenerator, logger);
    startTournament = new StartTournament(repository, logger);
  });

  it("moves the tournament into the swiss phase and persists it", async () => {
    const tournament = await createTournament.execute({
      ownerId: "u1",
      name: "Cup",
      totalSwissRounds: 3,
    });
    await registerPlayer.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
      playerName: "Ash",
    });
    await registerPlayer.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
      playerName: "Misty",
    });

    await startTournament.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
    });

    const persisted = await repository.findById(tournament.getId());
    expect(persisted!.getPhase()).toBe("swiss");
  });

  it("throws if the requesting user is not the owner", async () => {
    const tournament = await createTournament.execute({
      ownerId: "u1",
      name: "Cup",
      totalSwissRounds: 3,
    });
    await registerPlayer.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
      playerName: "Ash",
    });
    await registerPlayer.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
      playerName: "Misty",
    });

    await expect(
      startTournament.execute({
        tournamentId: tournament.getId(),
        requestingUserId: "u2",
      }),
    ).rejects.toThrow(TournamentNotOwnedError);
  });

  it("propagates domain validation errors (e.g. fewer than 2 players)", async () => {
    const tournament = await createTournament.execute({
      ownerId: "u1",
      name: "Cup",
      totalSwissRounds: 3,
    });
    await registerPlayer.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
      playerName: "Ash",
    });

    await expect(
      startTournament.execute({
        tournamentId: tournament.getId(),
        requestingUserId: "u1",
      }),
    ).rejects.toThrow("At least 2 players are required");
  });
});
