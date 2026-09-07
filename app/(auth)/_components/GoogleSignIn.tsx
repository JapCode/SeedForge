"use client";

import { useState } from "react";
import { Button, Flex, Row, Text } from "@once-ui-system/core";
import { authClient } from "@/infrastructure/auth/auth-client";

const GoogleLogo = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    aria-hidden="true"
    style={{ marginRight: "var(--static-space-8)" }}
  >
    <path
      fill="#4285F4"
      d="M19.6 10.23c0-.68-.06-1.36-.18-2.02H10v3.82h5.39a4.6 4.6 0 0 1-2 3.02v2.5h3.23c1.89-1.74 2.98-4.3 2.98-7.32z"
    />
    <path
      fill="#34A853"
      d="M10 20c2.7 0 4.96-.9 6.62-2.42l-3.23-2.5c-.9.6-2.04.95-3.39.95-2.6 0-4.8-1.76-5.59-4.12H1.1v2.58A10 10 0 0 0 10 20z"
    />
    <path
      fill="#FBBC05"
      d="M4.41 11.9a5.98 5.98 0 0 1 0-3.82V5.5H1.1a10 10 0 0 0 0 9l3.31-2.6z"
    />
    <path
      fill="#EA4335"
      d="M10 4.02c1.47 0 2.79.5 3.83 1.5l2.87-2.87A10 10 0 0 0 1.1 5.5l3.31 2.58c.79-2.36 2.99-4.06 5.59-4.06z"
    />
  </svg>
);

interface GoogleSignInProps {
  /** Called to surface errors in the parent form's error banner. */
  onError: (message: string) => void;
}

/**
 * "o" divider + Google sign-in button, shared by the auth forms.
 * Requires GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET on the server to work;
 * until then the click reports the error through onError.
 */
export const GoogleSignIn = ({ onError }: GoogleSignInProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleGoogleSignIn() {
    onError("");
    setIsSubmitting(true);

    const { error: socialError } = await authClient.signIn.social({
      provider: "google",
    });

    setIsSubmitting(false);

    if (socialError) {
      onError("No se pudo iniciar con Google. Inténtalo de nuevo.");
    }
  }

  return (
    <>
      <Row gap="16" vertical="center" fillWidth>
        <Flex
          flex="1"
          background="neutral-alpha-medium"
          style={{ height: "1px" }}
        />
        <Text onBackground="neutral-weak" variant="body-default-m">
          o
        </Text>
        <Flex
          flex="1"
          background="neutral-alpha-medium"
          style={{ height: "1px" }}
        />
      </Row>

      <Button
        variant="secondary"
        size="l"
        fillWidth
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isSubmitting}
      >
        <GoogleLogo />
        Continuar con Google
      </Button>
    </>
  );
};
