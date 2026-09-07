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
          : "No se pudo crear la cuenta. Inténtalo de nuevo.",
      );
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Column
      fillWidth
      gap="24"
      padding="32"
      radius="l"
      border
      background="surface"
    >
      <Column gap="8" fillWidth horizontal="center">
        <Heading as="h1" variant="display-strong-xs" align="center">
          Crear cuenta
        </Heading>
        <Text
          onBackground="neutral-weak"
          variant="body-default-m"
          align="center"
        >
          Crea tu cuenta y arma tu primer torneo en menos de un minuto. Sin
          instalar nada.
        </Text>
      </Column>

      <form onSubmit={handleSubmit}>
        <Column gap="16">
          <AuthFieldGroup
            background="var(--static-transparent)"
            fields={[
              {
                id: "name",
                label: "Nombre",
                type: "text",
                value: name,
                onChange: (event) => setName(event.target.value),
                autoComplete: "name",
                required: true,
              },
              {
                id: "email",
                label: "Email",
                type: "email",
                value: email,
                onChange: (event) => setEmail(event.target.value),
                autoComplete: "email",
                required: true,
              },
            ]}
          />
          <AuthFieldGroup
            background="var(--static-transparent)"
            fields={[
              {
                id: "password",
                label: "Contraseña",
                type: "password",
                value: password,
                onChange: (event) => setPassword(event.target.value),
                autoComplete: "new-password",
                required: true,
                isPassword: true,
              },
              {
                id: "confirmPassword",
                label: "Confirmar contraseña",
                type: "password",
                value: confirmPassword,
                onChange: (event) => setConfirmPassword(event.target.value),
                autoComplete: "new-password",
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

          <Row fillWidth horizontal="center" paddingTop="8">
            <Button
              type="submit"
              size="m"
              style={{ width: "90%" }}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
            </Button>
          </Row>
        </Column>
      </form>

      <GoogleSignIn onError={setError} />

      <Text
        onBackground="neutral-weak"
        variant="label-default-s"
        align="center"
      >
        Sin instalar nada · Tus torneos son tuyos
      </Text>

      <Text onBackground="neutral-weak" variant="body-default-s" align="center">
        ¿Ya tienes cuenta? <SmartLink href="/login">Iniciar sesión</SmartLink>
      </Text>
    </Column>
  );
};
