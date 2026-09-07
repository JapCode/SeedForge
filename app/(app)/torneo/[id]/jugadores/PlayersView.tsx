import { Column, Heading, Text } from "@once-ui-system/core";
import { Tournament } from "@/domain/entities/Tournament";
import { TiebreakerCalculator } from "@/domain/services/TiebreakerCalculator";
import { RegisterPlayerForm } from "./RegisterPlayerForm";
import { PlayerList, PlayerRow } from "./PlayerList";

/**
 * Builds the roster rows shown by PlayerList. During registration the list
 * keeps registration order; once the event is running it follows the
 * standings order, so the roster doubles as a quick ranking and the position
 * number matches the row order.
 */
const buildRows = (
  tournament: Tournament,
  isRegistrationPhase: boolean,
): PlayerRow[] => {
  const players = tournament.getPlayers();

  if (isRegistrationPhase) {
    return players.map((player, index) => ({
      id: player.getId(),
      name: player.getName(),
      dropped: player.isDropped(),
      hadBye: player.hasHadBye(),
      position: index + 1,
      points: player.getPoints(),
    }));
  }

  const tiebreakersById = TiebreakerCalculator.calculateForAll(players);
  return [...players]
    .sort((a, b) =>
      TiebreakerCalculator.compare(
        tiebreakersById.get(a.getId())!,
        tiebreakersById.get(b.getId())!,
      ),
    )
    .map((player, index) => ({
      id: player.getId(),
      name: player.getName(),
      dropped: player.isDropped(),
      hadBye: player.hasHadBye(),
      position: index + 1,
      points: player.getPoints(),
    }));
};

export const PlayersView = ({ tournament }: { tournament: Tournament }) => {
  const isRegistrationPhase = tournament.getPhase() === "registration";
  const players = tournament.getPlayers();
  const activeCount = players.filter((player) => !player.isDropped()).length;
  const droppedCount = players.length - activeCount;

  const headerText = isRegistrationPhase
    ? `${players.length} ${players.length === 1 ? "inscripto" : "inscriptos"}`
    : droppedCount > 0
      ? `${activeCount} ${activeCount === 1 ? "activo" : "activos"} · ${droppedCount} ${droppedCount === 1 ? "dropeado" : "dropeados"}`
      : `${activeCount} ${activeCount === 1 ? "activo" : "activos"}`;

  return (
    <Column fillWidth gap="24">
      <Column gap="4">
        <Heading as="h2" variant="heading-strong-m">
          Jugadores
        </Heading>
        <Text onBackground="neutral-weak">{headerText}</Text>
      </Column>

      {isRegistrationPhase && (
        <RegisterPlayerForm tournamentId={tournament.getId()} />
      )}

      <PlayerList
        tournamentId={tournament.getId()}
        rows={buildRows(tournament, isRegistrationPhase)}
        isRegistrationPhase={isRegistrationPhase}
      />
    </Column>
  );
};
