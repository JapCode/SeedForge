"use client";

import { useEffect, useState } from "react";
import {
  Column,
  Row,
  Flex,
  Heading,
  Text,
  Button,
  Icon,
} from "@once-ui-system/core";
import { authClient } from "@/infrastructure/auth/auth-client";

interface LinkedAccount {
  id: string;
  providerId: string;
  accountId: string;
}

export const LinkedAccountsForm = () => {
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  async function loadAccounts() {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await authClient.listAccounts();
    if (fetchError) {
      setError("No se pudieron cargar las cuentas vinculadas.");
      setLoading(false);
      return;
    }
    setAccounts(data ?? []);
    setLoading(false);
  }

  async function handleLink() {
    setActionLoading(true);
    setError(null);
    setSuccess(false);
    const { error: linkError } = await authClient.linkSocial({
      provider: "google",
      callbackURL: "/configuracion",
    });
    setActionLoading(false);
    if (linkError) {
      setError("No se pudo vincular la cuenta de Google.");
    }
  }

  async function handleUnlink(accountId: string, providerId: string) {
    setActionLoading(true);
    setError(null);
    setSuccess(false);
    const { error: unlinkError } = await authClient.unlinkAccount({
      accountId,
      providerId,
    });
    setActionLoading(false);
    if (unlinkError) {
      setError(
        unlinkError.message || "No se pudo desvincular la cuenta de Google.",
      );
      return;
    }
    setSuccess(true);
    await loadAccounts();
  }

  const googleAccount = accounts.find((a) => a.providerId === "google");
  const isLinked = !!googleAccount;

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
          Cuentas vinculadas
        </Heading>
        <Text variant="body-default-s" onBackground="neutral-weak">
          Conectá cuentas externas para iniciar sesión más rápido.
        </Text>
      </Column>

      {loading ? (
        <Text variant="body-default-s" onBackground="neutral-weak">
          Cargando...
        </Text>
      ) : (
        <Column gap="16">
          <Row
            gap="16"
            vertical="center"
            s={{ direction: "column", vertical: "stretch" }}
            fillWidth
          >
            <Row
              gap="12"
              vertical="center"
              fillWidth
              padding="12"
              radius="m"
              background="neutral-alpha-weak"
            >
              <Icon name="world" size="s" />
              <Column gap="2" fillWidth>
                <Text variant="body-default-s">Google</Text>
                {isLinked && (
                  <Text variant="body-default-xs" onBackground="neutral-weak">
                    Vinculada
                  </Text>
                )}
              </Column>
              {isLinked ? (
                <Button
                  size="s"
                  variant="danger"
                  disabled={actionLoading}
                  onClick={() =>
                    handleUnlink(
                      googleAccount!.accountId,
                      googleAccount!.providerId,
                    )
                  }
                >
                  {actionLoading ? "..." : "Desvincular"}
                </Button>
              ) : (
                <Button
                  size="s"
                  variant="secondary"
                  disabled={actionLoading}
                  onClick={handleLink}
                >
                  {actionLoading ? "..." : "Vincular"}
                </Button>
              )}
            </Row>
          </Row>

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
                Cuenta actualizada correctamente.
              </Text>
            </Row>
          )}
        </Column>
      )}
    </Flex>
  );
};
