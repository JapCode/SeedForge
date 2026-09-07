"use client";

import { useState } from "react";
import {
  Column,
  Row,
  Dialog,
  Button,
  IconButton,
  Text,
  useToast,
} from "@once-ui-system/core";
import type { IconName } from "@once-ui-system/core";
import { ActionResult } from "@/app/(app)/torneo/[id]/actions";

interface ConfirmActionButtonProps {
  label: string;
  pendingLabel: string;
  confirmTitle: string;
  confirmDescription?: string;
  confirmLabel?: string;
  action: () => Promise<ActionResult>;
  variant?: "primary" | "secondary" | "tertiary" | "danger";
  /**
   * Variant of the dialog's confirm button. Defaults to `danger` when the
   * trigger is `danger`, `primary` otherwise — so a quiet trigger can still
   * confirm a destructive action in danger.
   */
  confirmVariant?: "primary" | "secondary" | "tertiary" | "danger";
  successMessage?: string;
  /**
   * When set, the trigger renders as an icon-only button (with `label` as
   * its tooltip) instead of a text button.
   */
  icon?: IconName;
}

/**
 * Destructive/hard-to-revert action button: opens a confirmation Dialog and
 * only runs the action if confirmed. Shows success/error toasts.
 */
export const ConfirmActionButton = ({
  label,
  pendingLabel,
  confirmTitle,
  confirmDescription,
  confirmLabel = "Confirmar",
  action,
  variant,
  confirmVariant = variant === "danger" ? "danger" : "primary",
  successMessage,
  icon,
}: ConfirmActionButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  async function handleConfirm() {
    setIsPending(true);
    setError(null);
    try {
      const result = await action();
      if (result.error) {
        setError(result.error);
        addToast({ variant: "danger", message: result.error });
      } else {
        setIsOpen(false);
        if (successMessage) {
          addToast({ variant: "success", message: successMessage });
        }
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      {icon ? (
        <IconButton
          icon={icon}
          tooltip={label}
          variant={variant}
          disabled={isPending}
          onClick={() => setIsOpen(true)}
        />
      ) : (
        <Button
          onClick={() => setIsOpen(true)}
          disabled={isPending}
          variant={variant}
        >
          {label}
        </Button>
      )}
      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={confirmTitle}
        description={confirmDescription}
        footer={
          <Row gap="8" horizontal="end">
            <Button
              variant="secondary"
              label="Cancelar"
              onClick={() => setIsOpen(false)}
            />
            <Button
              variant={confirmVariant}
              label={confirmLabel}
              disabled={isPending}
              onClick={handleConfirm}
            >
              {isPending ? pendingLabel : confirmLabel}
            </Button>
          </Row>
        }
      >
        <Column gap="8">
          {error && (
            <Text onBackground="danger-weak" variant="body-default-s">
              {error}
            </Text>
          )}
        </Column>
      </Dialog>
    </>
  );
};
