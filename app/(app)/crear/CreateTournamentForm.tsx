"use client";

import { useActionState, useState } from "react";
import {
  Column,
  Row,
  Heading,
  Text,
  Input,
  Button,
  Switch,
} from "@once-ui-system/core";
import { createTournamentAction, CreateTournamentFormState } from "./actions";

const initialState: CreateTournamentFormState = { error: null };

export const CreateTournamentForm = () => {
  const [state, formAction, isPending] = useActionState(
    createTournamentAction,
    initialState,
  );
  const [useLegacyRuleset, setUseLegacyRuleset] = useState(false);

  return (
    <Column
      maxWidth={32}
      gap="24"
      padding="32"
      radius="l"
      border
      background="surface"
    >
      <Column gap="8">
        <Heading as="h1" variant="heading-strong-l">
          Crear torneo
        </Heading>
        <Text onBackground="neutral-weak">
          Configurá las reglas base. Podés registrar jugadores después.
        </Text>
      </Column>

      <form action={formAction}>
        <Column gap="16">
          <Input id="name" name="name" label="Nombre del torneo" required />

          <Input
            id="totalSwissRounds"
            name="totalSwissRounds"
            label="Cantidad de rondas suizas"
            type="number"
            min={1}
            defaultValue={4}
            required
          />

          <Input
            id="topCutSize"
            name="topCutSize"
            label="Top Cut (4, 8, 16 o 32 — vacío = sin Top Cut)"
            type="number"
          />

          <Row gap="8" vertical="center">
            <Switch
              id="useLegacyRuleset"
              name="useLegacyRuleset"
              isChecked={useLegacyRuleset}
              onToggle={() => setUseLegacyRuleset((value) => !value)}
            />
            <Text variant="body-default-s">
              Usar reglas anteriores a julio 2025 (permite empates)
            </Text>
          </Row>

          {state.error && (
            <Text onBackground="danger-weak" variant="body-default-s">
              {state.error}
            </Text>
          )}

          <Button type="submit" fillWidth disabled={isPending}>
            {isPending ? "Creando..." : "Crear torneo"}
          </Button>
        </Column>
      </form>
    </Column>
  );
};
