export type PlayerId = string;

export interface PlayerProps {
  id: PlayerId;
  name: string;
  points: number;
  opponentIds: PlayerId[];
  hadBye: boolean;
  dropped: boolean;
  gamesWon: number;
  gamesPlayed: number;
  topCutSeed: number | null;
}

export class Player {
  private readonly id: PlayerId;
  private name: string;
  private points: number;
  private opponentIds: PlayerId[];
  private hadBye: boolean;
  private dropped: boolean;
  private gamesWon: number;
  private gamesPlayed: number;
  private topCutSeed: number | null;

  private constructor(props: PlayerProps) {
    this.id = props.id;
    this.name = props.name;
    this.points = props.points;
    this.opponentIds = props.opponentIds;
    this.hadBye = props.hadBye;
    this.dropped = props.dropped;
    this.gamesWon = props.gamesWon;
    this.gamesPlayed = props.gamesPlayed;
    this.topCutSeed = props.topCutSeed;
  }

  static create(id: PlayerId, name: string): Player {
    if (!name.trim()) {
      throw new Error("Player name cannot be empty");
    }

    return new Player({
      id,
      name: name.trim(),
      points: 0,
      opponentIds: [],
      hadBye: false,
      dropped: false,
      gamesWon: 0,
      gamesPlayed: 0,
      topCutSeed: null,
    });
  }

  static fromProps(props: PlayerProps): Player {
    return new Player(props);
  }

  getId(): PlayerId {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getPoints(): number {
    return this.points;
  }

  getOpponentIds(): readonly PlayerId[] {
    return this.opponentIds;
  }

  hasPlayedAgainst(opponentId: PlayerId): boolean {
    return this.opponentIds.includes(opponentId);
  }

  hasHadBye(): boolean {
    return this.hadBye;
  }

  isDropped(): boolean {
    return this.dropped;
  }

  getTopCutSeed(): number | null {
    return this.topCutSeed;
  }

  getGamesWon(): number {
    return this.gamesWon;
  }

  getGamesPlayed(): number {
    return this.gamesPlayed;
  }

  getGameWinPercentage(): number {
    if (this.gamesPlayed === 0) return 0;
    return this.gamesWon / this.gamesPlayed;
  }

  recordMatchWin(
    opponentId: PlayerId,
    gamesWon: number,
    gamesPlayed: number,
  ): void {
    this.points += 3;
    this.registerOpponent(opponentId);
    this.registerGames(gamesWon, gamesPlayed);
  }

  recordMatchDraw(
    opponentId: PlayerId,
    gamesWon: number,
    gamesPlayed: number,
  ): void {
    this.points += 1;
    this.registerOpponent(opponentId);
    this.registerGames(gamesWon, gamesPlayed);
  }

  recordMatchLoss(
    opponentId: PlayerId,
    gamesWon: number,
    gamesPlayed: number,
  ): void {
    this.registerOpponent(opponentId);
    this.registerGames(gamesWon, gamesPlayed);
  }

  /**
   * Awards a bye: 3 match points plus a 2-0 game record. The 2-0 game record
   * is required by official Swiss tiebreaker rules so that a bye correctly
   * contributes to the player's own game-win percentage (KTS behavior).
   */
  recordBye(): void {
    if (this.hadBye) {
      throw new Error(`Player ${this.id} has already received a bye`);
    }
    this.points += 3;
    this.hadBye = true;
    this.gamesWon += 2;
    this.gamesPlayed += 2;
  }

  revertMatchResult(
    opponentId: PlayerId,
    pointsAwarded: number,
    gamesWon: number,
    gamesPlayed: number,
  ): void {
    this.points -= pointsAwarded;
    this.opponentIds = this.opponentIds.filter((id) => id !== opponentId);
    this.gamesWon -= gamesWon;
    this.gamesPlayed -= gamesPlayed;
  }

  revertBye(): void {
    if (!this.hadBye) {
      throw new Error(`Player ${this.id} did not have a bye to revert`);
    }
    this.points -= 3;
    this.hadBye = false;
    this.gamesWon -= 2;
    this.gamesPlayed -= 2;
  }

  drop(): void {
    this.dropped = true;
  }

  assignTopCutSeed(seed: number): void {
    this.topCutSeed = seed;
  }

  private registerOpponent(opponentId: PlayerId): void {
    this.opponentIds.push(opponentId);
  }

  private registerGames(gamesWon: number, gamesPlayed: number): void {
    this.gamesWon += gamesWon;
    this.gamesPlayed += gamesPlayed;
  }

  toProps(): PlayerProps {
    return {
      id: this.id,
      name: this.name,
      points: this.points,
      opponentIds: [...this.opponentIds],
      hadBye: this.hadBye,
      dropped: this.dropped,
      gamesWon: this.gamesWon,
      gamesPlayed: this.gamesPlayed,
      topCutSeed: this.topCutSeed,
    };
  }
}
