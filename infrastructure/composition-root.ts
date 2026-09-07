import "server-only";

import { db } from "./db/drizzle/client";
import { DrizzleTournamentRepository } from "./db/repositories/DrizzleTournamentRepository";
import { DrizzleTopCutBracketRepository } from "./db/repositories/DrizzleTopCutBracketRepository";
import { PinoLogger } from "./logging/PinoLogger";
import { CryptoIdGenerator } from "./ids/CryptoIdGenerator";

import { CreateTournament } from "../application/use-cases/CreateTournament";
import { ListTournaments } from "../application/use-cases/ListTournaments";
import { GetTournament } from "../application/use-cases/GetTournament";
import { GetTopCutBracket } from "../application/use-cases/GetTopCutBracket";
import { RegisterPlayer } from "../application/use-cases/RegisterPlayer";
import { UnregisterPlayer } from "../application/use-cases/UnregisterPlayer";
import { StartTournament } from "../application/use-cases/StartTournament";
import { GenerateNextRound } from "../application/use-cases/GenerateNextRound";
import { RegisterMatchResult } from "../application/use-cases/RegisterMatchResult";
import { RevertMatchResult } from "../application/use-cases/RevertMatchResult";
import { CompleteRound } from "../application/use-cases/CompleteRound";
import { RevertRoundCompletion } from "../application/use-cases/RevertRoundCompletion";
import { RevertRoundForEdit } from "../application/use-cases/RevertRoundForEdit";
import { AdvanceToTopCut } from "../application/use-cases/AdvanceToTopCut";
import { ReportBracketMatchWinner } from "../application/use-cases/ReportBracketMatchWinner";
import { RevertBracketMatchWinner } from "../application/use-cases/RevertBracketMatchWinner";
import { CompleteTournament } from "../application/use-cases/CompleteTournament";
import { RevertTournamentCompletion } from "../application/use-cases/RevertTournamentCompletion";
import { DropPlayer } from "../application/use-cases/DropPlayer";
import { ShareTournament } from "../application/use-cases/ShareTournament";
import { GetTournamentByShareToken } from "../application/use-cases/GetTournamentByShareToken";
import { GetTopCutBracketByShareToken } from "../application/use-cases/GetTopCutBracketByShareToken";

// "server-only" (above) makes any accidental import of this file from a
// Client Component fail the build loudly, instead of silently leaking
// DB credentials into the browser bundle.

const tournamentRepository = new DrizzleTournamentRepository(db);
const topCutBracketRepository = new DrizzleTopCutBracketRepository(db);
const logger = new PinoLogger();
const idGenerator = new CryptoIdGenerator();

export const useCases = {
  createTournament: new CreateTournament(
    tournamentRepository,
    idGenerator,
    logger,
  ),
  listTournaments: new ListTournaments(tournamentRepository),
  getTournament: new GetTournament(tournamentRepository),
  getTopCutBracket: new GetTopCutBracket(
    tournamentRepository,
    topCutBracketRepository,
  ),
  registerPlayer: new RegisterPlayer(tournamentRepository, idGenerator, logger),
  unregisterPlayer: new UnregisterPlayer(tournamentRepository, logger),
  startTournament: new StartTournament(tournamentRepository, logger),
  generateNextRound: new GenerateNextRound(tournamentRepository, logger),
  registerMatchResult: new RegisterMatchResult(tournamentRepository, logger),
  revertMatchResult: new RevertMatchResult(tournamentRepository, logger),
  completeRound: new CompleteRound(tournamentRepository, logger),
  revertRoundCompletion: new RevertRoundCompletion(
    tournamentRepository,
    logger,
  ),
  revertRoundForEdit: new RevertRoundForEdit(tournamentRepository, logger),
  advanceToTopCut: new AdvanceToTopCut(
    tournamentRepository,
    topCutBracketRepository,
    logger,
  ),
  reportBracketMatchWinner: new ReportBracketMatchWinner(
    tournamentRepository,
    topCutBracketRepository,
    logger,
  ),
  revertBracketMatchWinner: new RevertBracketMatchWinner(
    tournamentRepository,
    topCutBracketRepository,
    logger,
  ),
  completeTournament: new CompleteTournament(tournamentRepository, logger),
  revertTournamentCompletion: new RevertTournamentCompletion(
    tournamentRepository,
    logger,
  ),
  dropPlayer: new DropPlayer(tournamentRepository, logger),
  shareTournament: new ShareTournament(
    tournamentRepository,
    idGenerator,
    logger,
  ),
  getTournamentByShareToken: new GetTournamentByShareToken(
    tournamentRepository,
  ),
  getTopCutBracketByShareToken: new GetTopCutBracketByShareToken(
    tournamentRepository,
    topCutBracketRepository,
  ),
};
