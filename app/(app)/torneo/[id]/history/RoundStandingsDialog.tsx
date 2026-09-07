"use client";

import { useState } from "react";
import {
  Column,
  Dialog,
  Button,
  Text,
  Badge,
  Table,
} from "@once-ui-system/core";

export interface RoundStandingsRow {
  position: number;
  name: string;
  points: number;
  omw: string;
  ogw: string;
  ddd: number;
  dropped: boolean;
}

interface RoundStandingsDialogProps {
  roundNumber: number;
  rows: RoundStandingsRow[];
}

/**
 * Opens a dialog showing the standings (points and tiebreakers) each player
 * had at the start of a given round — i.e. the snapshot the pairing algorithm
 * used to generate that round's matches. Lets the organizer understand why a
 * particular pairing happened (same score groups, in standings order).
 */
export const RoundStandingsDialog = ({
  roundNumber,
  rows,
}: RoundStandingsDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        size="s"
        variant="tertiary"
        label="Ver puntajes"
        onClick={() => setIsOpen(true)}
      />
      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={`Puntajes antes de la Ronda ${roundNumber}`}
        description="Puntos y desempates acumulados de las rondas anteriores. El emparejamiento agrupa por puntaje y sigue este orden."
      >
        <Column fillWidth gap="16">
          <Table
            data={{
              headers: [
                { content: "#", key: "position" },
                { content: "Jugador", key: "player" },
                { content: "Pts", key: "points" },
                { content: "OMW%", key: "omw" },
                { content: "OGW%", key: "ogw" },
                { content: "DDD", key: "ddd" },
              ],
              rows: rows.map((row) => [
                <Text key="pos" variant="body-default-m">
                  {row.position}
                </Text>,
                <Text key="name" variant="body-default-m">
                  {row.name}
                  {row.dropped && (
                    <Badge
                      background="danger-weak"
                      onBackground="danger-strong"
                      style={{ marginLeft: "0.5rem" }}
                    >
                      Dropeado
                    </Badge>
                  )}
                </Text>,
                <Text key="pts" variant="body-strong-m">
                  {row.points}
                </Text>,
                <Text
                  key="omw"
                  variant="body-default-s"
                  onBackground="neutral-weak"
                >
                  {row.omw}
                </Text>,
                <Text
                  key="ogw"
                  variant="body-default-s"
                  onBackground="neutral-weak"
                >
                  {row.ogw}
                </Text>,
                <Text
                  key="ddd"
                  variant="body-default-s"
                  onBackground="neutral-weak"
                >
                  {row.ddd}
                </Text>,
              ]),
            }}
          />
        </Column>
      </Dialog>
    </>
  );
};
