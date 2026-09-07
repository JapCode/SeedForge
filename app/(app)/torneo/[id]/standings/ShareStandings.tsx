"use client";

import { useState, useTransition } from "react";
import {
  Column,
  Row,
  Button,
  Input,
  Text,
  Flex,
  Dialog,
} from "@once-ui-system/core";
import QRCode from "react-qr-code";
import { MorphIcon } from "morphicons/react";
import { Check, Copy } from "lucide";
import { shareTournamentAction } from "./actions";

export const ShareStandings = ({
  tournamentId,
  existingToken,
  tab = "standings",
}: {
  tournamentId: string;
  existingToken: string | null;
  /** Public view tab the shared link opens on (bracket or standings). */
  tab?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
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

  const shareUrl = token
    ? typeof window !== "undefined"
      ? `${window.location.origin}/share/${token}?tab=${tab}`
      : `/share/${token}?tab=${tab}`
    : "";

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="secondary"
        prefixIcon="link"
      >
        Compartir
      </Button>

      <Dialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Compartir torneo"
        description={
          token
            ? "Escanea el código o copia el enlace para que los jugadores sigan el torneo en vivo."
            : "Genera un enlace público para que los jugadores sigan el torneo desde su teléfono."
        }
        footer={
          <Row gap="8" horizontal="end">
            <Button
              variant="secondary"
              label="Cerrar"
              onClick={() => setIsOpen(false)}
            />
          </Row>
        }
      >
        <Column fillWidth gap="16" horizontal="center">
          {!token ? (
            <Column fillWidth gap="12" horizontal="center">
              <Button onClick={handleGenerate} disabled={isPending}>
                {isPending ? "Generando..." : "Generar enlace para compartir"}
              </Button>
              {error && (
                <Text onBackground="danger-weak" variant="body-default-s">
                  {error}
                </Text>
              )}
            </Column>
          ) : (
            <>
              <Column gap="8" horizontal="center">
                <Flex
                  horizontal="center"
                  vertical="center"
                  padding="12"
                  radius="m"
                  border="neutral-alpha-weak"
                  style={{ background: "#ffffff" }}
                >
                  <QRCode value={shareUrl} size={128} />
                </Flex>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  Escanea con tu teléfono
                </Text>
              </Column>

              <Column fillWidth gap="12">
                <Row gap="8" vertical="end">
                  <Input
                    id="shareUrl"
                    label="Enlace público"
                    value={shareUrl}
                    readOnly
                    height="s"
                    style={{ minWidth: 0 }}
                  />
                  <Button
                    onClick={() => handleCopy(shareUrl)}
                    variant="secondary"
                    size="l"
                  >
                    <MorphIcon
                      icon={copied ? Check : Copy}
                      size={20}
                      spring="snappy"
                    />
                    {copied ? "Copiado" : "Copiar"}
                  </Button>
                </Row>
                <Button
                  href={`/share/${token}?tab=${tab}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="secondary"
                  suffixIcon="arrowUpRight"
                  fillWidth
                >
                  Abrir vista pública
                </Button>
              </Column>
            </>
          )}
        </Column>
      </Dialog>
    </>
  );
};
