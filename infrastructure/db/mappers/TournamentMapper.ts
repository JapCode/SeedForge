import {
  Tournament,
  TournamentProps,
  TournamentPhase,
  TopCutSize,
  PairingMode,
} from "../../../domain/entities/Tournament";
import { Player, PlayerProps } from "../../../domain/entities/Player";
import { Round, RoundStatus } from "../../../domain/entities/Round";
import { Match, MatchProps } from "../../../domain/entities/Match";
import {
  TournamentRuleset,
  TournamentRulesetProps,
} from "../../../domain/value-objects/TournamentRuleset";

/**
 * Plain-JSON-safe shape of a Round for storage: unlike Round.toProps()
 * (which holds actual Match instances), every match here is already reduced
 * to MatchProps.
 */
interface SerializedRound {
  roundNumber: number;
  status: RoundStatus;
  matches: MatchProps[];
}

/** Plain-JSON-safe shape of the whole Tournament aggregate. */
export interface SerializedTournament {
  id: string;
  ownerId: string;
  name: string;
  phase: TournamentPhase;
  totalSwissRounds: number;
  topCutSize: TopCutSize;
  pairingMode: PairingMode;
  ruleset: TournamentRulesetProps;
  players: PlayerProps[];
  rounds: SerializedRound[];
  shareToken: string | null;
}

export class TournamentMapper {
  /** Domain aggregate -> plain object safe to JSON.stringify into jsonb. */
  static toSerializable(tournament: Tournament): SerializedTournament {
    const props = tournament.toProps();

    return {
      id: props.id,
      ownerId: props.ownerId,
      name: props.name,
      phase: props.phase,
      totalSwissRounds: props.totalSwissRounds,
      topCutSize: props.topCutSize,
      pairingMode: props.pairingMode,
      ruleset: props.ruleset.toProps(),
      players: props.players.map((player) => player.toProps()),
      rounds: props.rounds.map((round) => {
        const roundProps = round.toProps();
        return {
          roundNumber: roundProps.roundNumber,
          status: roundProps.status,
          matches: roundProps.matches.map((match) => match.toProps()),
        };
      }),
      shareToken: props.shareToken,
    };
  }

  /** Plain object read back from jsonb -> reconstructed domain aggregate. */
  static toDomain(data: SerializedTournament): Tournament {
    const players = data.players.map((playerProps) =>
      Player.fromProps(playerProps),
    );

    const rounds = data.rounds.map((serializedRound) =>
      Round.fromProps({
        roundNumber: serializedRound.roundNumber,
        status: serializedRound.status,
        matches: serializedRound.matches.map((matchProps) =>
          Match.fromProps(matchProps),
        ),
      }),
    );

    const props: TournamentProps = {
      id: data.id,
      ownerId: data.ownerId,
      name: data.name,
      phase: data.phase,
      totalSwissRounds: data.totalSwissRounds,
      topCutSize: data.topCutSize,
      // Tournaments persisted before the pairing mode existed have no field;
      // they are automatic by definition.
      pairingMode: data.pairingMode ?? "automatic",
      ruleset: TournamentRuleset.fromProps(data.ruleset),
      players,
      rounds,
      shareToken: data.shareToken,
    };

    return Tournament.fromProps(props);
  }
}
