import { notFound } from "next/navigation";
import { Column, Row, Heading, Text, Badge } from "@once-ui-system/core";
import { getSessionUserId } from "@/infrastructure/auth/getSessionUserId";
import { useCases } from "@/infrastructure/composition-root";
import { ActionButton } from "../../ActionButton";
import { MatchRow } from "./MatchRow";
import { completeRoundAction, revertRoundCompletionAction } from "./actions";

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

  return (
    <Column fillWidth maxWidth={48} horizontal="center" paddingY="40" gap="32">
      <Row fillWidth horizontal="between" vertical="center">
        <Column gap="4">
          <Heading as="h1" variant="heading-strong-xl">
            Ronda {roundNumber}
          </Heading>
          <Text onBackground="neutral-weak">{tournament.getName()}</Text>
        </Column>
        <Badge>{round.isCompleted() ? "Completada" : "En curso"}</Badge>
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
        {!round.isCompleted() ? (
          <ActionButton
            label="Completar ronda"
            pendingLabel="Completando..."
            action={completeRoundAction.bind(
              null,
              tournament.getId(),
              roundNumber,
            )}
          />
        ) : (
          <ActionButton
            label="Revertir finalización de ronda"
            pendingLabel="Revirtiendo..."
            variant="danger"
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
