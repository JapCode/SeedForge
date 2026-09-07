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

export async function reportBracketMatchWinnerAction(
  tournamentId: string,
  roundIndex: number,
  position: number,
  winnerId: string,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await useCases.reportBracketMatchWinner.execute({
      tournamentId,
      requestingUserId: userId,
      roundIndex,
      position,
      winnerId,
    });
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "No se pudo registrar el ganador.",
    };
  }
  revalidatePath(`/torneo/${tournamentId}`);
  return { error: null };
}

export async function revertBracketMatchWinnerAction(
  tournamentId: string,
  roundIndex: number,
  position: number,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await useCases.revertBracketMatchWinner.execute({
      tournamentId,
      requestingUserId: userId,
      roundIndex,
      position,
    });
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "No se pudo revertir el ganador.",
    };
  }
  revalidatePath(`/torneo/${tournamentId}`);
  return { error: null };
}
