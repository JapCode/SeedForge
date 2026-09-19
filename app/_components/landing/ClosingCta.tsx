import { Column, Flex, Row, Heading, Text, Button } from "@once-ui-system/core";

/**
 * Closing CTA: the final push. A forge-violet panel with a soft glow behind
 * it, one primary action and a quiet secondary one.
 */
export const ClosingCta = ({ primaryCtaHref }: { primaryCtaHref: string }) => {
  return (
    <Flex
      fillWidth
      horizontal="center"
      position="relative"
      paddingY="16"
      paddingX="16"
      className="sf-rise"
    >
      <Flex
        position="absolute"
        aria-hidden
        className="sf-landing-glow"
        style={{ top: -120, bottom: -120, left: 0, right: 0 }}
      />
      <Column
        fillWidth
        maxWidth={48}
        horizontal="center"
        gap="16"
        center
        padding="48"
        s={{ style: { padding: "24px" } }}
        radius="l"
        background="brand-alpha-weak"
        border="brand-alpha-medium"
        borderStyle="solid"
        borderWidth={1}
      >
        <Heading as="h2" variant="display-strong-xs" align="center">
          ¿Listo para tu próximo torneo?
        </Heading>
        <Text
          variant="body-default-m"
          onBackground="neutral-medium"
          align="center"
          wrap="balance"
        >
          Crea un torneo en menos de un minuto y empieza a registrar jugadores.
        </Text>
        <Row
          gap="16"
          wrap
          horizontal="center"
          s={{ direction: "column", horizontal: "center" }}
        >
          <Button
            variant="primary"
            size="l"
            label="Empezar gratis"
            arrowIcon
            href={primaryCtaHref}
          />
          <Button
            variant="secondary"
            size="l"
            label="Iniciar sesión"
            href="/login"
          />
        </Row>
        <Text variant="label-default-s" onBackground="neutral-weak">
          Empieza en el navegador: no hace falta instalar nada.
        </Text>
      </Column>
    </Flex>
  );
};
