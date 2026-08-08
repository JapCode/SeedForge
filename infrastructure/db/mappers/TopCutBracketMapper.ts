import {
  TopCutBracket,
  TopCutBracketProps,
} from "../../../domain/entities/TopCutBracket";
import {
  BracketMatch,
  BracketMatchProps,
} from "../../../domain/entities/BracketMatch";

export interface SerializedTopCutBracket {
  size: number;
  rounds: BracketMatchProps[][];
}

export class TopCutBracketMapper {
  static toSerializable(bracket: TopCutBracket): SerializedTopCutBracket {
    const props = bracket.toProps();
    return {
      size: props.size,
      rounds: props.rounds.map((round) =>
        round.map((match) => match.toProps()),
      ),
    };
  }

  static toDomain(data: SerializedTopCutBracket): TopCutBracket {
    const props: TopCutBracketProps = {
      size: data.size,
      rounds: data.rounds.map((round) =>
        round.map((matchProps) => BracketMatch.fromProps(matchProps)),
      ),
    };
    return TopCutBracket.fromProps(props);
  }
}
