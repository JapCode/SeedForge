import { Player, PlayerId } from "./Player";
import { Match, MatchResult } from "./Match";
import { Round, RoundNumber } from "./Round";
import { TournamentRuleset } from "../value-objects/TournamentRuleset";

export type TournamentId = string;

export type TournamentPhase =
  "registration" | "swiss" | "top_cut" | "completed";

export type TopCutSize = 4 | 8 | 16 | 32 | null;

/**
 * How rounds are paired. "automatic" uses the Swiss backtracking search;
 * "manual" is the audit mode: round 1 is built from organizer-provided
 * pairings (via SwissPairingService.buildManualRound), later rounds pair
 * automatically from the actual results.
 */
export type PairingMode = "automatic" | "manual";

export interface TournamentProps {
  id: TournamentId;
  ownerId: string;
  name: string;
  phase: TournamentPhase;
  totalSwissRounds: number;
  topCutSize: TopCutSize;
  pairingMode: PairingMode;
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
  private readonly pairingMode: PairingMode;
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
    this.pairingMode = props.pairingMode;
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
    pairingMode?: PairingMode;
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
      pairingMode: params.pairingMode ?? "automatic",
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

  getPairingMode(): PairingMode {
    return this.pairingMode;
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

  /**
   * Randomizes the order of the registered players (Fisher-Yates). This is
   * the "initial ranking" KTS derives from its round-1 random draw: once
   * persisted, the stable sorts used for standings and pairing break full
   * tiebreaker ties by this order. Only valid before any round exists.
   */
  randomizePlayerOrder(): void {
    this.assertNoRoundsYet("randomized");
    for (let i = this.players.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.players[i], this.players[j]] = [this.players[j], this.players[i]];
    }
  }

  /**
   * Reorders the registered players to an explicit seed (best to worst).
   * Used when the organizer provides a seedOrder for round 1: that order then
   * breaks full tiebreaker ties throughout the tournament, mirroring how KTS
   * treats its initial ranking. Only valid before any round exists.
   */
  reorderPlayers(playerIds: PlayerId[]): void {
    this.assertNoRoundsYet("set");
    if (playerIds.length !== this.players.length) {
      throw new Error(
        "Seed order must contain exactly the same players as the tournament, with no duplicates",
      );
    }

    const seen = new Set<PlayerId>();
    for (const id of playerIds) {
      if (seen.has(id)) {
        throw new Error(`Seed order contains duplicate player ${id}`);
      }
      seen.add(id);
    }

    const byId = new Map(this.players.map((p) => [p.getId(), p]));
    const missing = this.players.filter((p) => !playerIds.includes(p.getId()));
    if (missing.length > 0) {
      throw new Error(
        `Seed order is missing these players: ${missing.map((p) => p.getId()).join(", ")}`,
      );
    }

    this.players = playerIds.map((id) => {
      const player = byId.get(id);
      if (!player) {
        throw new Error(`Seed order references unknown player ${id}`);
      }
      return player;
    });
  }

  private assertNoRoundsYet(action: string): void {
    if (this.rounds.length > 0) {
      throw new Error(
        `The player order can only be ${action} before the first round is generated`,
      );
    }
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

    // A bye is an automatic result: the recipient earns it (3 points + a 2-0
    // game record) the moment the round exists, so standings are correct even
    // before the round is completed. recordBye enforces the one-bye-per-player
    // rule; the pairing services already avoid selecting a player who has had
    // a bye, and revertRoundsForEdit undoes byes of removed rounds.
    for (const match of round.getMatches()) {
      if (match.isBye()) {
        this.getPlayer(match.getPlayer1Id()).recordBye();
      }
    }

    this.rounds.push(round);
  }

  completeRound(roundNumber: RoundNumber): void {
    this.getRound(roundNumber).complete();
  }

  revertRoundCompletion(roundNumber: RoundNumber): void {
    if (this.phase === "completed") {
      throw new Error(
        "Cannot revert a round while the tournament is completed",
      );
    }
    const round = this.getRound(roundNumber);
    if (round.getRoundNumber() !== this.rounds.length) {
      throw new Error("Only the most recently played round can be reverted");
    }
    round.revertCompletion();
  }

