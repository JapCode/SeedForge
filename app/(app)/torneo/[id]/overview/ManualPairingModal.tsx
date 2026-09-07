"use client";

import { useState } from "react";
import {
  Column,
  Row,
  Text,
  Button,
  Badge,
  Chip,
  Dialog,
  Icon,
  useToast,
} from "@once-ui-system/core";
import { generateNextRoundAction } from "../actions";
import type { ManualPairing } from "@/domain/services/SwissPairingService";

/** Plain serializable player shape (domain Player instances can't cross the server/client boundary). */
interface PairingPlayer {
  id: string;
  name: string;
}

interface PairRow {
  player1Id: string;
  /** null = BYE. */
  player2Id: string | null;
}

interface ManualPairingModalProps {
  tournamentId: string;
  players: PairingPlayer[];
  roundNumber: number;
  /**
   * Automatic pairings to prefill the editor with (rounds 2+ in audit mode).
   * Empty for round 1, where the organizer transcribes the real event's
   * pairings from scratch.
   */
  initialPairs?: ManualPairing[];
  isOpen: boolean;
  onClose: () => void;
  /** Called after the round is generated successfully, with its number. */
  onGenerated: (roundNumber: number) => void;
}

/**
 * Audit-mode round editor. Instead of a wall of dropdowns, the organizer
 * taps two players to pair them: the pool of unassigned players shrinks as
 * mesas are created, so progress is always visible and a 32-player field
 * stays fast to enter. BYE is offered contextually (odd fields only, one per
 * round). Every active player must be assigned exactly once before
 * "Generar ronda N" enables; the domain (buildManualRound) enforces the same
 * invariant server-side. For rounds 2+ in audit mode the editor opens
 * prefilled with the automatic pairings (`initialPairs`) as an editable
 * baseline.
 */
