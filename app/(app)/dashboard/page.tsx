import {
  Column,
  Row,
  Heading,
  Text,
  Button,
  Card,
  Badge,
} from "@once-ui-system/core";
import { getSessionUserId } from "@/infrastructure/auth/getSessionUserId";
import { useCases } from "@/infrastructure/composition-root";
import { TournamentPhase } from "@/domain/entities/Tournament";

const phaseLabel: Record<TournamentPhase, string> = {
  registration: "Inscripción",
  swiss: "Fase suiza",
  top_cut: "Top Cut",
  completed: "Finalizado",
};

const MyTournamentsPage = async () => {
  const userId = (await getSessionUserId())!; // layout already guarantees this

  const tournaments = await useCases.listTournaments.execute({
    requestingUserId: userId,
  });

  return (
    <Column fillWidth maxWidth={48} horizontal="center" paddingY="40" gap="32">
      <Row fillWidth horizontal="between" vertical="center">
        <Heading as="h1" variant="heading-strong-xl">
          Mis torneos
        </Heading>
        <Button href="/crear" prefixIcon="plus">
          Crear torneo
        </Button>
      </Row>

      {tournaments.length === 0 ? (
        <Column
          fillWidth
          padding="40"
          radius="l"
          border
          background="surface"
          horizontal="center"
          gap="8"
        >
          <Text onBackground="neutral-weak">
            Todavía no creaste ningún torneo.
          </Text>
          <Button href="/crear" variant="secondary">
            Crear el primero
          </Button>
        </Column>
      ) : (
        <Column fillWidth gap="12">
          {tournaments.map((tournament) => (
            <Card
              key={tournament.getId()}
              href={`/torneo/${tournament.getId()}`}
              fillWidth
              padding="20"
              radius="l"
              border
            >
              <Row fillWidth horizontal="between" vertical="center">
                <Column gap="4">
                  <Text variant="body-strong-l">{tournament.getName()}</Text>
                  <Text onBackground="neutral-weak" variant="body-default-s">
                    {tournament.getPlayers().length} jugadores ·{" "}
                    {tournament.getTotalSwissRounds()} rondas suizas
                  </Text>
                </Column>
                <Badge>{phaseLabel[tournament.getPhase()]}</Badge>
              </Row>
            </Card>
          ))}
        </Column>
      )}
    </Column>
  );
};

export default MyTournamentsPage;
