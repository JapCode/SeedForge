import { notFound } from "next/navigation";
import { Column, Row, Heading, Text, Badge } from "@once-ui-system/core";
import { getSessionUserId } from "@/infrastructure/auth/getSessionUserId";
import { useCases } from "@/infrastructure/composition-root";
import { ActionButton } from "../ActionButton";
import { RegisterPlayerForm } from "./RegisterPlayerForm";
import { unregisterPlayerAction, dropPlayerAction } from "./actions";

const PlayersPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const userId = (await getSessionUserId())!;

  const tournament = await useCases.getTournament
    .execute({ tournamentId: id, requestingUserId: userId })
    .catch(() => null);

  if (!tournament) {
    notFound();
  }

  const isRegistrationPhase = tournament.getPhase() === "registration";
  const players = tournament.getPlayers();

  return (
    <Column fillWidth maxWidth={48} horizontal="center" paddingY="40" gap="32">
      <Column gap="4">
        <Heading as="h1" variant="heading-strong-xl">
          Jugadores — {tournament.getName()}
        </Heading>
        <Text onBackground="neutral-weak">{players.length} inscriptos</Text>
      </Column>

      {isRegistrationPhase && (
        <RegisterPlayerForm tournamentId={tournament.getId()} />
      )}

      <Column fillWidth gap="8">
        {players.length === 0 && (
          <Text onBackground="neutral-weak">
            Todavía no hay jugadores registrados.
          </Text>
        )}

        {players.map((player) => (
          <Row
            key={player.getId()}
            fillWidth
            horizontal="between"
            vertical="center"
            padding="12"
            radius="m"
            border
          >
            <Row gap="8" vertical="center">
              <Text variant="body-default-m">{player.getName()}</Text>
              {player.isDropped() && (
                <Badge background="danger-weak" onBackground="danger-strong">
                  Dropeado
                </Badge>
              )}
            </Row>

            {isRegistrationPhase && (
              <ActionButton
                label="Quitar"
                pendingLabel="Quitando..."
                variant="tertiary"
                action={unregisterPlayerAction.bind(
                  null,
                  tournament.getId(),
                  player.getId(),
                )}
              />
            )}

            {!isRegistrationPhase && !player.isDropped() && (
              <ActionButton
                label="Dropear"
                pendingLabel="Dropeando..."
                variant="danger"
                action={dropPlayerAction.bind(
                  null,
                  tournament.getId(),
                  player.getId(),
                )}
              />
            )}
          </Row>
        ))}
      </Column>
    </Column>
  );
};

export default PlayersPage;
