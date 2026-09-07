import { Column, Row, Heading, Text, Card, Button } from "@once-ui-system/core";
import { Tournament } from "@/domain/entities/Tournament";
import { Round } from "@/domain/entities/Round";
import {
  SwissPairingService,
  ManualPairing,
} from "@/domain/services/SwissPairingService";
import { ConfirmActionButton } from "../../../_components/ConfirmActionButton";
import {
  revertRoundCompletionAction,
  revertRoundForEditAction,
} from "../ronda/[n]/actions";
import { revertTournamentCompletionAction } from "../actions";
import { EditableBracket } from "./EditableBracket";
import { RoundNav } from "./RoundNav";
import { StartTournamentButton } from "./StartTournamentButton";
import { ManualPairingLauncher } from "./ManualPairingLauncher";

/**
 * A single round shown as a card with each match rendered as an editable
 * two-player bracket. Below the card a nav row browses the tournament's
 * rounds: back to the previous round, forward to the next one, or — on the
 * last round with rounds still to play — a button that generates the next
 * round once every result is reported. On the final configured swiss round
 * the generate button gives way to the tournament's next step once the
 * round is completed (advance to top cut, or finish the tournament).
 */
const RoundViewer = ({
  tournament,
  round,
}: {
  tournament: Tournament;
  round: Round;
}) => {
  const roundNumber = round.getRoundNumber();
  const totalRounds = tournament.getRounds().length;
  const hasNextRound = roundNumber < totalRounds;
  const swissStageComplete = tournament.isSwissStageComplete();
  const hasPendingMatches = round.getPendingMatches().length > 0;
  const canGenerateNext =
    roundNumber === totalRounds &&
    tournament.getPhase() === "swiss" &&
    totalRounds < tournament.getTotalSwissRounds() &&
    !swissStageComplete;
  const isLastSwissRound =
    tournament.getPhase() === "swiss" &&
    roundNumber === tournament.getTotalSwissRounds();
  const finalAction =
    isLastSwissRound && !hasPendingMatches
      ? tournament.getTopCutSize() !== null
        ? "top_cut"
        : "complete"
      : null;
  const playerName = (playerId: string) =>
    tournament.getPlayer(playerId).getName();

  return (
    <Column fillWidth gap="12">
      <Column fillWidth padding="20" radius="l" border gap="12">
        <Row fillWidth horizontal="between" vertical="center" wrap gap="12">
          <Heading as="h2" variant="heading-strong-m">
            Ronda {roundNumber}
          </Heading>
          {tournament.getPhase() === "completed" ? (
            <ConfirmActionButton
              label="Revertir finalización del torneo"
              pendingLabel="Revirtiendo..."
              confirmTitle="¿Revertir la finalización del torneo?"
              confirmDescription="El torneo volverá a estar en curso y podrás modificar resultados o finalizarlo de nuevo."
              confirmLabel="Revertir"
              variant="secondary"
              confirmVariant="danger"
              successMessage="Finalización revertida."
              action={revertTournamentCompletionAction.bind(
                null,
                tournament.getId(),
              )}
            />
          ) : round.isCompleted() && roundNumber === totalRounds ? (
            <ConfirmActionButton
              label="Revertir finalización de ronda"
              pendingLabel="Revirtiendo..."
              confirmTitle="¿Revertir la finalización?"
              confirmDescription="La ronda volverá a estar en curso y los resultados podrán modificarse."
              confirmLabel="Revertir"
              variant="secondary"
              confirmVariant="danger"
              successMessage="Finalización revertida."
              action={revertRoundCompletionAction.bind(
                null,
                tournament.getId(),
                roundNumber,
              )}
            />
          ) : round.isCompleted() && tournament.getPhase() === "swiss" ? (
            <ConfirmActionButton
              label="Editar esta ronda"
              icon="refresh"
              pendingLabel="Eliminando..."
              confirmTitle={`¿Editar la ronda ${roundNumber}?`}
              confirmDescription={`Se van a eliminar las rondas posteriores a la ${roundNumber} y sus resultados. Después podrás generar una nueva ronda con las parejas recalculadas.`}
              confirmLabel="Eliminar y editar"
              variant="secondary"
              confirmVariant="danger"
              successMessage="Rondas posteriores eliminadas. Puedes corregir los resultados."
              action={revertRoundForEditAction.bind(
                null,
                tournament.getId(),
                roundNumber,
              )}
            />
          ) : null}
        </Row>

        <Row fillWidth wrap gap="12">
          {round.getMatches().map((match) => (
            <EditableBracket
              key={match.getId()}
              style={{ flex: "1 1 calc(50% - 6px)", minWidth: "15rem" }}
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
              allowDraws={tournament.getRuleset().allowsDraws()}
            />
          ))}
        </Row>
      </Column>

      <RoundNav
        tournamentId={tournament.getId()}
        roundNumber={roundNumber}
        hasNextRound={hasNextRound}
        canGenerateNext={canGenerateNext}
        isLastSwissRound={isLastSwissRound}
        finalAction={finalAction}
        hasPendingMatches={hasPendingMatches}
        pairingMode={tournament.getPairingMode()}
      />
    </Column>
  );
};

