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
   * Generates round 1. With no options, players are randomized. With a
   * `seedOrder`, players are paired top-half-vs-bottom-half order instead
   * (1st vs 2nd, 3rd vs 4th, ...) based on that ranking — useful for
   * pre-seeded events, or for reproducing a real tournament's actual round 1.
   * If there's an odd number of players, the lowest-seeded (or last
   * shuffled) player receives the bye, mirroring the "weakest player gets
   * the bye" rule used for every later round too.
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
   * Groups active players by match points (score groups), pairs within each
   * group avoiding repeated opponents, and downfloats anyone who can't be
   * paired within their own group to the next lower group. The bye (if
   * needed) goes to the lowest-ranked active player who hasn't had one yet.
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

    const matches: Match[] = [];
    let tableNumber = 1;
    let floaters: Player[] = [];

    for (const group of scoreGroups) {
      const pool = [...floaters, ...group];
      const { pairs, floaters: remainingFloaters } = this.pairWithinPool(pool);

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

      floaters = remainingFloaters;
    }

    if (floaters.length > 0) {
      throw new Error(
        `Could not find a valid pairing without repeated opponents for: ${floaters
          .map((p) => p.getId())
          .join(
            ", ",
          )}. Resolve round ${roundNumber} manually with SwissPairingService.buildManualRound.`,
      );
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
   * (match points -> OMW% -> GW% -> OGW%), the same order used for standings.
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
   * Greedily pairs players within a pool (a score group plus any floaters
   * from the group above), avoiding repeated opponents. Always tries to pair
   * the top-ranked remaining player first; if no valid opponent exists for
   * them in the current pool, the lowest-ranked remaining player is floated
   * out and the attempt is retried. Anyone left unpaired at the end is
   * returned as a floater for the next (lower) score group to try.
   *
   * Note: this is a greedy heuristic, not an exhaustive matching search — for
   * the vast majority of real tournaments (where repeated-opponent conflicts
   * within a single score group are rare) it finds a valid pairing. In a
   * pathological case where a valid pairing exists but this heuristic can't
   * find it, generateNextRound surfaces a clear error so the organizer can
   * fall back to buildManualRound for that round.
   */
  private static pairWithinPool(pool: readonly Player[]): {
    pairs: [Player, Player][];
    floaters: Player[];
  } {
    const remaining = [...pool];
    const pairs: [Player, Player][] = [];
    const floaters: Player[] = [];

    while (remaining.length > 0) {
      if (remaining.length === 1) {
        floaters.push(remaining.shift()!);
        break;
      }

      const first = remaining[0];
      const partnerIndex = remaining.findIndex(
        (candidate, index) =>
          index > 0 && !first.hasPlayedAgainst(candidate.getId()),
      );

      if (partnerIndex === -1) {
        // `first` can't be paired with anyone left in this pool. Float the
        // lowest-ranked remaining player (the last one) and try again.
        const floated = remaining.pop()!;
        if (floated.getId() === first.getId()) {
          floaters.push(first);
          remaining.length = 0;
          break;
        }
        floaters.push(floated);
        continue;
      }

      const partner = remaining[partnerIndex];
      pairs.push([first, partner]);
      remaining.splice(partnerIndex, 1);
      remaining.shift();
    }

    return { pairs, floaters };
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
