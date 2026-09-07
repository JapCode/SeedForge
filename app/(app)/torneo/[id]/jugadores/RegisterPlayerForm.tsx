"use client";

import { useActionState, useRef, useEffect } from "react";
import { Row, Input, Button, Text } from "@once-ui-system/core";
import { registerPlayerAction, ActionResult } from "./actions";

const initialState: ActionResult = { error: null };

export const RegisterPlayerForm = ({
  tournamentId,
}: {
  tournamentId: string;
}) => {
  const boundAction = registerPlayerAction.bind(null, tournamentId);
  const [state, formAction, isPending] = useActionState(
    boundAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Clear the input and refocus after a successful submission, without wiping
  // it on error (so the organizer doesn't have to retype a name after a
  // validation failure). Refocusing keeps rapid back-to-back registration
  // flowing: type a name, Enter, type the next one.
  useEffect(() => {
    if (!isPending && !state.error) {
      formRef.current?.reset();
      inputRef.current?.focus();
    }
  }, [isPending, state.error]);

  return (
    <form action={formAction} ref={formRef}>
      <Row gap="12" vertical="end" wrap>
        <Input
          id="playerName"
          name="playerName"
          label="Nombre del jugador"
          required
          autoFocus
          ref={inputRef}
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? "Agregando..." : "Agregar jugador"}
        </Button>
      </Row>
      {state.error && (
        <Text onBackground="danger-weak" variant="body-default-s">
          {state.error}
        </Text>
      )}
    </form>
  );
};
