import { notFound } from "next/navigation";
import {
  Column,
  Row,
  Heading,
  Text,
  Badge,
  SmartLink,
} from "@once-ui-system/core";
import type { Colors } from "@once-ui-system/core";
import { getSessionUserId } from "@/infrastructure/auth/getSessionUserId";
import { useCases } from "@/infrastructure/composition-root";
import { ConfirmActionButton } from "../../../../_components/ConfirmActionButton";
import { MatchRow } from "./MatchRow";
import { completeRoundAction, revertRoundCompletionAction } from "./actions";
import { revertTournamentCompletionAction } from "../../actions";

const roundStatusBadge: {
  [key: string]: { label: string; background: Colors; onBackground: Colors };
} = {
  inProgress: {
    label: "En curso",
    background: "brand-weak",
    onBackground: "brand-strong",
  },
  completed: {
    label: "Completada",
    background: "success-weak",
    onBackground: "success-strong",
  },
};

const RoundPage = async ({
  params,
}: {
  params: Promise<{ id: string; n: string }>;
}) => {
  const { id, n } = await params;
  const roundNumber = Number(n);
  const userId = (await getSessionUserId())!;

  const tournament = await useCases.getTournament
    .execute({ tournamentId: id, requestingUserId: userId })
    .catch(() => null);

  if (!tournament) {
    notFound();
  }

  let round;
  try {
    round = tournament.getRound(roundNumber);
  } catch {
    notFound();
  }

  const playerName = (playerId: string) =>
    tournament.getPlayer(playerId).getName();
  const allowDraws = tournament.getRuleset().allowsDraws();
  const status = round.isCompleted() ? "completed" : "inProgress";
  const badge = roundStatusBadge[status];

  return (
    <Column fillWidth maxWidth={48} horizontal="center" paddingY="40" gap="32">
      <Row fillWidth horizontal="between" vertical="center" wrap gap="16">
        <Column gap="4">
          <Row gap="12" vertical="center">
            <Heading as="h1" variant="heading-strong-xl">
              Ronda {roundNumber}
            </Heading>
            <Badge
              background={badge.background}
              onBackground={badge.onBackground}
            >
              {badge.label}
            </Badge>
          </Row>
          <SmartLink href={`/torneo/${tournament.getId()}`} unstyled>
            <Text onBackground="neutral-weak" variant="body-default-s">
              ← {tournament.getName()}
            </Text>
          </SmartLink>
        </Column>
      </Row>

      <Column fillWidth gap="12">
        {round.getMatches().map((match) => (
          <MatchRow
            key={match.getId()}
            tournamentId={tournament.getId()}
            roundNumber={roundNumber}
            matchId={match.getId()}
            tableNumber={match.getTableNumber()}
            player1Id={match.getPlayer1Id()}
            player1Name={playerName(match.getPlayer1Id())}
            player2Id={match.getPlayer2Id()}
            player2Name={
              match.getPlayer2Id() ? playerName(match.getPlayer2Id()!) : null
            }
            isBye={match.isBye()}
            result={match.getResult()}
            allowDraws={allowDraws}
          />
        ))}
      </Column>

      <Row>
        {tournament.getPhase() === "completed" ? (
          <ConfirmActionButton
            label="Revertir finalización del torneo"
            pendingLabel="Revirtiendo..."
            confirmTitle="¿Revertir la finalización del torneo?"
            confirmDescription="El torneo volverá a estar en curso y podrás modificar resultados o finalizarlo de nuevo."
            confirmLabel="Revertir"
            variant="danger"
            successMessage="Finalización revertida."
            action={revertTournamentCompletionAction.bind(
              null,
              tournament.getId(),
            )}
          />
        ) : !round.isCompleted() ? (
          <ConfirmActionButton
            label="Completar ronda"
            pendingLabel="Completando..."
            confirmTitle="¿Completar la ronda?"
            confirmDescription="La ronda quedará cerrada y se podrá generar la siguiente."
            confirmLabel="Completar"
            successMessage="Ronda completada."
            action={completeRoundAction.bind(
              null,
              tournament.getId(),
              roundNumber,
            )}
          />
        ) : (
          <ConfirmActionButton
            label="Revertir finalización de ronda"
            pendingLabel="Revirtiendo..."
            confirmTitle="¿Revertir la finalización?"
            confirmDescription="La ronda volverá a estar en curso y los resultados podrán modificarse."
            confirmLabel="Revertir"
            variant="danger"
            successMessage="Finalización revertida."
            action={revertRoundCompletionAction.bind(
              null,
              tournament.getId(),
              roundNumber,
            )}
          />
        )}
      </Row>
    </Column>
  );
};

export default RoundPage;
