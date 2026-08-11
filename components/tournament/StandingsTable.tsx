import { Column, Row, Text, Badge } from "@once-ui-system/core";
import { Tournament } from "@/domain/entities/Tournament";
import { TiebreakerCalculator } from "@/domain/services/TiebreakerCalculator";

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export const StandingsTable = ({ tournament }: { tournament: Tournament }) => {
  const players = tournament.getPlayers();
  const tiebreakersById = TiebreakerCalculator.calculateForAll(players);
  const standings = [...players].sort((a, b) =>
    TiebreakerCalculator.compare(
      tiebreakersById.get(a.getId())!,
      tiebreakersById.get(b.getId())!,
    ),
  );

  if (standings.length === 0) {
    return (
      <Text onBackground="neutral-weak">
        Todavía no hay jugadores registrados.
      </Text>
    );
  }

  return (
    <Column fillWidth gap="4">
      <Row fillWidth paddingX="12" paddingY="8" gap="12">
        <Text
          variant="label-default-s"
          onBackground="neutral-weak"
          style={{ width: "2rem" }}
        >
          #
        </Text>
        <Text
          variant="label-default-s"
          onBackground="neutral-weak"
          style={{ flex: 1 }}
        >
          Jugador
        </Text>
        <Text
          variant="label-default-s"
          onBackground="neutral-weak"
          style={{ width: "3rem" }}
        >
          Pts
        </Text>
        <Text
          variant="label-default-s"
          onBackground="neutral-weak"
          style={{ width: "4rem" }}
        >
          OMW%
        </Text>
        <Text
          variant="label-default-s"
          onBackground="neutral-weak"
          style={{ width: "4rem" }}
        >
          GW%
        </Text>
        <Text
          variant="label-default-s"
          onBackground="neutral-weak"
          style={{ width: "4rem" }}
        >
          OGW%
        </Text>
      </Row>

      {standings.map((player, index) => {
        const tiebreakers = tiebreakersById.get(player.getId())!;
        return (
          <Row
            key={player.getId()}
            fillWidth
            padding="12"
            radius="m"
            border
            gap="12"
            vertical="center"
          >
            <Text variant="body-default-m" style={{ width: "2rem" }}>
              {index + 1}
            </Text>
            <Row gap="8" vertical="center" style={{ flex: 1 }}>
              <Text variant="body-default-m">{player.getName()}</Text>
              {player.isDropped() && (
                <Badge background="danger-weak" onBackground="danger-strong">
                  Dropeado
                </Badge>
              )}
            </Row>
            <Text variant="body-strong-m" style={{ width: "3rem" }}>
              {tiebreakers.matchPoints}
            </Text>
            <Text
              variant="body-default-s"
              onBackground="neutral-weak"
              style={{ width: "4rem" }}
            >
              {formatPercent(tiebreakers.opponentsMatchWinPercentage)}
            </Text>
            <Text
              variant="body-default-s"
              onBackground="neutral-weak"
              style={{ width: "4rem" }}
            >
              {formatPercent(tiebreakers.gameWinPercentage)}
            </Text>
            <Text
              variant="body-default-s"
              onBackground="neutral-weak"
              style={{ width: "4rem" }}
            >
              {formatPercent(tiebreakers.opponentsGameWinPercentage)}
            </Text>
          </Row>
        );
      })}
    </Column>
  );
};
