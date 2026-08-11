"use client";

import { useState, useTransition } from "react";
import { Column, Row, Button, Input, Text } from "@once-ui-system/core";
import { shareTournamentAction } from "./actions";

export const ShareButton = ({
  tournamentId,
  existingToken,
}: {
  tournamentId: string;
  existingToken: string | null;
}) => {
  const [isPending, startTransition] = useTransition();
  const [token, setToken] = useState<string | null>(existingToken);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const result = await shareTournamentAction(tournamentId);
      if (result.error) {
        setError(result.error);
      } else {
        setToken(result.token);
      }
    });
  }

  async function handleCopy(shareUrl: string) {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!token) {
    return (
      <Column gap="8">
        <Button
          onClick={handleGenerate}
          disabled={isPending}
          variant="secondary"
        >
          {isPending ? "Generando..." : "Generar link para compartir"}
        </Button>
        {error && (
          <Text onBackground="danger-weak" variant="body-default-s">
            {error}
          </Text>
        )}
      </Column>
    );
  }

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/share/${token}`
      : `/share/${token}`;

  return (
    <Row gap="8" vertical="end">
      <Input id="shareUrl" label="Link público" value={shareUrl} readOnly />
      <Button onClick={() => handleCopy(shareUrl)} variant="secondary">
        {copied ? "Copiado!" : "Copiar"}
      </Button>
    </Row>
  );
};
