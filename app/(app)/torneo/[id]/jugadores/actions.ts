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

export async function registerPlayerAction(
  tournamentId: string,
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const playerName = String(formData.get("playerName") ?? "").trim();

  try {
    const userId = await requireUserId();
    await useCases.registerPlayer.execute({
      tournamentId,
      requestingUserId: userId,
      playerName,
    });
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "No se pudo registrar el jugador.",
    };
  }

  revalidatePath(`/torneo/${tournamentId}/jugadores`);
  return { error: null };
}

export async function unregisterPlayerAction(
  tournamentId: string,
  playerId: string,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await useCases.unregisterPlayer.execute({
      tournamentId,
      requestingUserId: userId,
      playerId,
    });
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "No se pudo quitar al jugador.",
    };
  }
  revalidatePath(`/torneo/${tournamentId}/jugadores`);
  return { error: null };
}

export async function dropPlayerAction(
  tournamentId: string,
  playerId: string,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await useCases.dropPlayer.execute({
      tournamentId,
      requestingUserId: userId,
      playerId,
    });
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "No se pudo dropear al jugador.",
    };
  }
  revalidatePath(`/torneo/${tournamentId}/jugadores`);
  return { error: null };
}
