import {
  Column,
  Flex,
  Row,
  Heading,
  Text,
  Icon,
  SmartLink,
} from "@once-ui-system/core";

const footerLinks = [
  { label: "Cómo funciona", href: "#como-funciona" },
  { label: "Iniciar sesión", href: "/login" },
  { label: "Crear cuenta", href: "/registro" },
];

/**
 * Minimal landing footer: brand mark on the left, quiet nav on the right.
 * The links are guest-appropriate (the app routes are behind the (app)
 * layout guards, so they would dead-end for signed-out visitors).
 */
export const LandingFooter = () => {
  return (
    <Flex
      as="footer"
      fillWidth
      horizontal="center"
      padding="24"
      paddingX="32"
      borderTop="neutral-alpha-weak"
      borderStyle="solid"
      borderWidth={1}
    >
      <Row
        fillWidth
        maxWidth={80}
        horizontal="between"
        vertical="center"
        wrap
        gap="16"
        s={{ direction: "column", horizontal: "center" }}
      >
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
          <Column gap="2">
            <Heading as="p" variant="heading-strong-m">
              Seed Forge
            </Heading>
            <Text variant="label-default-xs" onBackground="neutral-weak">
              Hecho para organizadores de torneos Yu-Gi-Oh
            </Text>
          </Column>
        </Row>

        <Row gap="16" vertical="center" wrap>
          {footerLinks.map((link) => (
            <SmartLink key={link.href} href={link.href} unstyled>
              <Text variant="body-default-s" onBackground="neutral-weak">
                {link.label}
              </Text>
            </SmartLink>
          ))}
        </Row>
      </Row>
    </Flex>
  );
};
