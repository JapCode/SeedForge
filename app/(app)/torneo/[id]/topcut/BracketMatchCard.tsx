"use client";

import { useTransition } from "react";
import {
  Column,
  Row,
  Text,
  Badge,
  Button,
  useToast,
} from "@once-ui-system/core";
import {
  reportBracketMatchWinnerAction,
  revertBracketMatchWinnerAction,
} from "./actions";
import { RefreshCw } from "lucide";
import { MorphIcon } from "morphicons/react";

export interface BracketPlayerSlot {
  id: string;
  name: string;
  seed: number | null;
}

interface PlayerRowProps {
  player: BracketPlayerSlot | null;
  isWinner: boolean;
  divider?: boolean;
  decided: boolean;
  /** Match is ready to be decided (both slots filled). */
  ready: boolean;
  disabled: boolean;
  /** Read-only rendering (public view): no "Ganó" button, winner badge only. */
  readOnly?: boolean;
  onReport: (playerId: string) => void;
}

/**
 * One player cell of a bracket match: seed chip + name on the left, and on
 * the right either a "Ganó" badge (winner), a "Ganó" button (pending match,
 * one click reports the winner), or nothing. Empty slots awaiting a previous
 * round's winner render as muted "Por definir". Long names truncate with an
 * ellipsis so the card keeps its fixed height inside the aligned bracket
 * grid.
 */
const PlayerRow = ({
  player,
  isWinner,
  divider,
  decided,
  ready,
  disabled,
  readOnly,
  onReport,
}: PlayerRowProps) => (
  <Row
    fillWidth
    paddingX="12"
    paddingY="8"
    gap="8"
    horizontal="between"
    vertical="center"
    background={isWinner ? "brand-weak" : undefined}
    borderBottom={divider ? "neutral-alpha-weak" : undefined}
    style={{
      ...(player === null ? { minHeight: "2.25rem" } : {}),
    }}
  >
    <Row gap="8" vertical="center" style={{ minWidth: 0, overflow: "hidden" }}>
      {player !== null && player.seed !== null && (
        <Text variant="label-default-xs" onBackground="neutral-weak">
          #{player.seed}
        </Text>
      )}
      <Text
        variant={isWinner ? "body-strong-m" : "body-default-m"}
        onBackground={
          decided && !isWinner
            ? "neutral-weak"
            : player === null
              ? "neutral-weak"
              : undefined
        }
        style={{
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          minWidth: 0,
        }}
      >
        {player?.name ?? "Por definir"}
      </Text>
    </Row>

    {player !== null &&
      (isWinner ? (
        <Badge
          background="brand-strong"
          onBackground="brand-weak"
          paddingX="8"
          paddingY="4"
          textVariant="label-strong-xs"
        >
          Ganó
        </Badge>
      ) : !decided && ready && !readOnly ? (
        <Button
          size="s"
          variant="secondary"
          disabled={disabled}
          onClick={() => onReport(player.id)}
        >
          Ganó
        </Button>
      ) : null)}
  </Row>
);

interface BracketMatchCardProps {
  tournamentId: string;
  roundIndex: number;
  position: number;
  /** Column-relative label for the card, e.g. "Partido 1". */
  matchLabel: string;
  player1: BracketPlayerSlot | null;
  player2: BracketPlayerSlot | null;
  winnerId: string | null;
  /** Read-only rendering (public view): no report/revert controls. */
  readOnly?: boolean;
}

/**
 * One match of the Top Cut bracket: two joined player cells (the same visual
 * language as the overview's EditableBracket). A pending match with both
 * players assigned shows a "Ganó" button under each player — one click names
 * the winner and the bracket domain advances them into the next round. Once
 * decided, the winner's row is highlighted and a reload icon appears next to
 * the match label to revert the result (the domain blocks reverting a match
 * whose winner already advanced into a decided next match — downstream
 * results must be reverted first). Slots waiting for a previous round's
 * winner render as "Por definir" and are not clickable. Feedback goes
 * through toasts only, so the card body keeps a constant height inside the
 * aligned bracket grid. The label row (with the revert icon) is absolutely
 * positioned around the card body, which is the only in-flow content: the
 * grid centers the body and the bracket connector lines always hit its
 * vertical center.
 */
export const BracketMatchCard = ({
  tournamentId,
  roundIndex,
  position,
  matchLabel,
  player1,
  player2,
  winnerId,
  readOnly = false,
}: BracketMatchCardProps) => {
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();

  const decided = winnerId !== null;
  const ready = player1 !== null && player2 !== null;

  const report = (playerId: string) => {
    startTransition(async () => {
      const res = await reportBracketMatchWinnerAction(
        tournamentId,
        roundIndex,
        position,
        playerId,
      );
      if (res.error) {
        addToast({ variant: "danger", message: res.error });
        return;
      }
      addToast({ variant: "success", message: "Ganador registrado." });
    });
  };

  const revert = () => {
    startTransition(async () => {
      const res = await revertBracketMatchWinnerAction(
        tournamentId,
        roundIndex,
        position,
      );
      if (res.error) {
        addToast({ variant: "danger", message: res.error });
        return;
      }
      addToast({ variant: "success", message: "Ganador revertido." });
    });
  };

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {/* The label row and the revert icon are absolutely positioned so the
          card body (the bordered box) is the only in-flow content. The grid
          centers that box, and the bracket connector lines hit its vertical
          center — if the label/icon participated in the flow, the centered
          composite would shift with the icon appearing/disappearing and the
          bones would miss the middle of the cards. */}
      <Row
        fillWidth
        horizontal="between"
        vertical="center"
        paddingRight="8"
        style={{ position: "absolute", top: "-1.5rem", left: 0 }}
      >
        <Text variant="label-default-s" onBackground="neutral-weak">
          {matchLabel}
        </Text>
        {decided && !readOnly ? (
          <MorphIcon
            icon={RefreshCw}
            size="0.875rem"
            label="Revertir ganador"
            onClick={isPending ? undefined : revert}
            style={{
              cursor: isPending ? "default" : "pointer",
              opacity: isPending ? 0.5 : 1,
            }}
          />
        ) : null}
      </Row>

      <Column radius="m" border overflow="hidden">
        <PlayerRow
          player={player1}
          isWinner={decided && winnerId === player1?.id}
          divider
          decided={decided}
          ready={ready}
          disabled={isPending}
          readOnly={readOnly}
          onReport={report}
        />
        <PlayerRow
          player={player2}
          isWinner={decided && winnerId === player2?.id}
          decided={decided}
          ready={ready}
          disabled={isPending}
          readOnly={readOnly}
          onReport={report}
        />
      </Column>
    </div>
  );
};
