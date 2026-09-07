"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Column, Row, Button, Text, useToast } from "@once-ui-system/core";
import {
  advanceToTopCutAction,
  completeTournamentAction,
  generateNextRoundAction,
} from "../actions";
import type { PairingMode } from "@/domain/entities/Tournament";

interface RoundNavProps {
  tournamentId: string;
  roundNumber: number;
  hasNextRound: boolean;
  canGenerateNext: boolean;
  isLastSwissRound: boolean;
  finalAction: "top_cut" | "complete" | null;
  hasPendingMatches: boolean;
  pairingMode: PairingMode;
}

/**
 * Round navigation shown below the round card on the overview: back to the
 * previous round, forward to the next one, or — on the last round with
 * rounds still to play — a button that generates the next round once every
 * result is reported. On the final configured swiss round, once it is
 * completed, the generate button is replaced by the tournament's next step:
 * advancing to the top cut (when configured) or finishing the tournament.
 * In manual/audit mode the generate button opens the pairing editor instead
 * of generating directly, so every round's pairings are confirmed by the
 * organizer. Help text and errors render full-width below the row, not
 * squeezed into the half-width of the buttons.
 */
export const RoundNav = ({
  tournamentId,
  roundNumber,
  hasNextRound,
  canGenerateNext,
  isLastSwissRound,
  finalAction,
  hasPendingMatches,
  pairingMode,
}: RoundNavProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  const isManual = pairingMode === "manual";

  function handleGenerate() {
    if (isManual) {
      // Audit mode: open the pairing editor (prefilled with the automatic
      // pairings) instead of generating directly.
      router.push(`/torneo/${tournamentId}?tab=tournament&emparejar=1`);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await generateNextRoundAction(tournamentId);
      if (result.error) {
        setError(result.error);
        addToast({ variant: "danger", message: result.error });
        return;
      }
      router.push(
        `/torneo/${tournamentId}?tab=tournament&ronda=${roundNumber + 1}`,
      );
    });
  }

  function handleAdvanceToTopCut() {
    setError(null);
    startTransition(async () => {
      const result = await advanceToTopCutAction(tournamentId);
      if (result.error) {
        setError(result.error);
        addToast({ variant: "danger", message: result.error });
        return;
      }
      router.push(`/torneo/${tournamentId}?tab=topcut`);
    });
  }

  function handleComplete() {
    setError(null);
    startTransition(async () => {
      const result = await completeTournamentAction(tournamentId);
      if (result.error) {
        setError(result.error);
        addToast({ variant: "danger", message: result.error });
        return;
      }
      router.push(`/torneo/${tournamentId}?tab=standings`);
    });
  }

  return (
    <Column fillWidth gap="12" center>
      <Row fillWidth wrap gap="12">
        {roundNumber > 1 ? (
          <Button
            href={`/torneo/${tournamentId}?tab=tournament&ronda=${
              roundNumber - 1
            }`}
            variant="secondary"
            prefixIcon="chevronLeft"
            style={{ flex: "1 1 0" }}
          >
            Ronda anterior
          </Button>
        ) : (
          <Button
            variant="secondary"
            disabled
            prefixIcon="chevronLeft"
            style={{ flex: "1 1 0" }}
          >
            Ronda anterior
          </Button>
        )}

        {hasNextRound ? (
          <Button
            href={`/torneo/${tournamentId}?tab=tournament&ronda=${
              roundNumber + 1
            }`}
            suffixIcon="chevronRight"
            style={{ flex: "1 1 0" }}
          >
            Siguiente ronda
          </Button>
        ) : canGenerateNext ? (
          <Button
            onClick={handleGenerate}
            loading={isPending}
            disabled={isPending || hasPendingMatches}
            suffixIcon="chevronRight"
            style={{ flex: "1 1 0" }}
          >
            {isManual
              ? `Emparejar ronda ${roundNumber + 1}`
              : `Generar ronda ${roundNumber + 1}`}
          </Button>
        ) : finalAction ? (
          <Button
            onClick={
              finalAction === "top_cut" ? handleAdvanceToTopCut : handleComplete
            }
            loading={isPending}
            suffixIcon="chevronRight"
            style={{ flex: "1 1 0" }}
          >
            {finalAction === "top_cut" ? "Ir al Top Cut" : "Finalizar torneo"}
          </Button>
        ) : (
          <Button disabled suffixIcon="chevronRight" style={{ flex: "1 1 0" }}>
            Siguiente ronda
          </Button>
        )}
      </Row>

      {canGenerateNext && hasPendingMatches && (
        <Text variant="body-default-s" onBackground="neutral-weak">
          Carga todos los resultados de la ronda para generar la siguiente.
        </Text>
      )}
      {isLastSwissRound && hasPendingMatches && (
        <Text variant="body-default-s" onBackground="neutral-weak">
          Carga todos los resultados de la ronda para finalizar la fase suiza.
        </Text>
      )}
      {error && (
        <Text onBackground="danger-weak" variant="body-default-s">
          {error}
        </Text>
      )}
    </Column>
  );
};
