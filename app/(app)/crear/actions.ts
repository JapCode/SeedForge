"use server";

import { redirect } from "next/navigation";
import { useCases } from "@/infrastructure/composition-root";
import { getSessionUserId } from "@/infrastructure/auth/getSessionUserId";
import { TopCutSize } from "@/domain/entities/Tournament";

export interface CreateTournamentFormState {
  error: string | null;
}

export async function createTournamentAction(
  _prevState: CreateTournamentFormState,
  formData: FormData,
): Promise<CreateTournamentFormState> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { error: "Tu sesión expiró. Volvé a iniciar sesión." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const totalSwissRounds = Number(formData.get("totalSwissRounds"));
  const topCutSizeRaw = String(formData.get("topCutSize") ?? "");
  const topCutSize =
    topCutSizeRaw === "" ? null : (Number(topCutSizeRaw) as TopCutSize);
  const useLegacyRuleset = formData.get("useLegacyRuleset") === "on";

  let tournamentId: string;
  try {
    const tournament = await useCases.createTournament.execute({
      ownerId: userId,
      name,
      totalSwissRounds,
      topCutSize,
      useLegacyRuleset,
    });
    tournamentId = tournament.getId();
  } catch (err) {
    // Domain validation errors (empty name, invalid round count, invalid top
    // cut size, etc.) land here with a message that's already user-readable.
    return {
      error: err instanceof Error ? err.message : "No se pudo crear el torneo.",
    };
  }

  // Deliberately outside the try/catch: redirect() works by throwing
  // internally, and we don't want that caught and turned into an "error".
  redirect(`/torneo/${tournamentId}`);
}
