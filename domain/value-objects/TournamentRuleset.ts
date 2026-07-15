export interface TournamentRulesetProps {
  allowDraws: boolean;
  matchTimeMinutes: number;
}

export class TournamentRuleset {
  private readonly allowDraws: boolean;
  private readonly matchTimeMinutes: number;

  private constructor(props: TournamentRulesetProps) {
    this.allowDraws = props.allowDraws;
    this.matchTimeMinutes = props.matchTimeMinutes;
  }

  /**
   * Konami policy in effect since July 29, 2025: draws were removed, time-outs
   * with a tied game score now resolve as a double loss, and match time was
   * extended to 50 minutes to compensate.
   */
  static current(): TournamentRuleset {
    return new TournamentRuleset({ allowDraws: false, matchTimeMinutes: 50 });
  }

  /**
   * Pre-July-2025 policy. Kept available in case Konami reinstates draws in
   * the future, or for organizers running under an older ruleset.
   */
  static legacy(): TournamentRuleset {
    return new TournamentRuleset({ allowDraws: true, matchTimeMinutes: 40 });
  }

  static fromProps(props: TournamentRulesetProps): TournamentRuleset {
    return new TournamentRuleset(props);
  }

  allowsDraws(): boolean {
    return this.allowDraws;
  }

  getMatchTimeMinutes(): number {
    return this.matchTimeMinutes;
  }

  toProps(): TournamentRulesetProps {
    return {
      allowDraws: this.allowDraws,
      matchTimeMinutes: this.matchTimeMinutes,
    };
  }
}
