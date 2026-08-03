import { Tournament, TournamentId } from "@/domain/entities/Tournament";

export interface TournamentRepository {
  findById(id: TournamentId): Promise<Tournament | null>;
  save(tournament: Tournament): Promise<void>;
}
