"use server";

import { useCases } from "@/infrastructure/composition-root";
import { getSessionUserId } from "@/infrastructure/auth/getSessionUserId";

export interface ShareActionResult {
  error: string | null;
  token: string | null;
}

export async function shareTournamentAction(
  tournamentId: string,
): Promise<ShareActionResult> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { error: "Tu sesión expiró. Volvé a iniciar sesión.", token: null };
  }

  try {
    const token = await useCases.shareTournament.execute({
      tournamentId,
      requestingUserId: userId,
    });
    return { error: null, token };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "No se pudo generar el enlace.",
      token: null,
    };
  }
}