export const ManualPairingModal = ({
  tournamentId,
  players,
  roundNumber,
  initialPairs = [],
  isOpen,
  onClose,
  onGenerated,
}: ManualPairingModalProps) => {
  const { addToast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pairs, setPairs] = useState<PairRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Reset the editor whenever the dialog opens (the component stays mounted
  // at the overview level, so a closed-and-reopened dialog must not show
  // stale pairings). This is the React-recommended "adjust state during
  // render" pattern for resetting state when a prop changes. The round
  // number and prefill are captured too, so the revalidatePath re-render
  // that happens while the round is being generated (which advances the
  // "next round" props) can't change the title or the editor mid-flight.
  const [openRoundNumber, setOpenRoundNumber] = useState(roundNumber);
  const [openInitialPairs, setOpenInitialPairs] = useState(initialPairs);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setOpenRoundNumber(roundNumber);
      setOpenInitialPairs(initialPairs);
      setPairs(initialPairs);
      setSelectedId(null);
      setError(null);
    }
  }

  const assignedIds = new Set<string>();
  for (const pair of pairs) {
    assignedIds.add(pair.player1Id);
    if (pair.player2Id) assignedIds.add(pair.player2Id);
  }
  const unassigned = players.filter((player) => !assignedIds.has(player.id));
  const complete = unassigned.length === 0;
  const oddCount = players.length % 2 === 1;
  const hasBye = pairs.some((pair) => pair.player2Id === null);
  const selectedPlayer = players.find((player) => player.id === selectedId);

  const nameOf = (playerId: string) =>
    players.find((player) => player.id === playerId)?.name ?? playerId;

  const handlePlayerClick = (playerId: string) => {
    if (selectedId === playerId) {
      setSelectedId(null);
      return;
    }
    if (selectedId === null) {
      setSelectedId(playerId);
      return;
    }
    setPairs((current) => [
      ...current,
      { player1Id: selectedId, player2Id: playerId },
    ]);
    setSelectedId(null);
  };

  const giveBye = () => {
    if (selectedId === null) return;
    setPairs((current) => [
      ...current,
      { player1Id: selectedId, player2Id: null },
    ]);
    setSelectedId(null);
  };

  const removePair = (index: number) => {
    setPairs((current) => current.filter((_, i) => i !== index));
  };

  const handleGenerate = () => {
    setError(null);
    setIsPending(true);

    const manualPairings: ManualPairing[] = pairs.map((pair) => ({
      player1Id: pair.player1Id,
      player2Id: pair.player2Id,
    }));

    generateNextRoundAction(tournamentId, { manualPairings })
      .then((result) => {
        if (result.error) {
          setError(result.error);
          addToast({ variant: "danger", message: result.error });
          return;
        }
        addToast({
          variant: "success",
          message: `Ronda ${openRoundNumber} generada.`,
        });
        onGenerated(openRoundNumber);
      })
      .finally(() => setIsPending(false));
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Emparejar ronda ${openRoundNumber}`}
      description={
        openInitialPairs.length > 0
          ? "Se cargaron los emparejamientos automáticos como base. Tocá dos jugadores para modificarlos."
          : "Carga las parejas reales del evento: toca dos jugadores para emparejarlos."
      }
      footer={
        <Row gap="8" horizontal="end">
          <Button
            variant="secondary"
            label="Cancelar"
            disabled={isPending}
            onClick={onClose}
          />
          <Button
            label={
              isPending ? "Generando..." : `Generar ronda ${openRoundNumber}`
            }
            disabled={isPending || !complete}
            onClick={handleGenerate}
          />
        </Row>
      }
    >
      <Column gap="16">
        {/* Progress */}
        <Row gap="8" vertical="center">
          {complete ? (
            <>
              <Icon name="check" size="xs" onBackground="success-strong" />
              <Text variant="body-strong-s">
                Todos los jugadores emparejados
              </Text>
            </>
          ) : (
            <Text variant="body-default-s" onBackground="neutral-weak">
              Faltan {unassigned.length}{" "}
              {unassigned.length === 1 ? "jugador" : "jugadores"} por emparejar
            </Text>
          )}
        </Row>

        {/* Pool of unassigned players */}
        {unassigned.length > 0 && (
          <Column gap="8">
            <Text variant="label-default-s" onBackground="neutral-weak">
              Sin emparejar
            </Text>
            <Row gap="8" wrap>
              {unassigned.map((player) => (
                <Chip
                  key={player.id}
                  label={player.name}
                  selected={selectedId === player.id}
                  onClick={() => handlePlayerClick(player.id)}
                />
              ))}
            </Row>
          </Column>
        )}

        {/* Selected-player hint + contextual BYE */}
        {selectedPlayer && (
          <Row gap="12" vertical="center" wrap>
            <Text variant="body-default-s">
              <Text as="span" variant="body-strong-s">
                {selectedPlayer.name}
              </Text>{" "}
              seleccionado — toca otro jugador para emparejarlo.
            </Text>
            {oddCount && !hasBye && (
              <Button size="s" variant="secondary" onClick={giveBye}>
                Descansa (BYE)
              </Button>
            )}
          </Row>
        )}

        {/* Assigned mesas */}
        {pairs.length > 0 && (
          <Column gap="8">
            <Text variant="label-default-s" onBackground="neutral-weak">
              Mesas
            </Text>
            <Column gap="8">
              {pairs.map((pair, index) => (
                <Row
                  key={index}
                  fillWidth
                  gap="12"
                  padding="12"
                  radius="m"
                  border
                  vertical="center"
                  horizontal="between"
                >
                  <Row gap="12" vertical="center" wrap>
                    <Text
                      variant="label-default-s"
                      onBackground="neutral-weak"
                      style={{ minWidth: "3.5rem" }}
                    >
                      Mesa {index + 1}
                    </Text>
                    <Text variant="body-strong-s">
                      {nameOf(pair.player1Id)}
                    </Text>
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      {pair.player2Id ? "vs" : "·"}
                    </Text>
                    {pair.player2Id ? (
                      <Text variant="body-strong-s">
                        {nameOf(pair.player2Id)}
                      </Text>
                    ) : (
                      <Badge
                        background="brand-weak"
                        onBackground="brand-strong"
                      >
                        BYE
                      </Badge>
                    )}
                  </Row>
                  <Button
                    size="s"
                    variant="tertiary"
                    prefixIcon="close"
                    disabled={isPending}
                    onClick={() => removePair(index)}
                  >
                    Quitar
                  </Button>
                </Row>
              ))}
            </Column>
          </Column>
        )}

        {/* Teaching empty state */}
        {pairs.length === 0 && unassigned.length > 0 && (
          <Text variant="body-default-s" onBackground="neutral-weak">
            Tocá dos jugadores para crear la primera mesa.
          </Text>
        )}

        {error && (
          <Text variant="body-default-s" onBackground="danger-weak">
            {error}
          </Text>
        )}
      </Column>
    </Dialog>
  );
};
