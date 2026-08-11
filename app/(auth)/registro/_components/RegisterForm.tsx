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

export const RegisterForm = () => {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (confirmPassword !== password) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setIsSubmitting(true);

    const { error: signUpError } = await authClient.signUp.email({
      name,
      email,
      password,
    });

    setIsSubmitting(false);

    if (signUpError) {
      setError(
        signUpError.message === "User already exists"
          ? "Ya existe una cuenta con ese email."
          : "No se pudo crear la cuenta. Probá de nuevo.",
      );
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
          Crear cuenta
        </Heading>
        <Text onBackground="neutral-weak">
          Registrate para empezar a armar torneos.
        </Text>
      </Column>

      <form onSubmit={handleSubmit}>
        <Column gap="16">
          <Input
            id="name"
            label="Nombre"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            height="xs"
            required
          />
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
            height="xs"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
          />
          <Input
            id="confirmPassword"
            label="Confirmar contraseña"
            type="password"
            height="xs"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            required
          />

          {error && (
            <Text onBackground="danger-weak" variant="body-default-s">
              {error}
            </Text>
          )}

          <Button type="submit" fillWidth disabled={isSubmitting}>
            {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
          </Button>
        </Column>
      </form>

      <Text onBackground="neutral-weak" variant="body-default-s" align="center">
        ¿Ya tenés cuenta? <SmartLink href="/login">Iniciá sesión</SmartLink>
      </Text>
    </Column>
  );
};
