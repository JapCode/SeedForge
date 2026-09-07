"use client";

import { usePathname } from "next/navigation";
import {
  Button,
  Flex,
  Heading,
  Icon,
  Row,
  SmartLink,
  Text,
} from "@once-ui-system/core";
import { authClient } from "@/infrastructure/auth/auth-client";
import { UserMenuClient } from "./UserMenuClient";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Global floating navbar rendered in the root layout: a sticky pill that
 * floats above the page content, filled with the same tokens as the Once UI
 * Card (translucent "surface" + "neutral-medium" border). Includes the Seed
 * Forge brand, active-route highlighting for the app links, the Once UI
 * ThemeSwitcher, and session-aware actions — login/register buttons when
 * signed out, app navigation (Mis torneos / Crear torneo) plus the user menu
 * when signed in. On small screens the brand text, nav links and secondary
 * button collapse to keep the pill usable.
 */
export const SiteNav = () => {
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();
  const isSignedIn = Boolean(session?.user);

  const isDashboardActive = pathname === "/dashboard";
  const isCreateActive = pathname === "/crear";

  // The public share page is spectator-facing: it renders its own brand
  // header and must not show auth/nav chrome.
  if (pathname.startsWith("/share")) {
    return null;
  }

  return (
    <Flex
      as="header"
      fillWidth
      position="sticky"
      top={0}
      zIndex={10}
      padding="16"
      paddingX="32"
      horizontal="center"
    >
      <Flex
        fillWidth
        maxWidth={80}
        horizontal="between"
        vertical="center"
        padding="8"
        paddingX="16"
        radius="full"
        background="surface"
        border="neutral-medium"
        borderStyle="solid"
        borderWidth={1}
        shadow="m"
      >
        <Row gap="24" vertical="center">
          <SmartLink href={isSignedIn ? "/dashboard" : "/"} unstyled>
            <Row gap="12" vertical="center">
              <Flex
                horizontal="center"
                vertical="center"
                width="32"
                height="32"
                radius="m"
                background="brand-alpha-medium"
              >
                <Icon name="sparkle" size="s" onBackground="brand-medium" />
              </Flex>
              <Flex xs={{ hide: true }}>
                <Heading as="p" variant="heading-strong-m">
                  Seed Forge
                </Heading>
              </Flex>
            </Row>
          </SmartLink>

          {isSignedIn && (
            <Row
              gap="8"
              vertical="center"
              xs={{ hide: true }}
              s={{ hide: true }}
            >
              <SmartLink href="/dashboard" unstyled>
                <Flex
                  padding="8"
                  paddingX="12"
                  radius="m"
                  background={
                    isDashboardActive ? "brand-alpha-weak" : undefined
                  }
                >
                  <Text
                    variant="body-default-m"
                    onBackground={
                      isDashboardActive ? "brand-medium" : "neutral-medium"
                    }
                  >
                    Mis torneos
                  </Text>
                </Flex>
              </SmartLink>
              <SmartLink href="/crear" unstyled>
                <Flex
                  padding="8"
                  paddingX="12"
                  radius="m"
                  background={isCreateActive ? "brand-alpha-weak" : undefined}
                >
                  <Text
                    variant="body-default-m"
                    onBackground={
                      isCreateActive ? "brand-medium" : "neutral-medium"
                    }
                  >
                    Crear torneo
                  </Text>
                </Flex>
              </SmartLink>
            </Row>
          )}
        </Row>

        <Row gap="12" vertical="center">
          <Flex xs={{ hide: true }}>
            <ThemeToggle />
          </Flex>
          {isPending ? (
            <Flex gap="12" />
          ) : isSignedIn ? (
            <UserMenuClient />
          ) : (
            <Flex gap="12">
              <Flex xs={{ hide: true }}>
                <Button
                  variant="secondary"
                  size="s"
                  label="Iniciar sesión"
                  href="/login"
                />
              </Flex>
              <Button
                variant="primary"
                size="s"
                label="Regístrate"
                href="/registro"
              />
            </Flex>
          )}
        </Row>
      </Flex>
    </Flex>
  );
};
