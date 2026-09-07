import { Tournament } from "../../domain/entities/Tournament";
import { TournamentRepository } from "../ports/TournamentRepository";

export interface ListTournamentsCommand {
  requestingUserId: string;
  /** 1-based page number. Values outside [1, totalPages] are clamped. */
  page: number;
  pageSize: number;
}

export interface ListTournamentsResult {
  tournaments: Tournament[];
  /** Total tournaments owned by the user, across all pages. */
  total: number;
  /** The page actually served (after clamping). */
  page: number;
  totalPages: number;
}

/**
 * Lists the tournaments owned by the requesting user, one page at a time.
 * Unlike the other use-cases, there's no single tournament to check ownership
 * against — the ownerId filter IS the authorization here. The count is
 * returned alongside the page so the caller can render total pages and an
 * accurate "X torneos" count.
 */
export class ListTournaments {
  constructor(private readonly tournamentRepository: TournamentRepository) {}

  async execute(
    command: ListTournamentsCommand,
  ): Promise<ListTournamentsResult> {
    if (!Number.isFinite(command.pageSize) || command.pageSize <= 0) {
      throw new Error("pageSize must be a positive number");
    }

    const total = await this.tournamentRepository.countByOwnerId(
      command.requestingUserId,
    );
    const totalPages = Math.max(1, Math.ceil(total / command.pageSize));
    const rawPage = Number.isFinite(command.page)
      ? Math.floor(command.page)
      : 1;
    const page = Math.min(Math.max(1, rawPage), totalPages);

    const tournaments = await this.tournamentRepository.findByOwnerId(
      command.requestingUserId,
      {
        limit: command.pageSize,
        offset: (page - 1) * command.pageSize,
      },
    );

    return { tournaments, total, page, totalPages };
  }
}
