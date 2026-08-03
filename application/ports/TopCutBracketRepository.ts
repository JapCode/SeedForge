import { TopCutBracket } from "../../domain/entities/TopCutBracket";
import { TournamentId } from "../../domain/entities/Tournament";

export interface TopCutBracketRepository {
  findByTournamentId(tournamentId: TournamentId): Promise<TopCutBracket | null>;
  save(tournamentId: TournamentId, bracket: TopCutBracket): Promise<void>;
}
