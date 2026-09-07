import { Player, PlayerId } from "../entities/Player";
import { Match } from "../entities/Match";
import { Round, RoundNumber } from "../entities/Round";
import { Tournament } from "../entities/Tournament";
import { TiebreakerCalculator, Tiebreakers } from "./TiebreakerCalculator";

export interface GenerateFirstRoundOptions {
  /**
   * Optional initial ranking (best to worst) to seed round 1 with, instead of
   * randomizing. Must contain every player exactly once.
   */
  seedOrder?: PlayerId[];
}

/**
 * A single pairing supplied manually by a tournament organizer.
 * player2Id === null means this player receives a bye.
 */
export interface ManualPairing {
  player1Id: PlayerId;
  player2Id: PlayerId | null;
}

export class SwissPairingService {
  /**
   * Builds a round from pairings explicitly provided by the organizer instead
   * of generating them automatically. Typical uses: reproducing a real-world
   * event exactly as it happened (to audit tiebreakers or investigate an
   * issue), or manually seeding round 1 instead of randomizing it.
   *
   * Regardless of the source, a round must satisfy the same core invariant
   * the automatic generator will also have to satisfy: every active player
   * appears in exactly one match (or bye) of the round, no more, no less.
   */
  static buildManualRound(
    roundNumber: RoundNumber,
    activePlayers: readonly Player[],
    pairings: ManualPairing[],
  ): Round {
    const activeIds = new Set(activePlayers.map((p) => p.getId()));
    const seenIds = new Set<PlayerId>();
    const matches: Match[] = [];

    pairings.forEach((pairing, index) => {
      const tableNumber = index + 1;

      this.assertIsActivePlayer(pairing.player1Id, activeIds);
      this.assertNotAlreadyPaired(pairing.player1Id, seenIds);
      seenIds.add(pairing.player1Id);

      if (pairing.player2Id === null) {
        matches.push(
          Match.createBye(
            this.matchId(roundNumber, tableNumber),
            roundNumber,
            tableNumber,
            pairing.player1Id,
          ),
        );
        return;
      }

      if (pairing.player2Id === pairing.player1Id) {
        throw new Error(
          `Player ${pairing.player1Id} cannot be paired against themselves`,
        );
      }

      this.assertIsActivePlayer(pairing.player2Id, activeIds);
      this.assertNotAlreadyPaired(pairing.player2Id, seenIds);
      seenIds.add(pairing.player2Id);

      matches.push(
        Match.createPairing(
          this.matchId(roundNumber, tableNumber),
          roundNumber,
          tableNumber,
          pairing.player1Id,
          pairing.player2Id,
        ),
      );
    });

    const missingPlayerIds = [...activeIds].filter((id) => !seenIds.has(id));
    if (missingPlayerIds.length > 0) {
      throw new Error(
        `Manual pairings for round ${roundNumber} are missing these active players: ${missingPlayerIds.join(", ")}`,
      );
    }

    return Round.create(roundNumber, matches);
  }

  /**
   * Generates round 1. With no options, players are shuffled and paired
   * sequentially in the shuffled order (1st vs 2nd, 3rd vs 4th, ...) — a
   * random draw. With a `seedOrder`, the same sequential pairing is applied
   * to the provided ranking instead — useful for pre-seeded events, or for
   * reproducing a real tournament's actual round 1. If there's an odd number
   * of players, the lowest-seeded (or last shuffled) player receives the bye,
   * mirroring the "weakest player gets the bye" rule used for every later
   * round too.
   */
  static generateFirstRound(
    players: readonly Player[],
    options?: GenerateFirstRoundOptions,
  ): Round {
    const roundNumber = 1;
    if (players.length < 2) {
      throw new Error("At least 2 players are required to generate round 1");
    }

    const orderedPlayers = options?.seedOrder
      ? this.applySeedOrder(players, options.seedOrder)
      : this.shuffle(players);

    let byePlayer: Player | null = null;
    let contenders = orderedPlayers;
    if (orderedPlayers.length % 2 !== 0) {
      byePlayer = orderedPlayers[orderedPlayers.length - 1];
      contenders = orderedPlayers.slice(0, -1);
    }

    const matches: Match[] = [];
    let tableNumber = 1;
    for (let i = 0; i < contenders.length; i += 2) {
      matches.push(
        Match.createPairing(
          this.matchId(roundNumber, tableNumber),
          roundNumber,
          tableNumber,
          contenders[i].getId(),
          contenders[i + 1].getId(),
        ),
      );
      tableNumber++;
    }

    if (byePlayer) {
      matches.push(
        Match.createBye(
          this.matchId(roundNumber, tableNumber),
          roundNumber,
          tableNumber,
          byePlayer.getId(),
        ),
      );
    }

    return Round.create(roundNumber, matches);
  }

