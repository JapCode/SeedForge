"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Column,
  Row,
  Heading,
  Text,
  Button,
  SmartLink,
} from "@once-ui-system/core";
import { authClient } from "@/infrastructure/auth/auth-client";
import { AuthFieldGroup } from "../../_components/AuthFieldGroup";
import { GoogleSignIn } from "../../_components/GoogleSignIn";

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

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Column
      fillWidth
      gap="24"
      padding="40"
      radius="xl"
      border
      background="surface"
    >
      <Column gap="8" fillWidth horizontal="center">
        <Heading as="h1" variant="display-strong-xs" align="center">
          Iniciar sesión
        </Heading>
        <Text
          onBackground="neutral-weak"
          variant="body-default-m"
          align="center"
        >
          Entra para gestionar tus torneos.
        </Text>
      </Column>

      <form onSubmit={handleSubmit}>
        <Column gap="16">
          <AuthFieldGroup
            background="var(--static-transparent)"
            fields={[
              {
                id: "email",
                label: "Email",
                type: "email",
                value: email,
                onChange: (event) => setEmail(event.target.value),
                autoComplete: "email",
                required: true,
              },
              {
                id: "password",
                label: "Contraseña",
                type: "password",
                value: password,
                onChange: (event) => setPassword(event.target.value),
                autoComplete: "current-password",
                required: true,
                isPassword: true,
              },
            ]}
          />

          {error && (
            <Row
              gap="8"
              vertical="center"
              padding="12"
              radius="m"
              background="danger-weak"
            >
              <Text onBackground="danger-strong" variant="body-default-s">
                {error}
              </Text>
            </Row>
          )}

          <Row fillWidth horizontal="center">
            <Button
              type="submit"
              size="m"
              style={{ width: "90%" }}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Iniciando sesión..." : "Entrar"}
            </Button>
          </Row>
        </Column>
      </form>

      <GoogleSignIn onError={setError} />

      <Text onBackground="neutral-weak" variant="body-default-s" align="center">
        ¿No tienes cuenta? <SmartLink href="/registro">Regístrate</SmartLink>
      </Text>
    </Column>
  );
};
