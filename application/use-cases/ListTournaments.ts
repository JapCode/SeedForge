import { Tournament } from "../../domain/entities/Tournament";
import { TournamentRepository } from "../ports/TournamentRepository";

export interface ListTournamentsCommand {
  requestingUserId: string;
}

/**
 * Lists every tournament owned by the requesting user. Unlike the other
 * use-cases, there's no single tournament to check ownership against —
 * the ownerId filter IS the authorization here.
 */
export class ListTournaments {
  constructor(private readonly tournamentRepository: TournamentRepository) {}

  async execute(command: ListTournamentsCommand): Promise<Tournament[]> {
    return this.tournamentRepository.findByOwnerId(command.requestingUserId);
  }
}
