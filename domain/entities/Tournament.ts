import { Player, PlayerId } from "./Player";
import { Round, RoundNumber } from "./Round";
import { TournamentRuleset } from "../value-objects/TournamentRuleset";

export type TournamentId = string;

export type TournamentPhase =
  "registration" | "swiss" | "top_cut" | "completed";

export type TopCutSize = 4 | 8 | 16 | 32 | null;

export interface TournamentProps {
  id: TournamentId;
  ownerId: string;
  name: string;
  phase: TournamentPhase;
  totalSwissRounds: number;
  topCutSize: TopCutSize;
  ruleset: TournamentRuleset;
  players: Player[];
  rounds: Round[];
  shareToken: string | null;
}

export class Tournament {
  private readonly id: TournamentId;
  private readonly ownerId: string;
  private name: string;
  private phase: TournamentPhase;
  private readonly totalSwissRounds: number;
  private readonly topCutSize: TopCutSize;
  private readonly ruleset: TournamentRuleset;
  private players: Player[];
  private rounds: Round[];
  private shareToken: string | null;

  private constructor(props: TournamentProps) {
    this.id = props.id;
    this.ownerId = props.ownerId;
    this.name = props.name;
    this.phase = props.phase;
    this.totalSwissRounds = props.totalSwissRounds;
    this.topCutSize = props.topCutSize;
    this.ruleset = props.ruleset;
    this.players = props.players;
    this.rounds = props.rounds;
    this.shareToken = props.shareToken;
  }

  static create(params: {
    id: TournamentId;
    ownerId: string;
    name: string;
    totalSwissRounds: number;
    topCutSize?: TopCutSize;
    ruleset?: TournamentRuleset;
  }): Tournament {
    if (!params.name.trim()) {
      throw new Error("Tournament name cannot be empty");
    }
    if (params.totalSwissRounds <= 0) {
      throw new Error("Tournament must have at least 1 swiss round");
    }

    const topCutSize = params.topCutSize ?? null;
    if (topCutSize !== null && ![4, 8, 16, 32].includes(topCutSize)) {
      throw new Error("Top cut size must be 4, 8, 16, 32, or null");
    }

    return new Tournament({
      id: params.id,
      ownerId: params.ownerId,
      name: params.name.trim(),
      phase: "registration",
      totalSwissRounds: params.totalSwissRounds,
      topCutSize,
      ruleset: params.ruleset ?? TournamentRuleset.current(),
      players: [],
      rounds: [],
      shareToken: null,
    });
  }

  static fromProps(props: TournamentProps): Tournament {
    return new Tournament(props);
  }

  getId(): TournamentId {
    return this.id;
  }

  getOwnerId(): string {
    return this.ownerId;
  }

  getName(): string {
    return this.name;
  }

  getPhase(): TournamentPhase {
    return this.phase;
  }

  getTotalSwissRounds(): number {
    return this.totalSwissRounds;
  }

  getTopCutSize(): TopCutSize {
    return this.topCutSize;
  }

  getRuleset(): TournamentRuleset {
    return this.ruleset;
  }

  getShareToken(): string | null {
    return this.shareToken;
  }

  /**
   * Assigns the public read-only share token. Unconditional by design —
   * whether to reuse an existing token instead of overwriting it is an
   * application-layer decision (see the ShareTournament use-case), not a
   * domain invariant.
   */
  setShareToken(token: string): void {
    this.shareToken = token;
  }

  getPlayers(): readonly Player[] {
    return this.players;
  }

  getActivePlayers(): Player[] {
    return this.players.filter((p) => !p.isDropped());
  }

  getPlayer(playerId: PlayerId): Player {
    const player = this.players.find((p) => p.getId() === playerId);
    if (!player) {
      throw new Error(`Player ${playerId} not found in tournament ${this.id}`);
    }
    return player;
  }

  getRounds(): readonly Round[] {
    return this.rounds;
  }

  getRound(roundNumber: RoundNumber): Round {
    const round = this.rounds.find((r) => r.getRoundNumber() === roundNumber);
    if (!round) {
      throw new Error(
        `Round ${roundNumber} not found in tournament ${this.id}`,
      );
    }
    return round;
  }

  getCurrentRound(): Round | null {
    if (this.rounds.length === 0) return null;
    return this.rounds[this.rounds.length - 1];
  }

