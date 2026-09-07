import Link from "next/link";
import { Column, Row, Heading, Text } from "@once-ui-system/core";
import { Tournament } from "@/domain/entities/Tournament";
import { StandingsTable } from "@/components/tournament/StandingsTable";
import { ShareStandings } from "./ShareStandings";

export const StandingsView = ({ tournament }: { tournament: Tournament }) => {
  const currentRound = tournament.getCurrentRound();

  return (
    <Column fillWidth gap="24">
      <Row fillWidth horizontal="between" vertical="center" wrap gap="16">
        <Column gap="4">
          <Heading as="h2" variant="heading-strong-m">
            Clasificación
          </Heading>
          <Text onBackground="neutral-weak" variant="body-default-s">
            {tournament.getRounds().length} de{" "}
            {tournament.getTotalSwissRounds()} rondas jugadas
          </Text>
        </Column>
        <ShareStandings
          tournamentId={tournament.getId()}
          existingToken={tournament.getShareToken()}
        />
      </Row>

      {tournament.getPhase() === "swiss" &&
        currentRound &&
        !currentRound.isCompleted() && (
          <Link
            href={`/torneo/${tournament.getId()}/ronda/${currentRound.getRoundNumber()}`}
          >
            <Text onBackground="brand-weak">
              Cargar resultados de la ronda {currentRound.getRoundNumber()} →
            </Text>
          </Link>
        )}

      <StandingsTable tournament={tournament} />
    </Column>
  );
};
