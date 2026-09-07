import {
  Tournament,
  TopCutSize,
  PairingMode,
} from "../../domain/entities/Tournament";
import { TournamentRuleset } from "../../domain/value-objects/TournamentRuleset";
import { TournamentRepository } from "../ports/TournamentRepository";
import { IdGenerator } from "../ports/IdGenerator";
import { Logger } from "../ports/Logger";

export interface CreateTournamentCommand {
  ownerId: string;
  name: string;
  totalSwissRounds: number;
  topCutSize?: TopCutSize;
  /**
   * How rounds are paired. "manual" is the audit mode: round 1 is built from
   * organizer-provided pairings, later rounds pair automatically. Defaults to
   * "automatic".
   */
  pairingMode?: PairingMode;
  /** Opt into the pre-July-2025 ruleset (draws allowed). Defaults to the current no-draws ruleset. */
  useLegacyRuleset?: boolean;
}

export class CreateTournament {
  constructor(
    private readonly tournamentRepository: TournamentRepository,
    private readonly idGenerator: IdGenerator,
    private readonly logger: Logger,
  ) {}

  async execute(command: CreateTournamentCommand): Promise<Tournament> {
    const tournament = Tournament.create({
      id: this.idGenerator.generate(),
      ownerId: command.ownerId,
      name: command.name,
      totalSwissRounds: command.totalSwissRounds,
      topCutSize: command.topCutSize ?? null,
      pairingMode: command.pairingMode ?? "automatic",
      ruleset: command.useLegacyRuleset
        ? TournamentRuleset.legacy()
        : undefined,
    });

    await this.tournamentRepository.save(tournament);

    this.logger.info("Tournament created", {
      tournamentId: tournament.getId(),
      ownerId: command.ownerId,
      totalSwissRounds: command.totalSwissRounds,
      topCutSize: tournament.getTopCutSize(),
      pairingMode: tournament.getPairingMode(),
    });

    return tournament;
  }
}
