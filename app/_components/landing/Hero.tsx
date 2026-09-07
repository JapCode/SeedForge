import {
  Column,
  Flex,
  Row,
  Heading,
  Text,
  Button,
  Icon,
} from "@once-ui-system/core";
import { DemoStandings } from "./DemoStandings";

/**
 * Landing hero: the thesis in the first viewport. Copy on the left with the
 * primary action, and the product's own mechanism — a live synthetic
 * standings table — on the right, wrapped in a soft forge-violet glow. The
 * claims live in the proof strip below (HowItWorks), not here: the hero
 * stays copy + action + mechanism.
 */
export const Hero = ({ primaryCtaHref }: { primaryCtaHref: string }) => {
  return (
    // paddingTop is a number → rem (6rem = 96px), keeping the hero clear of
    // the sticky nav pill. sf-hero adds the forge-floor depth layers.
    <Column
      fillWidth
      horizontal="center"
      paddingTop={6}
      paddingBottom="80"
      className="sf-hero"
    >
      <Row
        fillWidth
        maxWidth={80}
        wrap
        horizontal="center"
        vertical="center"
        gap="40"
      >
        {/* Copy column */}
        <Column
          gap="24"
          style={{ flex: "1 1 calc(50% - 20px)", minWidth: "20rem" }}
        >
          <Row gap="8" vertical="center">
            <Icon name="sparkle" size="s" onBackground="brand-medium" />
            <Text variant="label-strong-s" onBackground="brand-medium">
              El gestor suizo para Yu-Gi-Oh
            </Text>
          </Row>

          <Heading as="h1" variant="display-strong-l" wrap="balance">
            Organiza torneos sin planillas ni cálculos a mano
          </Heading>

          <Text
            as="p"
            variant="body-default-l"
            onBackground="neutral-medium"
            wrap="balance"
          >
            Seed Forge es el gestor de torneos suizos para Yu-Gi-Oh: genera los
            emparejamientos, calcula los desempates oficiales y arma el top cut.
            Solo tienes que cargar los resultados — los jugadores siguen la
            tabla en vivo desde su teléfono.
          </Text>

          <Row gap="16" wrap>
            <Button
              variant="primary"
              size="l"
              label="Empezar gratis"
              href={primaryCtaHref}
              arrowIcon
            />
            <Button
              variant="secondary"
              size="l"
              label="Ver cómo funciona"
              href="#como-funciona"
            />
          </Row>
        </Column>

        {/* Demo column */}
        <Flex
          fillWidth
          position="relative"
          style={{ flex: "1 1 calc(50% - 20px)", minWidth: "20rem" }}
        >
          <Flex
            position="absolute"
            aria-hidden
            className="sf-landing-glow"
            style={{ top: -80, bottom: -80, left: 0, right: 0 }}
          />
          <DemoStandings />
        </Flex>
      </Row>
    </Column>
  );
};
