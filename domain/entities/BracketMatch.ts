import { PlayerId } from "./Player";

export type BracketMatchId = string;
export type RoundIndex = number; // 1 = first bracket round, increasing toward the final

export interface BracketMatchProps {
  id: BracketMatchId;
  roundIndex: RoundIndex;
  position: number; // 0-based position within the round
  player1Id: PlayerId | null;
  player2Id: PlayerId | null;
  winnerId: PlayerId | null;
}

export class BracketMatch {
  private readonly id: BracketMatchId;
  private readonly roundIndex: RoundIndex;
  private readonly position: number;
  private player1Id: PlayerId | null;
  private player2Id: PlayerId | null;
  private winnerId: PlayerId | null;

  private constructor(props: BracketMatchProps) {
    this.id = props.id;
    this.roundIndex = props.roundIndex;
    this.position = props.position;
    this.player1Id = props.player1Id;
    this.player2Id = props.player2Id;
    this.winnerId = props.winnerId;
  }

  static create(
    id: BracketMatchId,
    roundIndex: RoundIndex,
    position: number,
    player1Id: PlayerId | null,
    player2Id: PlayerId | null,
  ): BracketMatch {
    return new BracketMatch({
      id,
      roundIndex,
      position,
      player1Id,
      player2Id,
      winnerId: null,
    });
  }

  static fromProps(props: BracketMatchProps): BracketMatch {
    return new BracketMatch(props);
  }

  getId(): BracketMatchId {
    return this.id;
  }

  getRoundIndex(): RoundIndex {
    return this.roundIndex;
  }

  getPosition(): number {
    return this.position;
  }

  getPlayer1Id(): PlayerId | null {
    return this.player1Id;
  }

  getPlayer2Id(): PlayerId | null {
    return this.player2Id;
  }

  getWinnerId(): PlayerId | null {
    return this.winnerId;
  }

  /** True once both slots are filled (either from initial seeding or from a previous round's winner advancing in). */
  isReady(): boolean {
    return this.player1Id !== null && this.player2Id !== null;
  }

  isDecided(): boolean {
    return this.winnerId !== null;
  }

  reportWinner(winnerId: PlayerId): void {
    if (!this.isReady()) {
      throw new Error(
        `Match ${this.id} is not ready yet: both players must be assigned before reporting a winner`,
      );
    }
    if (this.isDecided()) {
      throw new Error(`Match ${this.id} already has a reported winner`);
    }
    if (winnerId !== this.player1Id && winnerId !== this.player2Id) {
      throw new Error(`Player ${winnerId} is not part of match ${this.id}`);
    }
    this.winnerId = winnerId;
  }

  revertWinner(): void {
    if (!this.isDecided()) {
      throw new Error(`Match ${this.id} has no reported winner to revert`);
    }
    this.winnerId = null;
  }

  /** Used by TopCutBracket to advance a previous round's winner into this match. */
  assignSlot(slot: 1 | 2, playerId: PlayerId): void {
    if (slot === 1) {
      if (this.player1Id !== null) {
        throw new Error(
          `Match ${this.id} already has a player assigned to slot 1`,
        );
      }
      this.player1Id = playerId;
    } else {
      if (this.player2Id !== null) {
        throw new Error(
          `Match ${this.id} already has a player assigned to slot 2`,
        );
      }
      this.player2Id = playerId;
    }
  }

  /** Used by TopCutBracket when reverting a winner needs to clear the slot it advanced into. */
  clearSlot(slot: 1 | 2): void {
    if (slot === 1) {
      this.player1Id = null;
    } else {
      this.player2Id = null;
    }
  }

  toProps(): BracketMatchProps {
    return {
      id: this.id,
      roundIndex: this.roundIndex,
      position: this.position,
      player1Id: this.player1Id,
      player2Id: this.player2Id,
      winnerId: this.winnerId,
    };
  }
}
