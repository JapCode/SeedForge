import { PlayerId } from "./Player";
import { BracketMatch, RoundIndex } from "./BracketMatch";

export interface TopCutBracketProps {
  size: number;
  rounds: BracketMatch[][]; // rounds[0] = first bracket round, last entry = the final
}

export class TopCutBracket {
  private readonly size: number;
  private readonly rounds: BracketMatch[][];

  private constructor(props: TopCutBracketProps) {
    this.size = props.size;
    this.rounds = props.rounds;
  }

  /**
   * Builds a single-elimination bracket from a seeded list of qualifiers
   * (index 0 = seed 1 / best qualifier, ..., last index = worst qualifier).
   * Uses the standard tournament seeding pattern (e.g. for a cut of 8:
   * 1v8, 4v5, 2v7, 3v6) so top seeds are kept apart for as long as possible.
   */
  static create(seededPlayerIds: PlayerId[]): TopCutBracket {
    const size = seededPlayerIds.length;
    if (size < 2 || (size & (size - 1)) !== 0) {
      throw new Error(
        `Top cut size must be a power of 2 (2, 4, 8, 16, 32...), got ${size}`,
      );
    }

    const seedOrder = this.generateSeedOrder(size);
    const totalRounds = Math.log2(size);
    const rounds: BracketMatch[][] = [];

    const firstRound: BracketMatch[] = [];
    for (let position = 0; position < size / 2; position++) {
      const seedA = seedOrder[position * 2];
      const seedB = seedOrder[position * 2 + 1];
      firstRound.push(
        BracketMatch.create(
          this.matchId(1, position),
          1,
          position,
          seededPlayerIds[seedA - 1],
          seededPlayerIds[seedB - 1],
        ),
      );
    }
    rounds.push(firstRound);

    for (let roundIndex = 2; roundIndex <= totalRounds; roundIndex++) {
      const matchesInRound = size / Math.pow(2, roundIndex);
      const round: BracketMatch[] = [];
      for (let position = 0; position < matchesInRound; position++) {
        round.push(
          BracketMatch.create(
            this.matchId(roundIndex, position),
            roundIndex,
            position,
            null,
            null,
          ),
        );
      }
      rounds.push(round);
    }

    return new TopCutBracket({ size, rounds });
  }

  static fromProps(props: TopCutBracketProps): TopCutBracket {
    return new TopCutBracket(props);
  }

  getSize(): number {
    return this.size;
  }

  getTotalRounds(): number {
    return this.rounds.length;
  }

  getRound(roundIndex: RoundIndex): readonly BracketMatch[] {
    const round = this.rounds[roundIndex - 1];
    if (!round) {
      throw new Error(`Round ${roundIndex} does not exist in this bracket`);
    }
    return round;
  }

  getMatch(roundIndex: RoundIndex, position: number): BracketMatch {
    const round = this.getRound(roundIndex);
    const match = round[position];
    if (!match) {
      throw new Error(`No match at round ${roundIndex}, position ${position}`);
    }
    return match;
  }

  isFinalRound(roundIndex: RoundIndex): boolean {
    return roundIndex === this.rounds.length;
  }

  /**
   * Reports the winner of a match and, unless it was the final, advances
   * them into the correct slot of the next round's match.
   */
  reportMatchWinner(
    roundIndex: RoundIndex,
    position: number,
    winnerId: PlayerId,
  ): void {
    const match = this.getMatch(roundIndex, position);
    match.reportWinner(winnerId);

    if (!this.isFinalRound(roundIndex)) {
      const nextMatch = this.getMatch(roundIndex + 1, Math.floor(position / 2));
      const slot = position % 2 === 0 ? 1 : 2;
      nextMatch.assignSlot(slot, winnerId);
    }
  }

  /**
   * Reverts a match's winner. If that winner had already advanced into the
   * next round, that slot is cleared too — but only if the next match hasn't
   * already been decided itself (downstream results must be reverted first).
   */
  revertMatchWinner(roundIndex: RoundIndex, position: number): void {
    const match = this.getMatch(roundIndex, position);

    if (!this.isFinalRound(roundIndex)) {
      const nextMatch = this.getMatch(roundIndex + 1, Math.floor(position / 2));
      if (nextMatch.isDecided()) {
        throw new Error(
          `Cannot revert round ${roundIndex} position ${position}: the next round's match has already been decided. Revert that one first.`,
        );
      }
      const slot = position % 2 === 0 ? 1 : 2;
      nextMatch.clearSlot(slot);
    }

    match.revertWinner();
  }

  getChampion(): PlayerId | null {
    const finalMatch = this.getMatch(this.rounds.length, 0);
    return finalMatch.getWinnerId();
  }

  isComplete(): boolean {
    return this.getChampion() !== null;
  }

  toProps(): TopCutBracketProps {
    return { size: this.size, rounds: this.rounds };
  }

  private static matchId(roundIndex: RoundIndex, position: number): string {
    return `bracket-r${roundIndex}-p${position}`;
  }

  /**
   * Standard single-elimination seeding order via reflection:
   * size 2 -> [1, 2]
   * size 4 -> [1, 4, 2, 3]
   * size 8 -> [1, 8, 4, 5, 2, 7, 3, 6]
   * Pairing consecutive entries gives each round-1 matchup.
   */
  private static generateSeedOrder(size: number): number[] {
    let seeds = [1, 2];
    while (seeds.length < size) {
      const m = seeds.length * 2;
      const next: number[] = [];
      for (const seed of seeds) {
        next.push(seed, m + 1 - seed);
      }
      seeds = next;
    }
    return seeds;
  }
}
