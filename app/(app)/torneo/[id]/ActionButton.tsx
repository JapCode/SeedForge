"use client";

import { useState, useTransition } from "react";
import { Column, Button, Text } from "@once-ui-system/core";
import { ActionResult } from "./actions";

interface ActionButtonProps {
  label: string;
  pendingLabel: string;
  action: () => Promise<ActionResult>;
  variant?: "primary" | "secondary" | "tertiary" | "danger";
}

export const ActionButton = ({
  label,
  pendingLabel,
  action,
  variant,
}: ActionButtonProps) => {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setError(result.error);
      }
    });
  }

  return (
    <Column gap="8">
      <Button onClick={handleClick} disabled={isPending} variant={variant}>
        {isPending ? pendingLabel : label}
      </Button>
      {error && (
        <Text onBackground="danger-weak" variant="body-default-s">
          {error}
        </Text>
      )}
    </Column>
  );
};
