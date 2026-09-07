import { describe, it, expect, beforeEach } from "vitest";
import { CreateTournament } from "../CreateTournament";
import { RegisterPlayer } from "../RegisterPlayer";
import { StartTournament } from "../StartTournament";
import { GenerateNextRound } from "../GenerateNextRound";
import { RegisterMatchResult } from "../RegisterMatchResult";
import { CompleteRound } from "../CompleteRound";
import { AdvanceToTopCut } from "../AdvanceToTopCut";
import { GetTopCutBracket } from "../GetTopCutBracket";
import { TournamentNotOwnedError } from "../shared/loadOwnedTournament";
import {
  InMemoryTournamentRepository,
  InMemoryTopCutBracketRepository,
  RecordingLogger,
  SequentialIdGenerator,
} from "./fakes";

describe("GetTopCutBracket", () => {
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
  let getTopCutBracket: GetTopCutBracket;

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
    getTopCutBracket = new GetTopCutBracket(
      tournamentRepository,
      bracketRepository,
    );
  });

  async function setUpTournamentInTopCut(): Promise<string> {
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

    return created.getId();
  }

  it("returns the persisted bracket for a tournament in the top cut phase", async () => {
    const tournamentId = await setUpTournamentInTopCut();

    const bracket = await getTopCutBracket.execute({
      tournamentId,
      requestingUserId: "u1",
    });

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

    const bracket = await getTopCutBracket.execute({
      tournamentId: created.getId(),
      requestingUserId: "u1",
    });

    expect(bracket).toBeNull();
  });

  it("throws if the tournament does not exist", async () => {
    await expect(
      getTopCutBracket.execute({
        tournamentId: "missing",
        requestingUserId: "u1",
      }),
    ).rejects.toThrow("Tournament missing not found");
  });

  it("throws if the requesting user is not the tournament owner", async () => {
    const tournamentId = await setUpTournamentInTopCut();

    await expect(
      getTopCutBracket.execute({
        tournamentId,
        requestingUserId: "someone-else",
      }),
    ).rejects.toThrow(TournamentNotOwnedError);
  });
});