  registerPlayer(player: Player): void {
    if (this.phase !== "registration") {
      throw new Error(
        "Players can only be registered while the tournament is in the registration phase",
      );
    }
    if (this.players.some((p) => p.getId() === player.getId())) {
      throw new Error(
        `Player ${player.getId()} is already registered in tournament ${this.id}`,
      );
    }
    this.players.push(player);
  }

  unregisterPlayer(playerId: PlayerId): void {
    if (this.phase !== "registration") {
      throw new Error(
        "Players can only be removed while the tournament is in the registration phase",
      );
    }
    const existed = this.players.some((p) => p.getId() === playerId);
    if (!existed) {
      throw new Error(`Player ${playerId} not found in tournament ${this.id}`);
    }
    this.players = this.players.filter((p) => p.getId() !== playerId);
  }

  dropPlayer(playerId: PlayerId): void {
    this.getPlayer(playerId).drop();
  }

  startSwissRounds(): void {
    if (this.phase !== "registration") {
      throw new Error("Tournament has already left the registration phase");
    }
    if (this.players.length < 2) {
      throw new Error(
        "At least 2 players are required to start the tournament",
      );
    }
    this.phase = "swiss";
  }

  addRound(round: Round): void {
    if (this.phase !== "swiss") {
      throw new Error("Rounds can only be added during the swiss phase");
    }

    const expectedRoundNumber = this.rounds.length + 1;
    if (round.getRoundNumber() !== expectedRoundNumber) {
      throw new Error(
        `Expected round number ${expectedRoundNumber}, got ${round.getRoundNumber()}`,
      );
    }
    if (expectedRoundNumber > this.totalSwissRounds) {
      throw new Error(
        `Tournament ${this.id} only has ${this.totalSwissRounds} swiss rounds`,
      );
    }

    const currentRound = this.getCurrentRound();
    if (currentRound && !currentRound.isCompleted()) {
      throw new Error(
        `Round ${currentRound.getRoundNumber()} must be completed before adding a new round`,
      );
    }

    this.rounds.push(round);
  }

  completeRound(roundNumber: RoundNumber): void {
    this.getRound(roundNumber).complete();
  }

  revertRoundCompletion(roundNumber: RoundNumber): void {
    const round = this.getRound(roundNumber);
    if (round.getRoundNumber() !== this.rounds.length) {
      throw new Error("Only the most recently played round can be reverted");
    }
    round.revertCompletion();
  }

  isSwissStageComplete(): boolean {
    return (
      this.rounds.length === this.totalSwissRounds &&
      this.rounds.every((r) => r.isCompleted())
    );
  }

  advanceToTopCut(): void {
    if (this.phase !== "swiss") {
      throw new Error(
        "Tournament must be in the swiss phase to advance to top cut",
      );
    }
    if (!this.isSwissStageComplete()) {
      throw new Error(
        "All swiss rounds must be completed before advancing to top cut",
      );
    }
    if (this.topCutSize === null) {
      throw new Error(
        `Tournament ${this.id} was not configured with a top cut`,
      );
    }
    if (this.getActivePlayers().length < this.topCutSize) {
      throw new Error(
        `Not enough active players (${this.getActivePlayers().length}) to fill a top cut of ${this.topCutSize}`,
      );
    }
    this.phase = "top_cut";
  }

  complete(): void {
    if (this.phase !== "swiss" && this.phase !== "top_cut") {
      throw new Error(
        "Tournament must be in swiss or top_cut phase to be completed",
      );
    }
    if (this.phase === "swiss" && this.topCutSize !== null) {
      throw new Error(
        "This tournament has a top cut configured; it cannot finish directly from the swiss phase",
      );
    }
    if (this.phase === "swiss" && !this.isSwissStageComplete()) {
      throw new Error(
        "All swiss rounds must be completed before finishing the tournament",
      );
    }
    this.phase = "completed";
  }

  revertCompletion(): void {
    if (this.phase !== "completed") {
      throw new Error(
        `Tournament ${this.id} is not completed, nothing to revert`,
      );
    }
    this.phase = this.topCutSize !== null ? "top_cut" : "swiss";
  }

  toProps(): TournamentProps {
    return {
      id: this.id,
      ownerId: this.ownerId,
      name: this.name,
      phase: this.phase,
      totalSwissRounds: this.totalSwissRounds,
      topCutSize: this.topCutSize,
      ruleset: this.ruleset,
      players: [...this.players],
      rounds: [...this.rounds],
      shareToken: this.shareToken,
    };
  }
}
