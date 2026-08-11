import Link from "next/link";
import { notFound } from "next/navigation";
import { Column, Row, Heading, Text, Badge, Card } from "@once-ui-system/core";
import { getSessionUserId } from "@/infrastructure/auth/getSessionUserId";
import { useCases } from "@/infrastructure/composition-root";
import { TournamentPhase } from "@/domain/entities/Tournament";
import { ActionButton } from "./ActionButton";
import {
  startTournamentAction,
  generateNextRoundAction,
  advanceToTopCutAction,
  completeTournamentAction,
} from "./actions";

const phaseLabel: Record<TournamentPhase, string> = {
  registration: "Inscripción",
  swiss: "Fase suiza",
  top_cut: "Top Cut",
  completed: "Finalizado",
};

const TournamentDashboardPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  const userId = (await getSessionUserId())!; // (app)/layout.tsx already guarantees this

  const tournament = await useCases.getTournament
    .execute({ tournamentId: id, requestingUserId: userId })
    .catch(() => null);

  if (!tournament) {
    notFound();
  }

  const currentRound = tournament.getCurrentRound();
  const isSwissComplete = tournament.isSwissStageComplete();
  const readyForNextRound =
    tournament.getPhase() === "swiss" &&
    !isSwissComplete &&
    (!currentRound || currentRound.isCompleted());

  return (
    <Column fillWidth maxWidth={48} horizontal="center" paddingY="40" gap="32">
      <Row fillWidth horizontal="between" vertical="center">
        <Column gap="4">
          <Heading as="h1" variant="heading-strong-xl">
            {tournament.getName()}
          </Heading>
          <Text onBackground="neutral-weak">
            {tournament.getPlayers().length} jugadores ·{" "}
            {tournament.getTotalSwissRounds()} rondas suizas
            {tournament.getTopCutSize()
              ? ` · Top ${tournament.getTopCutSize()}`
              : ""}
          </Text>
        </Column>
        <Badge>{phaseLabel[tournament.getPhase()]}</Badge>
      </Row>

      <Row gap="12" wrap>
        <Link href={`/torneo/${tournament.getId()}/jugadores`}>
          <Card padding="16" radius="l" border>
            <Text variant="body-strong-m">Jugadores</Text>
            <Text onBackground="neutral-weak" variant="body-default-s">
              {tournament.getPlayers().length} inscriptos
            </Text>
          </Card>
        </Link>

        <Link href={`/torneo/${tournament.getId()}/standings`}>
          <Card padding="16" radius="l" border>
            <Text variant="body-strong-m">Standings</Text>
            <Text onBackground="neutral-weak" variant="body-default-s">
              Tabla de posiciones
            </Text>
          </Card>
        </Link>

        {tournament.getPhase() === "top_cut" && (
          <Link href={`/torneo/${tournament.getId()}/top-cut`}>
            <Card padding="16" radius="l" border>
              <Text variant="body-strong-m">Top Cut</Text>
              <Text onBackground="neutral-weak" variant="body-default-s">
                Ver bracket
              </Text>
            </Card>
          </Link>
        )}
      </Row>

      <Column
        fillWidth
        padding="24"
        radius="l"
        border
        background="surface"
        gap="16"
      >
        <Heading as="h2" variant="heading-strong-m">
          Acciones
        </Heading>

        {tournament.getPhase() === "registration" && (
          <ActionButton
            label={`Iniciar torneo (${tournament.getPlayers().length} jugadores)`}
            pendingLabel="Iniciando..."
            action={startTournamentAction.bind(null, tournament.getId())}
          />
        )}

        {readyForNextRound && (
          <ActionButton
            label={`Generar ronda ${tournament.getRounds().length + 1}`}
            pendingLabel="Generando..."
            action={generateNextRoundAction.bind(null, tournament.getId())}
          />
        )}

        {tournament.getPhase() === "swiss" &&
          currentRound &&
          !currentRound.isCompleted() && (
            <Link
              href={`/torneo/${tournament.getId()}/ronda/${currentRound.getRoundNumber()}`}
            >
              <Text onBackground="brand-weak">
                Ir a la ronda {currentRound.getRoundNumber()} en curso →
              </Text>
            </Link>
          )}

        {tournament.getPhase() === "swiss" &&
          isSwissComplete &&
          tournament.getTopCutSize() !== null && (
            <ActionButton
              label="Avanzar a Top Cut"
              pendingLabel="Avanzando..."
              action={advanceToTopCutAction.bind(null, tournament.getId())}
            />
          )}

        {tournament.getPhase() === "swiss" &&
          isSwissComplete &&
          tournament.getTopCutSize() === null && (
            <ActionButton
              label="Finalizar torneo"
              pendingLabel="Finalizando..."
              action={completeTournamentAction.bind(null, tournament.getId())}
            />
          )}

        {tournament.getPhase() === "completed" && (
          <Text onBackground="neutral-weak">
            Este torneo ya finalizó. Mirá los standings para ver el resultado
            final.
          </Text>
        )}
      </Column>
    </Column>
  );
};

export default TournamentDashboardPage;
