"use client";

import { useState, useTransition } from "react";
import type { CSSProperties } from "react";
import {
  Column,
  Row,
  Text,
  Badge,
  Button,
  Dialog,
  useToast,
} from "@once-ui-system/core";
import {
  registerMatchResultAction,
  revertMatchResultAction,
} from "../ronda/[n]/actions";
import type { MatchResultInput } from "@/application/use-cases/RegisterMatchResult";

type MatchResultView =
  | { type: "pending" }
  | { type: "win"; winnerId: string; winnerGames: number; loserGames: number }
  | { type: "draw"; player1Games: number; player2Games: number }
  | { type: "double_loss"; player1Games: number; player2Games: number }
  | { type: "bye" };

interface EditableBracketProps {
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
  /** Flex sizing so the bracket can share the overview grid. */
  style?: CSSProperties;
}

/**
 * Games won by `playerId` in a reported match, or null while the match is
 * pending (no score to show yet). For draw/double-loss the games belong to
 * the bracket's player1/player2 order.
 */
function playerGames(
  result: MatchResultView,
  playerId: string,
  player1Id: string,
): number | null {
  if (result.type === "pending" || result.type === "bye") {
    return null;
  }
  if (result.type === "win") {
    return result.winnerId === playerId
      ? result.winnerGames
      : result.loserGames;
  }
  return playerId === player1Id ? result.player1Games : result.player2Games;
}

/**
 * One bracket of the overview's round grid: the joined two-player cells with
 * reported scores (clickable) open the result dialog. While the match is
 * pending, each player shows a single-click "Ganó 2-0" / "Ganó 2-1" pair —
 * the button both names the winner and the score, so one tap saves the
 * result with no ambiguity. Double loss and the optional legacy draw are
 * footer alternatives. Once reported, the dialog shows the result with a
 * revert. Byes are never editable.
 */
