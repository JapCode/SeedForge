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
import { changePasswordAction } from "../actions";

export const PasswordForm = () => {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (newPassword.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setIsSubmitting(true);

    const result = await changePasswordAction(
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
          Contraseña
        </Heading>
        <Text variant="body-default-s" onBackground="neutral-weak">
          Cambiá tu contraseña para mantener tu cuenta segura.
        </Text>
      </Column>

      <form onSubmit={handleSubmit}>
        <Column gap="16">
          <Input
            id="newPassword"
            name="newPassword"
            label="Nueva contraseña"
            type="password"
            autoComplete="new-password"
            required
          />

          <Input
            id="confirmPassword"
            name="confirmPassword"
            label="Confirmar contraseña"
            type="password"
            autoComplete="new-password"
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
                Contraseña actualizada correctamente.
              </Text>
            </Row>
          )}

          <Row>
            <Button type="submit" size="m" disabled={isSubmitting}>
              {isSubmitting ? "Cambiando..." : "Cambiar contraseña"}
            </Button>
          </Row>
        </Column>
      </form>
    </Flex>
  );
};
