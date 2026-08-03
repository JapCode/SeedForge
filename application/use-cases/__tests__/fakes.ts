import { Tournament, TournamentId } from "../../../domain/entities/Tournament";
import { TopCutBracket } from "../../../domain/entities/TopCutBracket";
import { TournamentRepository } from "../../ports/TournamentRepository";
import { TopCutBracketRepository } from "../../ports/TopCutBracketRepository";
import { Logger } from "../../ports/Logger";
import { IdGenerator } from "../../ports/IdGenerator";

export class InMemoryTournamentRepository implements TournamentRepository {
  private readonly tournaments = new Map<TournamentId, Tournament>();

  async findById(id: TournamentId): Promise<Tournament | null> {
    return this.tournaments.get(id) ?? null;
  }

  async save(tournament: Tournament): Promise<void> {
    this.tournaments.set(tournament.getId(), tournament);
  }
}

export class InMemoryTopCutBracketRepository implements TopCutBracketRepository {
  private readonly brackets = new Map<TournamentId, TopCutBracket>();

  async findByTournamentId(
    tournamentId: TournamentId,
  ): Promise<TopCutBracket | null> {
    return this.brackets.get(tournamentId) ?? null;
  }

  async save(
    tournamentId: TournamentId,
    bracket: TopCutBracket,
  ): Promise<void> {
    this.brackets.set(tournamentId, bracket);
  }
}

export class RecordingLogger implements Logger {
  readonly infoLogs: Array<{
    message: string;
    context?: Record<string, unknown>;
  }> = [];
  readonly warnLogs: Array<{
    message: string;
    context?: Record<string, unknown>;
  }> = [];
  readonly errorLogs: Array<{
    message: string;
    context?: Record<string, unknown>;
  }> = [];

  info(message: string, context?: Record<string, unknown>): void {
    this.infoLogs.push({ message, context });
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.warnLogs.push({ message, context });
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.errorLogs.push({ message, context });
  }
}

/** Generates predictable, sequential ids: "id-1", "id-2", ... */
export class SequentialIdGenerator implements IdGenerator {
  private counter = 0;

  generate(): string {
    this.counter += 1;
    return `id-${this.counter}`;
  }
}
