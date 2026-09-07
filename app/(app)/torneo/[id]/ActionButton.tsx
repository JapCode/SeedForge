"use client";

import { useState, useTransition } from "react";
import { Column, Button, Text, useToast } from "@once-ui-system/core";
import { ActionResult } from "./actions";

interface ActionButtonProps {
  label: string;
  pendingLabel: string;
  action: () => Promise<ActionResult>;
  variant?: "primary" | "secondary" | "tertiary" | "danger";
  successMessage?: string;
}

export const ActionButton = ({
  label,
  pendingLabel,
  action,
  variant,
  successMessage,
}: ActionButtonProps) => {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setError(result.error);
        addToast({ variant: "danger", message: result.error });
      } else if (successMessage) {
        addToast({ variant: "success", message: successMessage });
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
