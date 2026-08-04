import { describe, it, expect, beforeEach } from "vitest";
import { CreateTournament } from "../CreateTournament";
import { ShareTournament } from "../ShareTournament";
import { GetTournamentByShareToken } from "../GetTournamentByShareToken";
import {
  InMemoryTournamentRepository,
  RecordingLogger,
  SequentialIdGenerator,
} from "./fakes";

describe("GetTournamentByShareToken", () => {
  let repository: InMemoryTournamentRepository;
  let logger: RecordingLogger;
  let idGenerator: SequentialIdGenerator;
  let createTournament: CreateTournament;
  let shareTournament: ShareTournament;
  let getTournamentByShareToken: GetTournamentByShareToken;

  beforeEach(() => {
    repository = new InMemoryTournamentRepository();
    logger = new RecordingLogger();
    idGenerator = new SequentialIdGenerator();
    createTournament = new CreateTournament(repository, idGenerator, logger);
    shareTournament = new ShareTournament(repository, idGenerator, logger);
    getTournamentByShareToken = new GetTournamentByShareToken(repository);
  });

  it("resolves the tournament for a valid share token, with no ownership required", async () => {
    const tournament = await createTournament.execute({
      ownerId: "u1",
      name: "Cup",
      totalSwissRounds: 1,
    });
    const token = await shareTournament.execute({
      tournamentId: tournament.getId(),
      requestingUserId: "u1",
    });

    const resolved = await getTournamentByShareToken.execute({ token });

    expect(resolved.getId()).toBe(tournament.getId());
  });

  it("throws if the token does not match any tournament", async () => {
    await expect(
      getTournamentByShareToken.execute({ token: "does-not-exist" }),
    ).rejects.toThrow("No tournament found for share token");
  });

  it("throws for a tournament that was never shared", async () => {
    await createTournament.execute({
      ownerId: "u1",
      name: "Cup",
      totalSwissRounds: 1,
    });

    await expect(
      getTournamentByShareToken.execute({ token: "id-1" }),
    ).rejects.toThrow("No tournament found for share token");
  });
});
