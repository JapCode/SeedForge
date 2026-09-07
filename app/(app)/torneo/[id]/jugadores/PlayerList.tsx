"use client";

import { useMemo, useState } from "react";
import { Column, Row, Text, Badge, Input, Icon } from "@once-ui-system/core";
import { ConfirmActionButton } from "../../../_components/ConfirmActionButton";
import { unregisterPlayerAction, dropPlayerAction } from "./actions";

export interface PlayerRow {
  id: string;
  name: string;
  dropped: boolean;
  hadBye: boolean;
  position: number;
  points: number;
}

/**
 * Accent-insensitive lowercase normalization so "Álvarez" matches "alvarez".
 */
const normalize = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const PlayerRowItem = ({
  tournamentId,
  row,
  isRegistrationPhase,
  dimmed,
}: {
  tournamentId: string;
  row: PlayerRow;
  isRegistrationPhase: boolean;
  dimmed?: boolean;
}) => (
  <Row
    fillWidth
    horizontal="between"
    vertical="center"
    padding="12"
    radius="m"
    border
    gap="16"
  >
    <Row gap="12" vertical="center">
      <Text
        variant="body-default-s"
        onBackground="neutral-weak"
        style={{ minWidth: "2rem" }}
      >
        {row.position}
      </Text>
      <Text
        variant="body-default-m"
        onBackground={dimmed ? "neutral-weak" : undefined}
      >
        {row.name}
      </Text>
      {row.hadBye && (
        <Badge background="brand-weak" onBackground="brand-strong">
          BYE
        </Badge>
      )}
      {row.dropped && (
        <Badge background="danger-weak" onBackground="danger-strong">
          Dropeado
        </Badge>
      )}
    </Row>

    <Row gap="16" vertical="center">
      {!isRegistrationPhase && (
        <Row gap="4" vertical="center">
          <Text variant="body-strong-m">{row.points}</Text>
          <Text variant="body-default-s" onBackground="neutral-weak">
            pts
          </Text>
        </Row>
      )}

      {isRegistrationPhase ? (
        <ConfirmActionButton
          label="Quitar"
          pendingLabel="Quitando..."
          confirmTitle={`¿Quitar a ${row.name}?`}
          confirmDescription="El jugador dejará de estar inscripto en el torneo."
          confirmLabel="Quitar"
          variant="tertiary"
          successMessage={`${row.name} fue quitado del torneo.`}
          action={unregisterPlayerAction.bind(null, tournamentId, row.id)}
        />
      ) : !row.dropped ? (
        <ConfirmActionButton
          label="Dropear"
          pendingLabel="Dropeando..."
          confirmTitle={`¿Dropear a ${row.name}?`}
          confirmDescription="El jugador dejará de participar, pero conservará sus resultados previos."
          confirmLabel="Dropear"
          variant="danger"
          successMessage={`${row.name} fue dropeado.`}
          action={dropPlayerAction.bind(null, tournamentId, row.id)}
        />
      ) : null}
    </Row>
  </Row>
);

export const PlayerList = ({
  tournamentId,
  rows,
  isRegistrationPhase,
}: {
  tournamentId: string;
  rows: PlayerRow[];
  isRegistrationPhase: boolean;
}) => {
  const [query, setQuery] = useState("");
  const showSearch = rows.length >= 6;

  const filtered = useMemo(() => {
    const normalizedQuery = normalize(query.trim());
    if (!normalizedQuery) return rows;
    return rows.filter((row) => normalize(row.name).includes(normalizedQuery));
  }, [rows, query]);

  const active = filtered.filter((row) => !row.dropped);
  const dropped = filtered.filter((row) => row.dropped);

  return (
    <Column fillWidth gap="16">
      {showSearch && (
        <Input
          id="playerSearch"
          placeholder="Buscar jugador"
          aria-label="Buscar jugador"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          hasPrefix={
            <Icon name="search" size="s" onBackground="neutral-weak" />
          }
        />
      )}

      {rows.length === 0 && (
        <Column
          fillWidth
          padding="32"
          radius="l"
          border
          background="surface"
          horizontal="center"
          gap="8"
        >
          <Text onBackground="neutral-weak">
            Todavía no hay jugadores registrados.
          </Text>
          {!isRegistrationPhase && (
            <Text variant="body-default-s" onBackground="neutral-weak">
              La inscripción ya cerró.
            </Text>
          )}
        </Column>
      )}

      {rows.length > 0 && filtered.length === 0 && (
        <Text onBackground="neutral-weak">No se encontró ningún jugador.</Text>
      )}

      {active.length > 0 && (
        <Column fillWidth gap="8">
          {active.map((row) => (
            <PlayerRowItem
              key={row.id}
              tournamentId={tournamentId}
              row={row}
              isRegistrationPhase={isRegistrationPhase}
            />
          ))}
        </Column>
      )}

      {dropped.length > 0 && (
        <Column fillWidth gap="8">
          <Text variant="label-default-s" onBackground="neutral-weak">
            Dropeados ({dropped.length})
          </Text>
          {dropped.map((row) => (
            <PlayerRowItem
              key={row.id}
              tournamentId={tournamentId}
              row={row}
              isRegistrationPhase={isRegistrationPhase}
              dimmed
            />
          ))}
        </Column>
      )}
    </Column>
  );
};