  /**
   * Generates the next Swiss round for a tournament already in progress.
   * Pairs the whole field with a single exhaustive backtracking search that
   * prefers same-score-group pairings (KTS-style): the highest-ranked
   * unpaired player always tries candidates from their own score group
   * first, in standings order, then each lower score group in turn, always
   * skipping opponents they have already played. Because the search is
   * exhaustive over the entire field, a valid round is found whenever one
   * exists — the old per-score-group pipeline could lock in a suboptimal
   * downfloat and then fail on a case that was actually pairable. The bye
   * (if needed) goes to the lowest-ranked active player who hasn't had one
   * yet.
   *
   * `allPlayersForTiebreakers` should include every player the tournament has
   * ever had, including dropped ones, since a dropped player's record may
   * still be needed to compute someone else's OMW%/OGW%. Defaults to
   * `tournament.getPlayers()`.
   */
  static generateNextRound(
    tournament: Tournament,
    allPlayersForTiebreakers?: readonly Player[],
  ): Round {
    const roundNumber = tournament.getRounds().length + 1;
    const activePlayers = tournament.getActivePlayers();
    if (activePlayers.length < 2) {
      throw new Error(
        "At least 2 active players are required to generate a new round",
      );
    }

    const allPlayers = allPlayersForTiebreakers ?? tournament.getPlayers();
    const tiebreakersById = TiebreakerCalculator.calculateForAll(allPlayers);
    const standings = this.sortByStandings(activePlayers, tiebreakersById);

    let byePlayer: Player | null = null;
    let contenders = standings;
    if (standings.length % 2 !== 0) {
      byePlayer = this.selectByeRecipient(standings);
      contenders = standings.filter((p) => p.getId() !== byePlayer!.getId());
    }

    const scoreGroups = this.groupByPoints(contenders);
    const pairs = this.findGlobalMatching(contenders, scoreGroups);
    if (pairs === null) {
      throw new Error(
        `Could not find a valid pairing without repeated opponents for: ${contenders
          .map((p) => p.getId())
          .join(
            ", ",
          )}. Resolve round ${roundNumber} manually with SwissPairingService.buildManualRound.`,
      );
    }

    const matches: Match[] = [];
    let tableNumber = 1;
    for (const [player1, player2] of pairs) {
      matches.push(
        Match.createPairing(
          this.matchId(roundNumber, tableNumber),
          roundNumber,
          tableNumber,
          player1.getId(),
          player2.getId(),
        ),
      );
      tableNumber++;
    }

    if (byePlayer) {
      matches.push(
        Match.createBye(
          this.matchId(roundNumber, tableNumber),
          roundNumber,
          tableNumber,
          byePlayer.getId(),
        ),
      );
    }

    return Round.create(roundNumber, matches);
  }

  /**
   * Sorts players best-to-worst using the official tiebreaker order
   * (match points -> OMW% -> OGW% -> DDD), the same order used for standings.
   */
  private static sortByStandings(
    players: readonly Player[],
    tiebreakersById: Map<PlayerId, Tiebreakers>,
  ): Player[] {
    return [...players].sort((a, b) =>
      TiebreakerCalculator.compare(
        tiebreakersById.get(a.getId())!,
        tiebreakersById.get(b.getId())!,
      ),
    );
  }

  /**
   * Picks the bye recipient: the lowest-ranked active player who hasn't had
   * a bye yet. `rankedPlayers` must already be sorted best-to-worst.
   */
  private static selectByeRecipient(rankedPlayers: readonly Player[]): Player {
    for (let i = rankedPlayers.length - 1; i >= 0; i--) {
      if (!rankedPlayers[i].hasHadBye()) {
        return rankedPlayers[i];
      }
    }
    throw new Error(
      "No eligible player found for the bye: every active player has already received one",
    );
  }

