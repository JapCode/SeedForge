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

  async findByShareToken(token: string): Promise<Tournament | null> {
    for (const tournament of this.tournaments.values()) {
      if (tournament.getShareToken() === token) {
        return tournament;
      }
    }
    return null;
  }

  async findByOwnerId(ownerId: string): Promise<Tournament[]> {
    return [...this.tournaments.values()].filter(
      (t) => t.getOwnerId() === ownerId,
    );
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

interface RecordedLog {
  message: string;
  context?: Record<string, unknown>;
}

export class RecordingLogger implements Logger {
  readonly infoLogs: RecordedLog[] = [];
  readonly warnLogs: RecordedLog[] = [];
  readonly errorLogs: RecordedLog[] = [];

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

export class SequentialIdGenerator implements IdGenerator {
  private counter = 0;

  generate(): string {
    this.counter += 1;
    return `id-${this.counter}`;
  }
}
