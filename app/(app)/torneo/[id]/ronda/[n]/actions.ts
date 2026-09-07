"use server";

import { revalidatePath } from "next/cache";
import { useCases } from "@/infrastructure/composition-root";
import { getSessionUserId } from "@/infrastructure/auth/getSessionUserId";
import { MatchResultInput } from "@/application/use-cases/RegisterMatchResult";

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

export async function registerMatchResultAction(
  tournamentId: string,
  roundNumber: number,
  matchId: string,
  result: MatchResultInput,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await useCases.registerMatchResult.execute({
      tournamentId,
      requestingUserId: userId,
      roundNumber,
      matchId,
      result,
    });
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "No se pudo registrar el resultado.",
    };
  }
  revalidatePath(`/torneo/${tournamentId}/ronda/${roundNumber}`);
  revalidatePath(`/torneo/${tournamentId}`);
  return { error: null };
}

export async function revertMatchResultAction(
  tournamentId: string,
  roundNumber: number,
  matchId: string,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await useCases.revertMatchResult.execute({
      tournamentId,
      requestingUserId: userId,
      roundNumber,
      matchId,
    });
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "No se pudo revertir el resultado.",
    };
  }
  revalidatePath(`/torneo/${tournamentId}/ronda/${roundNumber}`);
  revalidatePath(`/torneo/${tournamentId}`);
  return { error: null };
}

export async function completeRoundAction(
  tournamentId: string,
  roundNumber: number,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await useCases.completeRound.execute({
      tournamentId,
      requestingUserId: userId,
      roundNumber,
    });
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "No se pudo completar la ronda.",
    };
  }
  revalidatePath(`/torneo/${tournamentId}/ronda/${roundNumber}`);
  revalidatePath(`/torneo/${tournamentId}`);
  return { error: null };
}

export async function revertRoundCompletionAction(
  tournamentId: string,
  roundNumber: number,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await useCases.revertRoundCompletion.execute({
      tournamentId,
      requestingUserId: userId,
      roundNumber,
    });
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "No se pudo revertir la ronda.",
    };
  }
  revalidatePath(`/torneo/${tournamentId}/ronda/${roundNumber}`);
  revalidatePath(`/torneo/${tournamentId}`);
  return { error: null };
}

export async function revertRoundForEditAction(
  tournamentId: string,
  roundNumber: number,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await useCases.revertRoundForEdit.execute({
      tournamentId,
      requestingUserId: userId,
      roundNumber,
    });
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "No se pudo revertir la ronda.",
    };
  }
  revalidatePath(`/torneo/${tournamentId}/ronda/${roundNumber}`);
  revalidatePath(`/torneo/${tournamentId}`);
  return { error: null };
}
