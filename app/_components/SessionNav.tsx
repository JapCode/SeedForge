"use client";

import { useRouter } from "next/navigation";
import { Button, Flex, Text } from "@once-ui-system/core";
import { authClient } from "@/infrastructure/auth/auth-client";

/**
 * Client header navigation driven by the Better Auth session. Shows
 * login/register links when signed out, or the user's name plus a sign-out
 * button when signed in. Relies on authClient.SessionProvider (app/providers.tsx).
 */
export const SessionNav = () => {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  // Reserve the space while the session is loading to avoid layout shift.
  if (isPending) {
    return <Flex gap="12" />;
  }

  if (session?.user) {
    return (
      <Flex gap="12" vertical="center">
        <Text variant="body-default-s" onBackground="neutral-medium">
          {session.user.name}
        </Text>
        <Button
          variant="secondary"
          size="s"
          label="Cerrar sesión"
          onClick={handleSignOut}
        />
      </Flex>
    );
  }

  return (
    <Flex gap="12">
      <Button
        variant="secondary"
        size="s"
        label="Iniciá sesión"
        href="/login"
      />
      <Button variant="primary" size="s" label="Registrate" href="/registro" />
    </Flex>
  );
};
