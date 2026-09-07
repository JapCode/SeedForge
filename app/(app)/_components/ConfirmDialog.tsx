"use client";

import { useState } from "react";
import { Column, Row, Dialog, Button, Text } from "@once-ui-system/core";

interface ConfirmDialogProps {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => Promise<void> | void;
}

/**
 * Wraps the Once UI Dialog as a confirm dialog: the trigger opens it and the
 * confirm button runs `onConfirm`, closing on success. Used for destructive
 * or hard-to-revert actions (drop player, revert round, finish tournament...).
 */
export const ConfirmDialog = ({
  trigger,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  danger,
  onConfirm,
}: ConfirmDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function handleConfirm() {
    setIsPending(true);
    try {
      await onConfirm();
      setIsOpen(false);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <span onClick={() => setIsOpen(true)}>{trigger}</span>
      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={title}
        description={description}
        footer={
          <Row gap="8" horizontal="end">
            <Button
              variant="secondary"
              label={cancelLabel}
              onClick={() => setIsOpen(false)}
            />
            <Button
              variant={danger ? "danger" : "primary"}
              label={confirmLabel}
              disabled={isPending}
              onClick={handleConfirm}
            />
          </Row>
        }
      >
        <Column gap="8">
          <Text variant="body-default-m" onBackground="neutral-medium">
            Esta acción no se puede deshacer.
          </Text>
        </Column>
      </Dialog>
    </>
  );
};