export const EditableBracket = ({
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
  style,
}: EditableBracketProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  if (isBye) {
    return (
      <Column style={style} gap="4">
        <Text variant="label-default-s" onBackground="neutral-weak">
          Mesa {tableNumber}
        </Text>
        <Row
          fillWidth
          fillHeight
          paddingX="16"
          paddingY="12"
          radius="l"
          border="brand-alpha-medium"
          borderStyle="dashed"
          borderWidth={1}
          background="surface"
          horizontal="between"
          vertical="center"
          gap="12"
        >
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
      </Column>
    );
  }

  const hasResult = result.type !== "pending";
  const player2NameSafe = player2Name ?? "";
  const winnerId = result.type === "win" ? result.winnerId : null;
  const player1IsWinner = winnerId === player1Id;
  const player2IsWinner = winnerId === player2Id;

  const resultSummary = (): string => {
    if (result.type === "win") {
      const winnerName =
        result.winnerId === player1Id ? player1Name : player2NameSafe;
      return `${winnerName} ganó ${result.winnerGames}-${result.loserGames}`;
    }
    if (result.type === "draw") {
      return `Empate ${result.player1Games}-${result.player2Games}`;
    }
    if (result.type === "double_loss") {
      return `Doble derrota (${result.player1Games}-${result.player2Games})`;
    }
    return "";
  };

  const report = (input: MatchResultInput) => {
    setError(null);
    startTransition(async () => {
      const res = await registerMatchResultAction(
        tournamentId,
        roundNumber,
        matchId,
        input,
      );
      if (res.error) {
        setError(res.error);
        addToast({ variant: "danger", message: res.error });
        return;
      }
      addToast({ variant: "success", message: "Resultado guardado." });
      setIsOpen(false);
    });
  };

  const revert = () => {
    setError(null);
    startTransition(async () => {
      const res = await revertMatchResultAction(
        tournamentId,
        roundNumber,
        matchId,
      );
      if (res.error) {
        setError(res.error);
        addToast({ variant: "danger", message: res.error });
        return;
      }
      addToast({ variant: "success", message: "Resultado revertido." });
      setIsOpen(false);
    });
  };

  const player1Games = playerGames(result, player1Id, player1Id);
  const player2Games = playerGames(result, player2Id!, player1Id);

  return (
    <>
      <Column style={style} gap="4">
        <Text variant="label-default-s" onBackground="neutral-weak">
          Mesa {tableNumber}
        </Text>
        <Column
          fillWidth
          gap="0"
          className="cursor-interactive"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={() => setIsOpen(true)}
        >
          <Row
            fillWidth
            paddingX="16"
            paddingY="12"
            className="radius-l-top"
            border="neutral-medium"
            borderStyle="solid"
            borderWidth={1}
            background={player2IsWinner ? undefined : "surface"}
            horizontal="between"
            vertical="center"
            gap="12"
            style={
              hovered
                ? { backgroundColor: "var(--neutral-background-weak)" }
                : undefined
            }
          >
            <Text
              variant={player1IsWinner ? "body-strong-m" : "body-default-m"}
              onBackground={
                player1IsWinner
                  ? undefined
                  : hasResult
                    ? "neutral-weak"
                    : undefined
              }
            >
              {player1Name}
            </Text>
            {player1Games !== null && (
              <Text
                variant={player1IsWinner ? "body-default-m" : "body-default-s"}
                weight={player1IsWinner ? "strong" : "default"}
                onBackground={player1IsWinner ? undefined : "neutral-weak"}
              >
                {player1Games}
              </Text>
            )}
          </Row>
          <Row
            fillWidth
            paddingX="16"
            paddingY="12"
            className="radius-l-bottom"
            border="neutral-medium"
            borderStyle="solid"
            borderWidth={1}
            background={player1IsWinner ? undefined : "surface"}
            style={{
              marginTop: "-1px",
              ...(hovered
                ? { backgroundColor: "var(--neutral-background-weak)" }
                : {}),
            }}
            horizontal="between"
            vertical="center"
            gap="12"
          >
            <Text
              variant={player2IsWinner ? "body-strong-m" : "body-default-m"}
              onBackground={
                player2IsWinner
                  ? undefined
                  : hasResult
                    ? "neutral-weak"
                    : undefined
              }
            >
              {player2NameSafe}
            </Text>
            {player2Games !== null && (
              <Text
                variant={player2IsWinner ? "body-default-m" : "body-default-s"}
                weight={player2IsWinner ? "strong" : "default"}
                onBackground={player2IsWinner ? undefined : "neutral-weak"}
              >
                {player2Games}
              </Text>
            )}
          </Row>
        </Column>
      </Column>

      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={`Resultado · Mesa ${tableNumber}`}
        description={hasResult ? resultSummary() : undefined}
        footer={
          <Row gap="8" horizontal="end">
            <Button
              variant="secondary"
              label="Cancelar"
              disabled={isPending}
              onClick={() => setIsOpen(false)}
            />
          </Row>
        }
      >
        <Column gap="12">
          <Row fillWidth gap="12" vertical="center" wrap>
            <Column
              fillWidth
              gap="8"
              padding="12"
              radius="m"
              background={player1IsWinner ? "brand-weak" : "surface"}
              style={{ flex: "1 1 0", minWidth: "12rem" }}
            >
              <Row fillWidth horizontal="between" vertical="center" gap="8">
                <Text variant="body-strong-m">{player1Name}</Text>
                {player1IsWinner && (
                  <Text variant="label-default-s" onBackground="brand-strong">
                    Ganó
                  </Text>
                )}
              </Row>
              {!hasResult && (
                <Row gap="8" wrap>
                  <Button
                    size="s"
                    variant="secondary"
                    disabled={isPending}
                    onClick={() =>
                      report({
                        type: "win",
                        winnerId: player1Id,
                        winnerGames: 2,
                        loserGames: 0,
                      })
                    }
                  >
                    Ganó 2-0
                  </Button>
                  <Button
                    size="s"
                    variant="secondary"
                    disabled={isPending}
                    onClick={() =>
                      report({
                        type: "win",
                        winnerId: player1Id,
                        winnerGames: 2,
                        loserGames: 1,
                      })
                    }
                  >
                    Ganó 2-1
                  </Button>
                </Row>
              )}
            </Column>

            <Text variant="label-default-m" onBackground="neutral-weak">
              vs
            </Text>

            <Column
              fillWidth
              gap="8"
              padding="12"
              radius="m"
              background={player2IsWinner ? "brand-weak" : "surface"}
              style={{ flex: "1 1 0", minWidth: "12rem" }}
            >
              <Row fillWidth horizontal="between" vertical="center" gap="8">
                <Text variant="body-strong-m">{player2NameSafe}</Text>
                {player2IsWinner && (
                  <Text variant="label-default-s" onBackground="brand-strong">
                    Ganó
                  </Text>
                )}
              </Row>
              {!hasResult && (
                <Row gap="8" wrap>
                  <Button
                    size="s"
                    variant="secondary"
                    disabled={isPending}
                    onClick={() =>
                      report({
                        type: "win",
                        winnerId: player2Id!,
                        winnerGames: 2,
                        loserGames: 0,
                      })
                    }
                  >
                    Ganó 2-0
                  </Button>
                  <Button
                    size="s"
                    variant="secondary"
                    disabled={isPending}
                    onClick={() =>
                      report({
                        type: "win",
                        winnerId: player2Id!,
                        winnerGames: 2,
                        loserGames: 1,
                      })
                    }
                  >
                    Ganó 2-1
                  </Button>
                </Row>
              )}
            </Column>
          </Row>

          <Row gap="8" wrap>
            {!hasResult ? (
              <>
                <Button
                  size="s"
                  variant="tertiary"
                  disabled={isPending}
                  onClick={() =>
                    report({
                      type: "double_loss",
                      player1Games: 0,
                      player2Games: 0,
                    })
                  }
                >
                  Doble derrota
                </Button>
                {allowDraws && (
                  <Button
                    size="s"
                    variant="tertiary"
                    disabled={isPending}
                    onClick={() =>
                      report({ type: "draw", player1Games: 1, player2Games: 1 })
                    }
                  >
                    Empate
                  </Button>
                )}
              </>
            ) : (
              <Button
                size="s"
                variant="tertiary"
                disabled={isPending}
                onClick={revert}
              >
                Revertir resultado
              </Button>
            )}
          </Row>

          {error && (
            <Text variant="body-default-s" onBackground="danger-weak">
              {error}
            </Text>
          )}
        </Column>
      </Dialog>
    </>
  );
};
