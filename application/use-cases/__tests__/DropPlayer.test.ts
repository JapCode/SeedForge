import { describe, it, expect, beforeEach } from "vitest";
import { CreateTournament } from "../CreateTournament";
import { RegisterPlayer } from "../RegisterPlayer";
import { DropPlayer } from "../DropPlayer";
import { TournamentNotOwnedError } from "../shared/loadOwnedTournament";
import {
  InMemoryTournamentRepository,
  RecordingLogger,
  SequentialIdGenerator,
} from "./fakes";

describe("DropPlayer", () => {
  let repository: InMemoryTournamentRepository;
  let logger: RecordingLogger;
  let idGenerator: SequentialIdGenerator;
  let createTournament: CreateTournament;
  let registerPlayer: RegisterPlayer;
  let dropPlayer: DropPlayer;

  beforeEach(() => {
    repository = new InMemoryTournamentRepository();
    logger = new RecordingLogger();
    idGenerator = new SequentialIdGenerator();
    createTournament = new CreateTournament(repository, idGenerator, logger);
    registerPlayer = new RegisterPlayer(repository, idGenerator, logger);
    dropPlayer = new DropPlayer(repository, logger);
  });

  it("marks a player as dropped", async () => {
    const tournament = await createTournament.execute({
      ownerId: "u1",
      name: "Cup",
      totalSwissRounds: 1,
    });
    await registerPlayer.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
      playerName: "Ash",
    });
    const playerId = (await repository.findById(tournament.getId()))!
      .getPlayers()[0]
      .getId();

    await dropPlayer.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
      playerId,
    });

    const persisted = await repository.findById(tournament.getId());
    expect(persisted!.getPlayer(playerId).isDropped()).toBe(true);
  });

  it("excludes the dropped player from getActivePlayers", async () => {
    const tournament = await createTournament.execute({
      ownerId: "u1",
      name: "Cup",
      totalSwissRounds: 1,
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
    const [ash] = (await repository.findById(tournament.getId()))!.getPlayers();

    await dropPlayer.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
      playerId: ash.getId(),
    });

    const persisted = await repository.findById(tournament.getId());
    expect(persisted!.getActivePlayers().map((p) => p.getId())).not.toContain(
      ash.getId(),
    );
    expect(persisted!.getPlayers().map((p) => p.getId())).toContain(
      ash.getId(),
    );
  });

  it("propagates the domain error when the player does not exist", async () => {
    const tournament = await createTournament.execute({
      ownerId: "u1",
      name: "Cup",
      totalSwissRounds: 1,
    });

    await expect(
      dropPlayer.execute({
        tournamentId: tournament.getId(),
        requestingUserId: "u1",
        playerId: "not-a-real-player",
      }),
    ).rejects.toThrow("not found in tournament");
  });

  it("throws if the requesting user is not the tournament owner", async () => {
    const tournament = await createTournament.execute({
      ownerId: "u1",
      name: "Cup",
      totalSwissRounds: 1,
    });
    await registerPlayer.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
      playerName: "Ash",
    });
    const playerId = (await repository.findById(tournament.getId()))!
      .getPlayers()[0]
      .getId();

    await expect(
      dropPlayer.execute({
        tournamentId: tournament.getId(),
        requestingUserId: "someone-else",
        playerId,
      }),
    ).rejects.toThrow(TournamentNotOwnedError);
  });

  it("logs the dropped player", async () => {
    const tournament = await createTournament.execute({
      ownerId: "u1",
      name: "Cup",
      totalSwissRounds: 1,
    });
    await registerPlayer.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
      playerName: "Ash",
    });
    const playerId = (await repository.findById(tournament.getId()))!
      .getPlayers()[0]
      .getId();
    const logCountBefore = logger.infoLogs.length;

    await dropPlayer.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
      playerId,
    });

    expect(logger.infoLogs).toHaveLength(logCountBefore + 1);
    const log = logger.infoLogs[logger.infoLogs.length - 1];
    expect(log.message).toBe("Player dropped");
    expect(log.context).toMatchObject({ playerId });
  });
});