  /**
   * Splits an already-sorted player list into consecutive groups sharing the
   * same match points, preserving their relative (tiebreaker) order.
   */
  private static groupByPoints(sortedPlayers: readonly Player[]): Player[][] {
    const groups: Player[][] = [];
    let currentGroup: Player[] = [];
    let currentPoints: number | null = null;

    for (const player of sortedPlayers) {
      if (currentPoints === null || player.getPoints() !== currentPoints) {
        if (currentGroup.length > 0) groups.push(currentGroup);
        currentGroup = [player];
        currentPoints = player.getPoints();
      } else {
        currentGroup.push(player);
      }
    }
    if (currentGroup.length > 0) groups.push(currentGroup);

    return groups;
  }

  /**
   * Exhaustive backtracking search for a perfect matching of `players` (must
   * have even length) with no repeated opponents, preferring KTS-style
   * same-score-group pairings. Returns null if no such matching exists.
   *
   * `players` must be sorted best-to-worst by standings and `scoreGroups`
   * must be the score groups of the full field (in the same order). The
   * highest-ranked remaining player is always paired first, trying
   * candidates from their own score group in standings order, then each
   * lower score group in turn. This makes the search deterministic and
   * encodes the Swiss preference for pairing within the same score group and
   * downfloating in standings order — a "worse" pairing is only chosen when
   * the preferred one leads to a dead end later.
   *
   * Because the search is exhaustive over the whole field, it finds a valid
   * round whenever one exists (unlike the old per-score-group pipeline,
   * which locked in each group's pairs before seeing the rest of the field).
   *
   * Worst-case complexity is factorial in field size, but the score-group
   * preference prunes the search aggressively and constraints are sparse in
   * realistic tournaments (a handful of already-played opponents per
   * player), so this is fast at the scale this app targets.
   */
  private static findGlobalMatching(
    players: readonly Player[],
    scoreGroups: Player[][],
  ): [Player, Player][] | null {
    if (players.length === 0) return [];
    if (players.length % 2 !== 0) return null;

    const [first, ...rest] = players;
    const firstPoints = first.getPoints();
    const restIds = new Set(rest.map((p) => p.getId()));

    // Candidates in preference order: same score group first (in standings
    // order), then each lower score group. No remaining player can have more
    // points than `first`, since `players` is always a standings-ordered
    // suffix of the field.
    const candidates: Player[] = [];
    let inFirstGroup = false;
    for (const group of scoreGroups) {
      if (group[0].getPoints() === firstPoints) inFirstGroup = true;
      if (!inFirstGroup) continue;
      for (const player of group) {
        if (player.getId() !== first.getId() && restIds.has(player.getId())) {
          candidates.push(player);
        }
      }
    }

    for (const candidate of candidates) {
      if (first.hasPlayedAgainst(candidate.getId())) continue;
      const remaining = rest.filter((p) => p.getId() !== candidate.getId());
      const subMatching = this.findGlobalMatching(remaining, scoreGroups);
      if (subMatching !== null) {
        return [[first, candidate], ...subMatching];
      }
    }
    return null;
  }

  /**
   * Reorders `players` according to an explicit seed (best to worst).
   */
  private static applySeedOrder(
    players: readonly Player[],
    seedOrder: PlayerId[],
  ): Player[] {
    if (seedOrder.length !== players.length) {
      throw new Error(
        "Seed order must contain exactly the same players as the provided list, with no duplicates",
      );
    }

    const byId = new Map(players.map((p) => [p.getId(), p]));
    const missing = players.filter((p) => !seedOrder.includes(p.getId()));
    if (missing.length > 0) {
      throw new Error(
        `Seed order is missing these players: ${missing.map((p) => p.getId()).join(", ")}`,
      );
    }

    return seedOrder.map((id) => {
      const player = byId.get(id);
      if (!player) {
        throw new Error(`Seed order references unknown player ${id}`);
      }
      return player;
    });
  }

  /** Fisher-Yates shuffle. Does not mutate the input array. */
  private static shuffle(players: readonly Player[]): Player[] {
    const shuffled = [...players];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private static matchId(
    roundNumber: RoundNumber,
    tableNumber: number,
  ): string {
    return `r${roundNumber}-t${tableNumber}`;
  }

  private static assertIsActivePlayer(
    playerId: PlayerId,
    activeIds: Set<PlayerId>,
  ): void {
    if (!activeIds.has(playerId)) {
      throw new Error(
        `Player ${playerId} is not an active player in this tournament`,
      );
    }
  }

  private static assertNotAlreadyPaired(
    playerId: PlayerId,
    seenIds: Set<PlayerId>,
  ): void {
    if (seenIds.has(playerId)) {
      throw new Error(
        `Player ${playerId} appears more than once in the manual pairings`,
      );
    }
  }
}
