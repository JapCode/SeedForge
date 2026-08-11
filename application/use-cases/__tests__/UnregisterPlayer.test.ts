import { describe, it, expect, beforeEach } from "vitest";
import { CreateTournament } from "../CreateTournament";
import { RegisterPlayer } from "../RegisterPlayer";
import { StartTournament } from "../StartTournament";
import { UnregisterPlayer } from "../UnregisterPlayer";
import { TournamentNotOwnedError } from "../shared/loadOwnedTournament";
import {
  InMemoryTournamentRepository,
  RecordingLogger,
  SequentialIdGenerator,
} from "./fakes";

describe("UnregisterPlayer", () => {
  let repository: InMemoryTournamentRepository;
  let logger: RecordingLogger;
  let idGenerator: SequentialIdGenerator;
  let createTournament: CreateTournament;
  let registerPlayer: RegisterPlayer;
  let startTournament: StartTournament;
  let unregisterPlayer: UnregisterPlayer;

  beforeEach(() => {
    repository = new InMemoryTournamentRepository();
    logger = new RecordingLogger();
    idGenerator = new SequentialIdGenerator();
    createTournament = new CreateTournament(repository, idGenerator, logger);
    registerPlayer = new RegisterPlayer(repository, idGenerator, logger);
    startTournament = new StartTournament(repository, logger);
    unregisterPlayer = new UnregisterPlayer(repository, logger);
  });

  it("fully removes a player during registration", async () => {
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

    await unregisterPlayer.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
      playerId,
    });

    const persisted = await repository.findById(tournament.getId());
    expect(persisted!.getPlayers()).toHaveLength(0);
  });

  it("propagates the domain error when trying to unregister after the tournament started", async () => {
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
    const playerId = (await repository.findById(tournament.getId()))!
      .getPlayers()[0]
      .getId();
    await startTournament.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
    });

    await expect(
      unregisterPlayer.execute({
        tournamentId: tournament.getId(),
        requestingUserId: "u1",
        playerId,
      }),
    ).rejects.toThrow(
      "only be removed while the tournament is in the registration phase",
    );
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
      unregisterPlayer.execute({
        tournamentId: tournament.getId(),
        requestingUserId: "someone-else",
        playerId,
      }),
    ).rejects.toThrow(TournamentNotOwnedError);
  });
});
