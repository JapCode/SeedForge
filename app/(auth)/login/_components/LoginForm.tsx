"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Column,
  Heading,
  Text,
  Input,
  Button,
  SmartLink,
} from "@once-ui-system/core";
import { authClient } from "@/infrastructure/auth/auth-client";

export const LoginForm = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
    });

    setIsSubmitting(false);

    if (signInError) {
      setError("Email o contraseña incorrectos.");
      return;
    }

    router.push("/");
  }

  return (
    <Column
      maxWidth={24}
      gap="24"
      padding="32"
      radius="l"
      border
      background="surface"
    >
      <Column gap="8">
        <Heading as="h1" variant="heading-strong-l">
          Iniciar sesión
        </Heading>
        <Text onBackground="neutral-weak">
          Entrá para gestionar tus torneos.
        </Text>
      </Column>

      <form onSubmit={handleSubmit}>
        <Column gap="16">
          <Input
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            height="xs"
            required
          />
          <Input
            id="password"
            label="Contraseña"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            height="xs"
            required
          />

          {error && (
            <Text onBackground="danger-weak" variant="body-default-s">
              {error}
            </Text>
          )}

          <Button type="submit" fillWidth disabled={isSubmitting}>
            {isSubmitting ? "Entrando..." : "Entrar"}
          </Button>
        </Column>
      </form>

      <Text onBackground="neutral-weak" variant="body-default-s" align="center">
        ¿No tenés cuenta? <SmartLink href="/registro">Registrate</SmartLink>
      </Text>
    </Column>
  );
};
