"use client";

import { useRouter } from "next/navigation";
import { ManualPairingModal } from "./ManualPairingModal";
import type { ManualPairing } from "@/domain/services/SwissPairingService";

/** Plain serializable player shape for the manual pairing modal. */
interface PairingPlayer {
  id: string;
  name: string;
}

/**
 * Owns the audit-mode pairing dialog at the overview level, outside the
 * empty-state cards that get replaced by revalidatePath re-renders. The
 * dialog is opened via the `?emparejar=1` query param (set by the start
 * button, the empty-state link and the round nav in audit mode); closing it
 * clears the param, and a successful generation navigates to the new round.
 * For rounds 2+ the overview passes the automatic pairings as the editor's
 * editable baseline.
 */
export const ManualPairingLauncher = ({
  tournamentId,
  players,
  roundNumber,
  initialPairs,
  isOpen,
}: {
  tournamentId: string;
  players: PairingPlayer[];
  roundNumber: number;
  initialPairs: ManualPairing[];
  isOpen: boolean;
}) => {
  const router = useRouter();

  return (
    <ManualPairingModal
      tournamentId={tournamentId}
      players={players}
      roundNumber={roundNumber}
      initialPairs={initialPairs}
      isOpen={isOpen}
      onClose={() => router.replace(`/torneo/${tournamentId}?tab=tournament`)}
      onGenerated={(generatedRound) =>
        router.push(
          `/torneo/${tournamentId}?tab=tournament&ronda=${generatedRound}`,
        )
      }
    />
  );
};
