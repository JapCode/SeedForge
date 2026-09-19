"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Column,
  Row,
  Heading,
  Text,
  Input,
  Button,
  Icon,
  Flex,
} from "@once-ui-system/core";
import { authClient } from "@/infrastructure/auth/auth-client";
import { getAvatarUrl } from "@/components/avatar";

interface ProfileFormProps {
  userId: string;
  name: string;
  email: string;
}

export const ProfileForm = ({ userId, name, email }: ProfileFormProps) => {
  const [displayName, setDisplayName] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    const trimmed = displayName.trim();
    if (!trimmed) {
      setError("El nombre no puede estar vacío.");
      setIsSubmitting(false);
      return;
    }

    const { error: updateError } = await authClient.updateUser({
      name: trimmed,
    });

    setIsSubmitting(false);

    if (updateError) {
      setError("No se pudo actualizar el perfil.");
      return;
    }

    setSuccess(true);
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
          Perfil
        </Heading>
        <Text variant="body-default-s" onBackground="neutral-weak">
          Tu nombre visible en torneos y clasificaciones.
        </Text>
      </Column>

      <form onSubmit={handleSubmit}>
        <Column gap="16">
          <Row
            gap="16"
            vertical="center"
            s={{ direction: "column", vertical: "stretch" }}
            fillWidth
          >
            <Flex
              width="64"
              height="64"
              radius="full"
              background="brand-alpha-weak"
              horizontal="center"
              vertical="center"
              style={{ flexShrink: 0 }}
            >
              <Image
                src={getAvatarUrl(userId)}
                alt="Avatar"
                width={64}
                height={64}
                unoptimized
                style={{ borderRadius: "9999px" }}
              />
            </Flex>
            <Column gap="2">
              <Text variant="body-default-s">{email}</Text>
              <Text variant="body-default-xs" onBackground="neutral-weak">
                Avatar generado automáticamente
              </Text>
            </Column>
          </Row>

          <Input
            id="name"
            label="Nombre"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
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
                Perfil actualizado.
              </Text>
            </Row>
          )}

          <Row>
            <Button
              type="submit"
              size="m"
              disabled={isSubmitting || displayName.trim() === name}
            >
              {isSubmitting ? "Guardando..." : "Guardar nombre"}
            </Button>
          </Row>
        </Column>
      </form>
    </Flex>
  );
};
