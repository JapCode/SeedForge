"use client";

import { Column, Row, Text, Badge, Button } from "@once-ui-system/core";
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
      <Row
        fillWidth
        padding="12"
        radius="m"
        border="brand-alpha-medium"
        borderStyle="dashed"
        borderWidth={1}
        horizontal="between"
        vertical="center"
        gap="12"
      >
        <Text variant="label-default-s" onBackground="neutral-weak">
          Mesa {tableNumber}
        </Text>
        <Column gap="2">
          <Text variant="body-default-m">{player1Name}</Text>
          <Text variant="body-default-xs" onBackground="neutral-weak">
            3 pts · 2-0
          </Text>
        </Column>
        <Badge background="brand-weak" onBackground="brand-strong">
          BYE
        </Badge>
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

  const reportWin = (
    winnerId: string,
    winnerGames: number,
    loserGames: number,
  ) =>
    registerMatchResultAction.bind(null, tournamentId, roundNumber, matchId, {
      type: "win",
      winnerId,
      winnerGames,
      loserGames,
    });

  return (
    <Column fillWidth padding="16" radius="l" border gap="16">
      {/* ── Header: table + result ── */}
      <Row fillWidth horizontal="between" vertical="center">
        <Text variant="label-default-s" onBackground="neutral-weak">
          Mesa {tableNumber}
        </Text>
        {!isPending && <Badge>{resultSummary()}</Badge>}
      </Row>

      {/* ── Players vs Players ── */}
      <Row fillWidth gap="12" vertical="center">
        <Column fillWidth gap="8" padding="12" radius="m" background="surface">
          <Text variant="body-strong-m">{player1Name}</Text>
          {isPending && (
            <Row gap="8" wrap>
              <Button
                size="s"
                variant="secondary"
                onClick={() => reportWin(player1Id, 2, 0)()}
              >
                Ganó 2-0
              </Button>
              <Button
                size="s"
                variant="secondary"
                onClick={() => reportWin(player1Id, 2, 1)()}
              >
                Ganó 2-1
              </Button>
            </Row>
          )}
        </Column>

        <Text variant="label-default-m" onBackground="neutral-weak">
          vs
        </Text>

        <Column fillWidth gap="8" padding="12" radius="m" background="surface">
          <Text variant="body-strong-m">{player2Name}</Text>
          {isPending && (
            <Row gap="8" wrap>
              <Button
                size="s"
                variant="secondary"
                onClick={() => reportWin(player2Id!, 2, 0)()}
              >
                Ganó 2-0
              </Button>
              <Button
                size="s"
                variant="secondary"
                onClick={() => reportWin(player2Id!, 2, 1)()}
              >
                Ganó 2-1
              </Button>
            </Row>
          )}
        </Column>
      </Row>

      {/* ── Footer actions ── */}
      {isPending ? (
        <Row gap="8" wrap>
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
                player1Games: 0,
                player2Games: 0,
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
        <Row>
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
        </Row>
      )}
    </Column>
  );
};
