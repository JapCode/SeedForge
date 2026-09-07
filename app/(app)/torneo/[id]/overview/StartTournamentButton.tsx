"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Text, useToast } from "@once-ui-system/core";
import {
  startTournamentAction,
  startTournamentAndGenerateFirstRoundAction,
} from "../actions";
import type { PairingMode } from "@/domain/entities/Tournament";

/**
 * Starts the tournament and generates round 1 in one click, then navigates
 * to the new round. In manual/audit mode the tournament is only started and
 * the page navigates to `?emparejar=1`, which opens the manual pairing
 * dialog (owned by ManualPairingLauncher at the overview level, so it
 * survives the revalidatePath re-render that swaps this empty-state card).
 * Mirrors the RoundNav pattern: pending state on the button, errors as
 * inline text + danger toast.
 */
export const StartTournamentButton = ({
  tournamentId,
  pairingMode,
}: {
  tournamentId: string;
  pairingMode: PairingMode;
}) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  const isManual = pairingMode === "manual";

  function handleStart() {
    setError(null);
    startTransition(async () => {
      if (isManual) {
        const result = await startTournamentAction(tournamentId);
        if (result.error) {
          setError(result.error);
          addToast({ variant: "danger", message: result.error });
          return;
        }
        router.push(`/torneo/${tournamentId}?tab=tournament&emparejar=1`);
        return;
      }

      const result =
        await startTournamentAndGenerateFirstRoundAction(tournamentId);
      if (result.error) {
        setError(result.error);
        addToast({ variant: "danger", message: result.error });
        return;
      }
      router.push(`/torneo/${tournamentId}?tab=tournament&ronda=1`);
    });
  }

  return (
    <>
      <Button onClick={handleStart} loading={isPending} disabled={isPending}>
        {isPending
          ? "Iniciando..."
          : isManual
            ? "Iniciar y emparejar ronda 1"
            : "Iniciar torneo"}
      </Button>
      {error && (
        <Text onBackground="danger-weak" variant="body-default-s">
          {error}
        </Text>
      )}
    </>
  );
};
