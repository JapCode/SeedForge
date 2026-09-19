"use client";

import { useRouter } from "next/navigation";
import { Column, UserMenu, Button, Text } from "@once-ui-system/core";
import { authClient } from "@/infrastructure/auth/auth-client";
import { getAvatarUrl } from "@/components/avatar";

/**
 * Signed-in user menu shown in the global navbar (SiteNav). Renders the
 * user's avatar + name and a dropdown with the sign-out action. Returns null
 * while the session is pending or when signed out.
 */
export const UserMenuClient = () => {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  if (isPending || !session?.user) {
    return null;
  }

  return (
    <UserMenu
      name={session.user.name}
      avatarProps={{
        src: getAvatarUrl(session.user.id),
        unoptimized: true,
      }}
      dropdown={
        <Column padding="8" gap="4" minWidth="160">
          <Text
            variant="body-default-s"
            onBackground="neutral-weak"
            padding="8"
          >
            {session.user.email}
          </Text>
          <Button
            variant="tertiary"
            size="s"
            label="Configuración"
            prefixIcon="settings"
            href="/configuracion"
          />
          <Button
            variant="tertiary"
            size="s"
            label="Cerrar sesión"
            prefixIcon="close"
            onClick={handleSignOut}
          />
        </Column>
      }
    />
  );
};
