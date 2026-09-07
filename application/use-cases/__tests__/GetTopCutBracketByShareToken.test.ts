import { describe, it, expect, beforeEach } from "vitest";
import { CreateTournament } from "../CreateTournament";
import { RegisterPlayer } from "../RegisterPlayer";
import { StartTournament } from "../StartTournament";
import { GenerateNextRound } from "../GenerateNextRound";
import { RegisterMatchResult } from "../RegisterMatchResult";
import { CompleteRound } from "../CompleteRound";
import { AdvanceToTopCut } from "../AdvanceToTopCut";
import { ShareTournament } from "../ShareTournament";
import { GetTopCutBracketByShareToken } from "../GetTopCutBracketByShareToken";
import {
  InMemoryTournamentRepository,
  InMemoryTopCutBracketRepository,
  RecordingLogger,
  SequentialIdGenerator,
} from "./fakes";

describe("GetTopCutBracketByShareToken", () => {
  let tournamentRepository: InMemoryTournamentRepository;
  let bracketRepository: InMemoryTopCutBracketRepository;
  let logger: RecordingLogger;
  let idGenerator: SequentialIdGenerator;
  let createTournament: CreateTournament;
  let registerPlayer: RegisterPlayer;
  let startTournament: StartTournament;
  let generateNextRound: GenerateNextRound;
  let registerMatchResult: RegisterMatchResult;
  let completeRound: CompleteRound;
  let advanceToTopCut: AdvanceToTopCut;
  let shareTournament: ShareTournament;
  let getTopCutBracketByShareToken: GetTopCutBracketByShareToken;

  beforeEach(() => {
    tournamentRepository = new InMemoryTournamentRepository();
    bracketRepository = new InMemoryTopCutBracketRepository();
    logger = new RecordingLogger();
    idGenerator = new SequentialIdGenerator();
    createTournament = new CreateTournament(
      tournamentRepository,
      idGenerator,
      logger,
    );
    registerPlayer = new RegisterPlayer(
      tournamentRepository,
      idGenerator,
      logger,
    );
    startTournament = new StartTournament(tournamentRepository, logger);
    generateNextRound = new GenerateNextRound(tournamentRepository, logger);
    registerMatchResult = new RegisterMatchResult(tournamentRepository, logger);
    completeRound = new CompleteRound(tournamentRepository, logger);
    advanceToTopCut = new AdvanceToTopCut(
      tournamentRepository,
      bracketRepository,
      logger,
    );
    shareTournament = new ShareTournament(
      tournamentRepository,
      idGenerator,
      logger,
    );
    getTopCutBracketByShareToken = new GetTopCutBracketByShareToken(
      tournamentRepository,
      bracketRepository,
    );
  });

  /** Creates a tournament in the top cut phase and returns its share token. */
  async function setUpSharedTournamentInTopCut(): Promise<string> {
    const created = await createTournament.execute({
      ownerId: "u1",
      name: "Cup",
      totalSwissRounds: 1,
      topCutSize: 4,
    });
    for (const name of ["Ash", "Misty", "Brock", "Gary"]) {
      await registerPlayer.execute({
        tournamentId: created.getId(),
        requestingUserId: "u1",
        playerName: name,
      });
    }
    await startTournament.execute({
      tournamentId: created.getId(),
      requestingUserId: "u1",
    });
    await generateNextRound.execute({
      tournamentId: created.getId(),
      requestingUserId: "u1",
    });

    const withRound1 = (await tournamentRepository.findById(created.getId()))!;
    for (const match of withRound1.getRound(1).getMatches()) {
      await registerMatchResult.execute({
        tournamentId: created.getId(),
        requestingUserId: "u1",
        roundNumber: 1,
        matchId: match.getId(),
        result: {
          type: "win",
          winnerId: match.getPlayer1Id(),
          winnerGames: 2,
          loserGames: 0,
        },
      });
    }
    await completeRound.execute({
      tournamentId: created.getId(),
      requestingUserId: "u1",
      roundNumber: 1,
    });
    await advanceToTopCut.execute({
      tournamentId: created.getId(),
      requestingUserId: "u1",
    });

    return shareTournament.execute({
      tournamentId: created.getId(),
      requestingUserId: "u1",
    });
  }

  it("returns the persisted bracket for a shared tournament in the top cut phase, with no ownership required", async () => {
    const token = await setUpSharedTournamentInTopCut();

    const bracket = await getTopCutBracketByShareToken.execute({ token });

    expect(bracket).not.toBeNull();
    expect(bracket!.getSize()).toBe(4);
  });

  it("returns null when no bracket has been generated yet", async () => {
    const created = await createTournament.execute({
      ownerId: "u1",
      name: "Cup",
      totalSwissRounds: 1,
      topCutSize: 4,
    });
    const token = await shareTournament.execute({
      tournamentId: created.getId(),
      requestingUserId: "u1",
    });

    const bracket = await getTopCutBracketByShareToken.execute({ token });

    expect(bracket).toBeNull();
  });

  it("throws if the token does not match any tournament", async () => {
    await expect(
      getTopCutBracketByShareToken.execute({ token: "does-not-exist" }),
    ).rejects.toThrow("No tournament found for share token");
  });
});