  /**
   * Reverts the tournament to the state it was in right after round
   * `roundNumber` was completed, so the organizer can correct a result and
   * then generate a new round `roundNumber + 1` with recalculated pairings.
   *
   * Every later round is removed and the results (points, opponents, games,
   * byes) they granted are undone; the target round's completion is then
   * reverted so its matches become editable again. This is the "cascade"
   * counterpart of revertRoundCompletion, which only works on the most
   * recently played round.
   *
   * Guarded to the swiss phase: top cut brackets are built from the final
   * standings and are not part of `rounds`, so this method cannot unwind them.
   */
  revertRoundsForEdit(roundNumber: RoundNumber): void {
    if (this.phase !== "swiss") {
      throw new Error(
        "Rounds can only be reverted for editing during the swiss phase",
      );
    }

    const targetRound = this.getRound(roundNumber);
    if (!targetRound.isCompleted()) {
      throw new Error(
        `Round ${roundNumber} must be completed before it can be reverted for editing`,
      );
    }
    if (roundNumber >= this.rounds.length) {
      throw new Error(
        `Round ${roundNumber} is the last round; use revertRoundCompletion instead`,
      );
    }

    // Undo every result granted by the rounds being removed, so player stats
    // (points, opponents, games, bye eligibility) match the state right after
    // round `roundNumber` was completed.
    for (const round of this.rounds) {
      if (round.getRoundNumber() <= roundNumber) continue;
      for (const match of round.getMatches()) {
        const result = match.getResult();
        if (match.isBye()) {
          const byePlayer = this.getPlayer(match.getPlayer1Id());
          if (byePlayer.hasHadBye()) {
            byePlayer.revertBye();
          }
          continue;
        }
        if (result.type === "pending") continue;

        match.revertResult();
        this.revertMatchStats(match, result);
      }
    }

    // Remove the later rounds.
    this.rounds = this.rounds.filter((r) => r.getRoundNumber() <= roundNumber);

    // Reopen the target round. Now that it is the last round, the existing
    // most-recently-played guard passes.
    this.revertRoundCompletion(roundNumber);
  }

  /**
   * Undoes the stats a single reported result granted: match points, the
   * opponent record, and the game record. Mirrors the revert logic of the
   * RevertMatchResult use-case (win = 3, draw = 1, double loss = 0).
   */
  private revertMatchStats(match: Match, result: MatchResult): void {
    const player1 = this.getPlayer(match.getPlayer1Id());
    const player2 = this.getPlayer(match.getPlayer2Id()!);
    const roundNumber = match.getRoundNumber();

    switch (result.type) {
      case "win": {
        const winner = result.winnerId === player1.getId() ? player1 : player2;
        const loser = result.winnerId === player1.getId() ? player2 : player1;
        const totalGames = result.winnerGames + result.loserGames;

        winner.revertMatchResult(
          loser.getId(),
          roundNumber,
          3,
          result.winnerGames,
          totalGames,
        );
        loser.revertMatchResult(
          winner.getId(),
          roundNumber,
          0,
          result.loserGames,
          totalGames,
        );
        break;
      }

      case "draw": {
        const totalGames = result.player1Games + result.player2Games;
        player1.revertMatchResult(
          player2.getId(),
          roundNumber,
          1,
          result.player1Games,
          totalGames,
        );
        player2.revertMatchResult(
          player1.getId(),
          roundNumber,
          1,
          result.player2Games,
          totalGames,
        );
        break;
      }

      case "double_loss": {
        const totalGames = result.player1Games + result.player2Games;
        player1.revertMatchResult(
          player2.getId(),
          roundNumber,
          0,
          result.player1Games,
          totalGames,
        );
        player2.revertMatchResult(
          player1.getId(),
          roundNumber,
          0,
          result.player2Games,
          totalGames,
        );
        break;
      }

      case "pending":
      case "bye":
        // Handled by the caller before this is invoked.
        break;
    }
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
      pairingMode: this.pairingMode,
      ruleset: this.ruleset,
      players: [...this.players],
      rounds: [...this.rounds],
      shareToken: this.shareToken,
    };
  }
}
