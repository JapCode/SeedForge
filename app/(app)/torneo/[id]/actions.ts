"use server";

import { revalidatePath } from "next/cache";
import { useCases } from "@/infrastructure/composition-root";
import { getSessionUserId } from "@/infrastructure/auth/getSessionUserId";

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

export async function generateNextRoundAction(
  tournamentId: string,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await useCases.generateNextRound.execute({
      tournamentId,
      requestingUserId: userId,
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
