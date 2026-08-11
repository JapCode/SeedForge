import { Tournament, TournamentId } from "../../domain/entities/Tournament";
import { TournamentRepository } from "../ports/TournamentRepository";
import { loadOwnedTournament } from "./shared/loadOwnedTournament";

export interface GetTournamentCommand {
  tournamentId: TournamentId;
  requestingUserId: string;
}

export class GetTournament {
  constructor(private readonly tournamentRepository: TournamentRepository) {}

  async execute(command: GetTournamentCommand): Promise<Tournament> {
    return loadOwnedTournament(
      this.tournamentRepository,
      command.tournamentId,
      command.requestingUserId,
    );
  }
}
