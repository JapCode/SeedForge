"use client";

import { useState, FormEvent } from "react";
import {
  Column,
  Row,
  Flex,
  Heading,
  Text,
  Input,
  Button,
  Icon,
} from "@once-ui-system/core";
import { changeEmailAction } from "../actions";

interface EmailFormProps {
  currentEmail: string;
}

export const EmailForm = ({ currentEmail }: EmailFormProps) => {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const newEmail = String(formData.get("newEmail") ?? "");
    const confirmEmail = String(formData.get("confirmEmail") ?? "");

    if (newEmail !== confirmEmail) {
      setError("Los emails no coinciden.");
      return;
    }

    if (newEmail === currentEmail) {
      setError("El nuevo email es igual al actual.");
      return;
    }

    setIsSubmitting(true);

    const result = await changeEmailAction(
      { error: null, success: false },
      formData,
    );

    setIsSubmitting(false);
    setError(result.error);
    setSuccess(result.success);

    if (result.success) {
      form.reset();
    }
  }

  return (
    <Flex
      direction="column"
      gap="20"
      padding="20"
      radius="l"
      border
      background="surface"
    >
      <Column gap="4">
        <Heading as="h2" variant="heading-strong-m">
          Email
        </Heading>
        <Text variant="body-default-s" onBackground="neutral-weak">
          Cambiá tu dirección de email. Se enviará un link de verificación al
          nuevo email.
        </Text>
      </Column>

      <form onSubmit={handleSubmit}>
        <input type="hidden" name="currentEmail" value={currentEmail} />
        <Column gap="16">
          <Input
            id="currentEmailDisplay"
            label="Email actual"
            type="email"
            value={currentEmail}
            disabled
          />

          <Input
            id="newEmail"
            name="newEmail"
            label="Nuevo email"
            type="email"
            autoComplete="email"
            required
          />

          <Input
            id="confirmEmail"
            name="confirmEmail"
            label="Confirmar nuevo email"
            type="email"
            autoComplete="email"
            required
          />

          {error && (
            <Row
              gap="8"
              vertical="center"
              padding="12"
              radius="m"
              background="danger-alpha-weak"
            >
              <Icon name="danger" size="xs" onBackground="danger-strong" />
              <Text variant="body-default-s" onBackground="danger-weak">
                {error}
              </Text>
            </Row>
          )}

          {success && (
            <Row
              gap="8"
              vertical="center"
              padding="12"
              radius="m"
              background="success-alpha-weak"
            >
              <Icon name="check" size="xs" onBackground="success-strong" />
              <Text variant="body-default-s" onBackground="success-weak">
                Se envió un link de verificación a tu nuevo email. Revisá tu
                bandeja de entrada.
              </Text>
            </Row>
          )}

          <Row>
            <Button type="submit" size="m" disabled={isSubmitting}>
              {isSubmitting ? "Enviando..." : "Cambiar email"}
            </Button>
          </Row>
        </Column>
      </form>
    </Flex>
  );
};
