import { Match, MatchId } from "./Match";

export type RoundNumber = number;

export type RoundStatus = "pending" | "completed";

export interface RoundProps {
  roundNumber: RoundNumber;
  matches: Match[];
  status: RoundStatus;
}

export class Round {
  private readonly roundNumber: RoundNumber;
  private matches: Match[];
  private status: RoundStatus;

  private constructor(props: RoundProps) {
    this.roundNumber = props.roundNumber;
    this.matches = props.matches;
    this.status = props.status;
  }

  static create(roundNumber: RoundNumber, matches: Match[]): Round {
    if (matches.length === 0) {
      throw new Error(`Round ${roundNumber} must contain at least one match`);
    }

    const allBelongToThisRound = matches.every(
      (m) => m.getRoundNumber() === roundNumber,
    );
    if (!allBelongToThisRound) {
      throw new Error(`All matches must belong to round ${roundNumber}`);
    }

    return new Round({ roundNumber, matches, status: "pending" });
  }

  static fromProps(props: RoundProps): Round {
    return new Round(props);
  }

  getRoundNumber(): RoundNumber {
    return this.roundNumber;
  }

  getMatches(): readonly Match[] {
    return this.matches;
  }

  getMatch(matchId: MatchId): Match {
    const match = this.matches.find((m) => m.getId() === matchId);
    if (!match) {
      throw new Error(
        `Match ${matchId} not found in round ${this.roundNumber}`,
      );
    }
    return match;
  }

  getStatus(): RoundStatus {
    return this.status;
  }

  isCompleted(): boolean {
    return this.status === "completed";
  }

  /**
   * A round is ready to be completed once every match has a reported result.
   * Byes count as already resolved, since Match never leaves them as "pending".
   */
  allMatchesResolved(): boolean {
    return this.matches.every((m) => !m.isPending());
  }

  getPendingMatches(): Match[] {
    return this.matches.filter((m) => m.isPending());
  }

  complete(): void {
    if (this.status === "completed") {
      throw new Error(`Round ${this.roundNumber} is already completed`);
    }
    if (!this.allMatchesResolved()) {
      throw new Error(`Round ${this.roundNumber} still has pending matches`);
    }
    this.status = "completed";
  }

  /**
   * Marks the round back as pending. Does NOT revert individual match results —
   * that is the responsibility of the caller (the RevertRound use-case), which
   * should revert each match's result and the affected players' stats, keeping
   * each entity focused on its own state.
   */
  revertCompletion(): void {
    if (this.status !== "completed") {
      throw new Error(
        `Round ${this.roundNumber} is not completed, nothing to revert`,
      );
    }
    this.status = "pending";
  }

  toProps(): RoundProps {
    return {
      roundNumber: this.roundNumber,
      matches: this.matches,
      status: this.status,
    };
  }
}