/**
 * Tournament overview: a round browser. Shows the round selected via
 * `?ronda=N` (falling back to the current round) as a card of two-player
 * brackets, with navigation to the previous/next round and a button to
 * generate the next round once the current one is fully reported. Also owns
 * the audit-mode pairing dialog (`?emparejar=1`), mounted outside the
 * empty-state cards so it survives the revalidatePath re-renders that swap
 * them.
 */
export const OverviewView = ({
  tournament,
  roundNumber,
  emparejar,
}: {
  tournament: Tournament;
  roundNumber?: number;
  emparejar?: boolean;
}) => {
  const rounds = tournament.getRounds();
  const pairingPlayers = tournament
    .getActivePlayers()
    .map((player) => ({ id: player.getId(), name: player.getName() }));
  const selectedRound =
    roundNumber !== undefined
      ? (rounds.find((round) => round.getRoundNumber() === roundNumber) ??
        tournament.getCurrentRound())
      : tournament.getCurrentRound();

  // Audit mode: the pairing dialog opens prefilled with the automatic
  // pairings for the next round as an editable baseline. Round 1 has no
  // meaningful automatic default (it's a random draw), so it opens empty.
  // Only computed while the dialog is open, and only when a previous round
  // exists; if the automatic search finds no valid pairing, the editor opens
  // empty and the organizer enters the pairings manually.
  const emparejarOpen = emparejar === true;
  const nextRoundNumber = rounds.length + 1;
  let initialPairs: ManualPairing[] = [];
  if (emparejarOpen && rounds.length > 0) {
    try {
      const autoRound = SwissPairingService.generateNextRound(tournament);
      initialPairs = autoRound.getMatches().map((match) => ({
        player1Id: match.getPlayer1Id(),
        player2Id: match.getPlayer2Id(),
      }));
    } catch {
      initialPairs = [];
    }
  }

  return (
    <>
      <ManualPairingLauncher
        tournamentId={tournament.getId()}
        players={pairingPlayers}
        roundNumber={nextRoundNumber}
        initialPairs={initialPairs}
        isOpen={emparejarOpen}
      />

      {!selectedRound ? (
        <EmptyState tournament={tournament} />
      ) : (
        <RoundViewer tournament={tournament} round={selectedRound} />
      )}
    </>
  );
};

/**
 * Empty state shown while the tournament has no rounds yet: registration
 * phase offers the start button (which in manual/audit mode navigates to
 * `?emparejar=1`), and a started manual tournament offers the pairing entry
 * point directly.
 */
const EmptyState = ({ tournament }: { tournament: Tournament }) => {
  const playerCount = tournament.getPlayers().length;
  const isRegistration = tournament.getPhase() === "registration";

  if (isRegistration) {
    const canStart = playerCount >= 2;
    const message =
      playerCount === 0
        ? "Todavía no hay jugadores registrados."
        : playerCount === 1
          ? "Necesitás al menos 2 jugadores para iniciar el torneo."
          : `${playerCount} jugadores listos para empezar.`;

    return (
      <Card fillWidth padding="24" radius="l" border background="surface">
        <Row fillWidth horizontal="between" vertical="center" wrap gap="12">
          <Text variant="body-default-s" onBackground="neutral-weak">
            {message}
          </Text>
          {canStart ? (
            <StartTournamentButton
              tournamentId={tournament.getId()}
              pairingMode={tournament.getPairingMode()}
            />
          ) : (
            <Button
              href={`/torneo/${tournament.getId()}?tab=players`}
              variant="secondary"
              size="s"
            >
              Agregar jugadores
            </Button>
          )}
        </Row>
      </Card>
    );
  }

  // Manual/audit tournaments start without a round: the organizer enters
  // round 1's real pairings instead of letting the Swiss service generate
  // them, so the empty state must offer that entry point.
  if (tournament.getPairingMode() === "manual") {
    return (
      <Card fillWidth padding="24" radius="l" border background="surface">
        <Row fillWidth horizontal="between" vertical="center" wrap gap="12">
          <Text variant="body-default-s" onBackground="neutral-weak">
            El torneo está iniciado. Carga las parejas reales de la ronda 1.
          </Text>
          <Button
            href={`/torneo/${tournament.getId()}?tab=tournament&emparejar=1`}
          >
            Emparejar ronda 1 manualmente
          </Button>
        </Row>
      </Card>
    );
  }

  return (
    <Card fillWidth padding="24" radius="l" border background="surface">
      <Text variant="body-default-s" onBackground="neutral-weak">
        Todavía no hay rondas generadas.
      </Text>
    </Card>
  );
};
