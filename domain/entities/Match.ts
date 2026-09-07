import { PlayerId } from "./Player";

export type MatchId = string;

/**
 * Represents the outcome of a Match.
 *
 * "draw" is kept for forward-compatibility: Konami's official policy removed draws
 * as of July 29, 2025 (time-outs now resolve as "double_loss" instead). If draws are
 * ever reinstated, no structural change is needed here — only the TournamentRuleset
 * that gates which result types are allowed needs to change.
 */
export type MatchResult =
  | { type: "pending" }
  | { type: "win"; winnerId: PlayerId; winnerGames: number; loserGames: number }
  | { type: "draw"; player1Games: number; player2Games: number }
  | { type: "double_loss"; player1Games: number; player2Games: number }
  | { type: "bye" };

export interface MatchProps {
  id: MatchId;
  roundNumber: number;
  tableNumber: number;
  player1Id: PlayerId;
  player2Id: PlayerId | null; // null means this match is a bye
  result: MatchResult;
}

export class Match {
  private readonly id: MatchId;
  private readonly roundNumber: number;
  private readonly tableNumber: number;
  private readonly player1Id: PlayerId;
  private readonly player2Id: PlayerId | null;
  private result: MatchResult;

  private constructor(props: MatchProps) {
    this.id = props.id;
    this.roundNumber = props.roundNumber;
    this.tableNumber = props.tableNumber;
    this.player1Id = props.player1Id;
    this.player2Id = props.player2Id;
    this.result = props.result;
  }

  static createPairing(
    id: MatchId,
    roundNumber: number,
    tableNumber: number,
    player1Id: PlayerId,
    player2Id: PlayerId,
  ): Match {
    if (player1Id === player2Id) {
      throw new Error("A player cannot be paired against themselves");
    }

    return new Match({
      id,
      roundNumber,
      tableNumber,
      player1Id,
      player2Id,
      result: { type: "pending" },
    });
  }

  static createBye(
    id: MatchId,
    roundNumber: number,
    tableNumber: number,
    playerId: PlayerId,
  ): Match {
    return new Match({
      id,
      roundNumber,
      tableNumber,
      player1Id: playerId,
      player2Id: null,
      result: { type: "bye" },
    });
  }

  static fromProps(props: MatchProps): Match {
    return new Match(props);
  }

  getId(): MatchId {
    return this.id;
  }

  getRoundNumber(): number {
    return this.roundNumber;
  }

  getTableNumber(): number {
    return this.tableNumber;
  }

  getPlayer1Id(): PlayerId {
    return this.player1Id;
  }

  getPlayer2Id(): PlayerId | null {
    return this.player2Id;
  }

  isBye(): boolean {
    return this.player2Id === null;
  }

  getResult(): MatchResult {
    return this.result;
  }

  isPending(): boolean {
    return this.result.type === "pending";
  }

  involvesPlayer(playerId: PlayerId): boolean {
    return this.player1Id === playerId || this.player2Id === playerId;
  }

  getOpponentOf(playerId: PlayerId): PlayerId | null {
    if (this.player1Id === playerId) return this.player2Id;
    if (this.player2Id === playerId) return this.player1Id;
    throw new Error(`Player ${playerId} is not part of match ${this.id}`);
  }

  /**
   * Reports a clean 2-0 (or 2-1) win for one of the two players.
   */
  reportWin(winnerId: PlayerId, winnerGames: number, loserGames: number): void {
    this.assertNotBye();
    this.assertPending();
    this.assertPlayerInMatch(winnerId);

    if (winnerGames <= loserGames) {
      throw new Error("Winner games must be greater than loser games");
    }

    this.result = { type: "win", winnerId, winnerGames, loserGames };
  }

  /**
   * Reports a draw. Only meaningful under a TournamentRuleset where allowsDraws() is true.
   * The caller (use-case layer) is responsible for enforcing that rule before invoking this.
   */
  reportDraw(player1Games: number, player2Games: number): void {
    this.assertNotBye();
    this.assertPending();

    this.result = { type: "draw", player1Games, player2Games };
  }

  /**
   * Reports a double loss: current Konami policy for when time is called
   * and both players are still tied on game wins. A double loss is always
   * scored 0-0: no points and no games count toward either player's
   * game-win percentage.
   */
  reportDoubleLoss(player1Games: number, player2Games: number): void {
    this.assertNotBye();
    this.assertPending();

    if (player1Games !== 0 || player2Games !== 0) {
      throw new Error(
        `A double loss is always scored 0-0, got ${player1Games}-${player2Games}`,
      );
    }

    this.result = { type: "double_loss", player1Games, player2Games };
  }

  /**
   * Reverts any reported result back to pending. Used for the match-level rollback feature.
   */
  revertResult(): void {
    this.assertNotBye();
    if (this.result.type === "pending") {
      throw new Error(`Match ${this.id} has no reported result to revert`);
    }
    this.result = { type: "pending" };
  }

  private assertPending(): void {
    if (this.result.type !== "pending") {
      throw new Error(`Match ${this.id} already has a reported result`);
    }
  }

  private assertNotBye(): void {
    if (this.isBye()) {
      throw new Error(
        `Match ${this.id} is a bye and cannot report/revert a result`,
      );
    }
  }

  private assertPlayerInMatch(playerId: PlayerId): void {
    if (!this.involvesPlayer(playerId)) {
      throw new Error(`Player ${playerId} is not part of match ${this.id}`);
    }
  }

  toProps(): MatchProps {
    return {
      id: this.id,
      roundNumber: this.roundNumber,
      tableNumber: this.tableNumber,
      player1Id: this.player1Id,
      player2Id: this.player2Id,
      result: this.result,
    };
  }
}
