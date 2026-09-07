import { Table, Text, Badge, Column } from "@once-ui-system/core";
import { Tournament } from "@/domain/entities/Tournament";
import { TiebreakerCalculator } from "@/domain/services/TiebreakerCalculator";
import { StandingsLegend } from "./StandingsLegend";
import { HeaderHelp } from "./HeaderHelp";

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
    <Column fillWidth gap="16">
      <Table
        data={{
          headers: [
            { content: "#", key: "position" },
            { content: "Jugador", key: "player" },
            { content: "Pts", key: "points" },
            {
              content: (
                <HeaderHelp
                  label="OMW%"
                  hint="Porcentaje de victorias de tus rivales · piso 33%"
                />
              ),
              key: "omw",
            },
            {
              content: (
                <HeaderHelp
                  label="OGW%"
                  hint="Porcentaje de victorias de los rivales de tus rivales"
                />
              ),
              key: "ogw",
            },
            {
              content: (
                <HeaderHelp
                  label="DDD"
                  hint="Suma de los cuadrados de las rondas perdidas · menor = mejor"
                />
              ),
              key: "ddd",
            },
          ],
          rows: standings.map((player, index) => {
            const tiebreakers = tiebreakersById.get(player.getId())!;
            return [
              <Text key="pos" variant="body-default-m">
                {index + 1}
              </Text>,
              <Text key="name" variant="body-default-m">
                {player.getName()}
                {player.isDropped() && (
                  <Badge
                    background="danger-weak"
                    onBackground="danger-strong"
                    style={{ marginLeft: "0.5rem" }}
                  >
                    Dropeado
                  </Badge>
                )}
              </Text>,
              <Text key="pts" variant="body-strong-m">
                {tiebreakers.matchPoints}
              </Text>,
              <Text
                key="omw"
                variant="body-default-s"
                onBackground="neutral-weak"
              >
                {formatPercent(tiebreakers.opponentsMatchWinPercentage)}
              </Text>,
              <Text
                key="ogw"
                variant="body-default-s"
                onBackground="neutral-weak"
              >
                {formatPercent(
                  tiebreakers.opponentsOpponentsMatchWinPercentage,
                )}
              </Text>,
              <Text
                key="ddd"
                variant="body-default-s"
                onBackground="neutral-weak"
              >
                {tiebreakers.sumOfSquaresOfLosses}
              </Text>,
            ];
          }),
        }}
      />

      <StandingsLegend />
    </Column>
  );
};
