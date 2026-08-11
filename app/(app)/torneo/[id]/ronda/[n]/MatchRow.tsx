"use client";

import { Column, Row, Text, Badge } from "@once-ui-system/core";
import { ActionButton } from "../../ActionButton";
import { registerMatchResultAction, revertMatchResultAction } from "./actions";

type MatchResultView =
  | { type: "pending" }
  | { type: "win"; winnerId: string; winnerGames: number; loserGames: number }
  | { type: "draw"; player1Games: number; player2Games: number }
  | { type: "double_loss"; player1Games: number; player2Games: number }
  | { type: "bye" };

interface MatchRowProps {
  tournamentId: string;
  roundNumber: number;
  matchId: string;
  tableNumber: number;
  player1Id: string;
  player1Name: string;
  player2Id: string | null;
  player2Name: string | null;
  isBye: boolean;
  result: MatchResultView;
  allowDraws: boolean;
}

export const MatchRow = ({
  tournamentId,
  roundNumber,
  matchId,
  tableNumber,
  player1Id,
  player1Name,
  player2Id,
  player2Name,
  isBye,
  result,
  allowDraws,
}: MatchRowProps) => {
  if (isBye) {
    return (
      <Row fillWidth padding="12" radius="m" border vertical="center" gap="12">
        <Text variant="label-default-s" onBackground="neutral-weak">
          Mesa {tableNumber}
        </Text>
        <Text variant="body-default-m">{player1Name}</Text>
        <Badge>BYE</Badge>
      </Row>
    );
  }

  const isPending = result.type === "pending";

  function resultSummary(): string {
    if (result.type === "win") {
      const winnerName =
        result.winnerId === player1Id ? player1Name : player2Name;
      return `${winnerName} ganó ${result.winnerGames}-${result.loserGames}`;
    }
    if (result.type === "draw") {
      return `Empate ${result.player1Games}-${result.player2Games}`;
    }
    if (result.type === "double_loss") {
      return `Doble derrota (${result.player1Games}-${result.player2Games})`;
    }
    return "";
  }

  return (
    <Column fillWidth padding="12" radius="m" border gap="12">
      <Row fillWidth horizontal="between" vertical="center">
        <Row gap="12" vertical="center">
          <Text variant="label-default-s" onBackground="neutral-weak">
            Mesa {tableNumber}
          </Text>
          <Text variant="body-default-m">
            {player1Name} vs {player2Name}
          </Text>
        </Row>
        {!isPending && <Badge>{resultSummary()}</Badge>}
      </Row>

      {isPending ? (
        <Row gap="8" wrap>
          <ActionButton
            label={`${player1Name} 2-0`}
            pendingLabel="Guardando..."
            variant="secondary"
            action={registerMatchResultAction.bind(
              null,
              tournamentId,
              roundNumber,
              matchId,
              {
                type: "win",
                winnerId: player1Id,
                winnerGames: 2,
                loserGames: 0,
              },
            )}
          />
          <ActionButton
            label={`${player1Name} 2-1`}
            pendingLabel="Guardando..."
            variant="secondary"
            action={registerMatchResultAction.bind(
              null,
              tournamentId,
              roundNumber,
              matchId,
              {
                type: "win",
                winnerId: player1Id,
                winnerGames: 2,
                loserGames: 1,
              },
            )}
          />
          <ActionButton
            label={`${player2Name} 2-1`}
            pendingLabel="Guardando..."
            variant="secondary"
            action={registerMatchResultAction.bind(
              null,
              tournamentId,
              roundNumber,
              matchId,
              {
                type: "win",
                winnerId: player2Id!,
                winnerGames: 2,
                loserGames: 1,
              },
            )}
          />
          <ActionButton
            label={`${player2Name} 2-0`}
            pendingLabel="Guardando..."
            variant="secondary"
            action={registerMatchResultAction.bind(
              null,
              tournamentId,
              roundNumber,
              matchId,
              {
                type: "win",
                winnerId: player2Id!,
                winnerGames: 2,
                loserGames: 0,
              },
            )}
          />
          <ActionButton
            label="Doble derrota"
            pendingLabel="Guardando..."
            variant="tertiary"
            action={registerMatchResultAction.bind(
              null,
              tournamentId,
              roundNumber,
              matchId,
              {
                type: "double_loss",
                player1Games: 1,
                player2Games: 1,
              },
            )}
          />
          {allowDraws && (
            <ActionButton
              label="Empate"
              pendingLabel="Guardando..."
              variant="tertiary"
              action={registerMatchResultAction.bind(
                null,
                tournamentId,
                roundNumber,
                matchId,
                {
                  type: "draw",
                  player1Games: 1,
                  player2Games: 1,
                },
              )}
            />
          )}
        </Row>
      ) : (
        <ActionButton
          label="Revertir resultado"
          pendingLabel="Revirtiendo..."
          variant="tertiary"
          action={revertMatchResultAction.bind(
            null,
            tournamentId,
            roundNumber,
            matchId,
          )}
        />
      )}
    </Column>
  );
};
