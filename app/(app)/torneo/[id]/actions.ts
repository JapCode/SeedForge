"use server";

import { revalidatePath } from "next/cache";
import { useCases } from "@/infrastructure/composition-root";
import { getSessionUserId } from "@/infrastructure/auth/getSessionUserId";
import type { ManualPairing } from "@/domain/services/SwissPairingService";

export interface ActionResult {
  error: string | null;
}

async function requireUserId(): Promise<string> {
  const userId = await getSessionUserId();
  if (!userId) {
    throw new Error("Tu sesión expiró. Volvé a iniciar sesión.");
  }
  return userId;
}

export async function startTournamentAction(
  tournamentId: string,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await useCases.startTournament.execute({
      tournamentId,
      requestingUserId: userId,
    });
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "No se pudo iniciar el torneo.",
    };
  }
  revalidatePath(`/torneo/${tournamentId}`);
  return { error: null };
}

/**
 * Starts the tournament and immediately generates round 1, so the overview
 * lands in a working state after a single click (starting alone would leave
 * the tournament with no rounds and no way to generate the first one from
 * the empty state).
 */
export async function startTournamentAndGenerateFirstRoundAction(
  tournamentId: string,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await useCases.startTournament.execute({
      tournamentId,
      requestingUserId: userId,
    });
    await useCases.generateNextRound.execute({
      tournamentId,
      requestingUserId: userId,
    });
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "No se pudo iniciar el torneo.",
    };
  }
  revalidatePath(`/torneo/${tournamentId}`);
  return { error: null };
}

export interface GenerateNextRoundOptions {
  /**
   * Organizer-provided pairings for the round, used instead of automatic
   * generation. In manual/audit mode every round is confirmed through the
   * pairing editor, which prefills these with the automatic pairings as an
   * editable baseline.
   */
  manualPairings?: ManualPairing[];
}

export async function generateNextRoundAction(
  tournamentId: string,
  options?: GenerateNextRoundOptions,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const tournament = await useCases.getTournament.execute({
      tournamentId,
      requestingUserId: userId,
    });

    // The domain only allows generating the next round once the current one is
    // completed. When every result is already reported, complete the round
    // implicitly so the overview's "generar ronda" button works right after
    // the last result is entered (completing is otherwise a separate step on
    // the round page). If results are still missing, completeRound throws and
    // the error surfaces to the caller.
    const currentRound = tournament.getCurrentRound();
    if (currentRound && !currentRound.isCompleted()) {
      await useCases.completeRound.execute({
        tournamentId,
        requestingUserId: userId,
        roundNumber: currentRound.getRoundNumber(),
      });
    }

    await useCases.generateNextRound.execute({
      tournamentId,
      requestingUserId: userId,
      manualPairings: options?.manualPairings,
    });
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "No se pudo generar la ronda.",
    };
  }
  revalidatePath(`/torneo/${tournamentId}`);
  return { error: null };
}

export async function advanceToTopCutAction(
  tournamentId: string,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const tournament = await useCases.getTournament.execute({
      tournamentId,
      requestingUserId: userId,
    });

    // Same implicit completion as generateNextRoundAction: the overview's
    // "Ir al Top Cut" button appears as soon as every result of the last
    // swiss round is reported, so complete the round first when needed. If
    // results are still missing, completeRound throws and the error surfaces
    // to the caller.
    const currentRound = tournament.getCurrentRound();
    if (currentRound && !currentRound.isCompleted()) {
      await useCases.completeRound.execute({
        tournamentId,
        requestingUserId: userId,
        roundNumber: currentRound.getRoundNumber(),
      });
    }

    await useCases.advanceToTopCut.execute({
      tournamentId,
      requestingUserId: userId,
    });
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "No se pudo avanzar a Top Cut.",
    };
  }
  revalidatePath(`/torneo/${tournamentId}`);
  return { error: null };
}

export async function completeTournamentAction(
  tournamentId: string,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const tournament = await useCases.getTournament.execute({
      tournamentId,
      requestingUserId: userId,
    });

    // Same implicit completion as advanceToTopCutAction / generateNextRoundAction:
    // the overview's "Finalizar torneo" button appears as soon as every result
    // of the last swiss round is reported, so complete the round first when
    // needed. If results are still missing, completeRound throws and the error
    // surfaces to the caller.
    const currentRound = tournament.getCurrentRound();
    if (currentRound && !currentRound.isCompleted()) {
      await useCases.completeRound.execute({
        tournamentId,
        requestingUserId: userId,
        roundNumber: currentRound.getRoundNumber(),
      });
    }

    await useCases.completeTournament.execute({
      tournamentId,
      requestingUserId: userId,
    });
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "No se pudo finalizar el torneo.",
    };
  }
  revalidatePath(`/torneo/${tournamentId}`);
  return { error: null };
}

export async function revertTournamentCompletionAction(
  tournamentId: string,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await useCases.revertTournamentCompletion.execute({
      tournamentId,
      requestingUserId: userId,
    });
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "No se pudo revertir la finalización.",
    };
  }
  revalidatePath(`/torneo/${tournamentId}`);
  return { error: null };
}
