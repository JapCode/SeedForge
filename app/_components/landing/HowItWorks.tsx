import {
  Column,
  Flex,
  Row,
  Grid,
  Heading,
  Text,
  Card,
  Badge,
  Icon,
} from "@once-ui-system/core";

/**
 * "Cómo funciona" — the organizer's mental model in four steps, composed as a
 * bento grid: large and small cells alternate (2/3 + 1/3) so the flow reads
 * as one asymmetric composition instead of a wall of equal cards. Each step
 * carries a small artifact built from the real UI primitives so the flow
 * reads as the product, not as a bullet list. A quiet proof strip closes the
 * section without adding more boxes.
 */
const steps = [
  {
    icon: "clipboardList" as const,
    size: "tall" as const,
    title: "Crea el torneo",
    description:
      "Elige la cantidad de rondas, el top cut y el reglamento. En menos de un minuto está listo.",
    artifact: (
      <Column gap="12">
        <Text variant="label-default-xs" onBackground="neutral-weak">
          Configuración
        </Text>
        <Row gap="8" wrap>
          <Flex
            padding="8"
            paddingX="12"
            radius="m"
            border="neutral-alpha-weak"
            borderStyle="solid"
            borderWidth={1}
            gap="8"
            vertical="center"
          >
            <Text variant="label-default-xs" onBackground="neutral-weak">
              Rondas
            </Text>
            <Text variant="body-strong-s">5</Text>
          </Flex>
          <Flex
            padding="8"
            paddingX="12"
            radius="m"
            border="neutral-alpha-weak"
            borderStyle="solid"
            borderWidth={1}
            gap="8"
            vertical="center"
          >
            <Text variant="label-default-xs" onBackground="neutral-weak">
              Top cut
            </Text>
            <Text variant="body-strong-s">Top 8</Text>
          </Flex>
          <Flex
            padding="8"
            paddingX="12"
            radius="m"
            border="neutral-alpha-weak"
            borderStyle="solid"
            borderWidth={1}
            gap="8"
            vertical="center"
          >
            <Text variant="label-default-xs" onBackground="neutral-weak">
              Formato
            </Text>
            <Text variant="body-strong-s">Suizo</Text>
          </Flex>
        </Row>
        <Row gap="8" vertical="center">
          <Badge background="brand-alpha-weak" onBackground="brand-strong">
            Vigente
          </Badge>
          <Text variant="body-default-s" onBackground="neutral-weak">
            sin empates · 50 min
          </Text>
        </Row>
      </Column>
    ),
  },
  {
    icon: "users" as const,
    size: "small" as const,
    title: "Carga jugadores",
    description:
      "Registro rápido desde el teléfono o la computadora. Cada jugador queda con su historial de partidas.",
    artifact: (
      <Row gap="8" wrap>
        {["María F.", "Carlos M.", "Andrés V."].map((name) => (
          <Flex
            key={name}
            padding="4"
            paddingX="12"
            radius="m"
            background="surface"
            border="neutral-alpha-weak"
            borderStyle="solid"
            borderWidth={1}
          >
            <Text variant="body-default-s">{name}</Text>
          </Flex>
        ))}
        <Flex
          padding="4"
          paddingX="12"
          radius="m"
          border="neutral-alpha-weak"
          borderStyle="solid"
          borderWidth={1}
        >
          <Text variant="body-default-s" onBackground="neutral-weak">
            +15
          </Text>
        </Flex>
      </Row>
    ),
  },
  {
    icon: "swords" as const,
    size: "small" as const,
    title: "Genera la ronda",
    description:
      "Con un toque, el sistema empareja a todos: sin rivales repetidos y con el bye resuelto.",
    artifact: (
      <Row
        gap="8"
        vertical="center"
        padding="8"
        radius="m"
        border="neutral-alpha-weak"
        borderStyle="solid"
        borderWidth={1}
      >
        <Text variant="label-default-xs" onBackground="neutral-weak">
          Mesa 4
        </Text>
        <Text variant="body-strong-s">Carlos</Text>
        <Badge background="brand-alpha-weak" onBackground="brand-strong">
          2-1
        </Badge>
        <Text variant="body-strong-s">María</Text>
      </Row>
    ),
  },
  {
    icon: "share" as const,
    size: "wide" as const,
    title: "Comparte los resultados",
    description:
      "Un enlace público y los jugadores siguen la tabla en vivo desde su teléfono, sin registrarse.",
    artifact: (
      <Flex
        gap="12"
        vertical="center"
        wrap
        padding="12"
        paddingX="16"
        radius="m"
        border="neutral-alpha-weak"
        borderStyle="solid"
        borderWidth={1}
      >
        <Icon name="link" size="s" onBackground="brand-medium" />
        <Text variant="body-default-m">seedforge.app/t/8f2ac4</Text>
        <Flex fillWidth />
        <Text variant="label-default-xs" onBackground="neutral-weak">
          Clasificación en vivo · solo lectura
        </Text>
      </Flex>
    ),
  },
];

/** The non-redundant proofs, kept as a quiet strip instead of more cards. */
const proofs = [
  {
    icon: "radialGauge" as const,
    title: "Desempates KTS",
    sub: "Pts → OMW% → OGW% → DDD · piso 33%",
  },
  {
    icon: "trophy" as const,
    title: "Top cut con bracket",
    sub: "Top 4 · 8 · 16 · 32",
  },
  {
    icon: "security" as const,
    title: "Reglas vigentes",
    sub: "3-1-0 · sin empates por defecto",
  },
  {
    icon: "undo" as const,
    title: "Todo reversible",
    sub: "cada acción se puede revertir",
  },
];

export const HowItWorks = () => {
  return (
    <Column fillWidth maxWidth={60} gap="32" id="como-funciona">
      <Column gap="8" horizontal="center" center className="sf-rise">
        <Heading as="h2" variant="display-strong-xs" align="center">
          Así se corre un torneo
        </Heading>
        <Text
          variant="body-default-m"
          onBackground="neutral-medium"
          align="center"
          wrap="balance"
        >
          Del listado de jugadores al resultado final, sin salir del navegador.
        </Text>
      </Column>

      {/* Bento: a true asymmetric grid — the first step is a tall cell on
          the left spanning two rows, the two middle steps stack on the
          right, and the last step spans the full width at the bottom. The
          flow still reads 1 → 2 → 3 → 4. */}
      <div className="sf-bento">
        {steps.map((step, index) => (
          <Flex
            key={step.title}
            className={
              "sf-rise" +
              (step.size === "tall" ? " sf-bento-tall" : "") +
              (step.size === "wide" ? " sf-bento-wide" : "")
            }
          >
            <Card
              fillWidth
              fillHeight
              padding="24"
              radius="l"
              border="neutral-alpha-medium"
              borderStyle="solid"
              borderWidth={1}
              className="sf-bento-card"
            >
              <Column gap="16" height="100%" vertical="between">
                <Column gap="16">
                  <Row gap="12" vertical="center">
                    <Flex
                      horizontal="center"
                      vertical="center"
                      width="40"
                      height="40"
                      radius="m"
                      background="brand-alpha-medium"
                    >
                      <Icon
                        name={step.icon}
                        size="s"
                        onBackground="brand-medium"
                      />
                    </Flex>
                    <Column gap="2">
                      <Text
                        variant="label-default-xs"
                        onBackground="neutral-weak"
                      >
                        Paso {index + 1}
                      </Text>
                      <Heading as="h3" variant="heading-strong-m">
                        {step.title}
                      </Heading>
                    </Column>
                  </Row>
                  <Text variant="body-default-s" onBackground="neutral-medium">
                    {step.description}
                  </Text>
                </Column>
                {step.artifact}
              </Column>
            </Card>
          </Flex>
        ))}
      </div>

      {/* Proof strip: plain text row, no card chrome. Sits on the section's
          own 32px rhythm (no extra padding) and spaces its label and items
          uniformly at 24px. */}
      <Column fillWidth gap="24" className="sf-rise">
        <Text
          variant="label-default-s"
          onBackground="neutral-weak"
          align="center"
        >
          Menos planillas, más partidas
        </Text>
        {/* Proof items: an explicit grid (4 across, 2×2 below the s
            breakpoint, single column on xs) so the spacing stays even at
            every width — no flex-wrap orphans or stretched single items. */}
        <Grid
          fillWidth
          columns={4}
          gap="16"
          m={{ columns: 2 }}
          s={{ columns: 2 }}
          xs={{ columns: 2 }}
        >
          {proofs.map((proof) => (
            <Card
              key={proof.title}
              className="sf-proof-item"
              fillWidth
              padding="16"
              radius="m"
              border="neutral-alpha-weak"
              borderStyle="solid"
              borderWidth={1}
            >
              <Flex className="sf-proof-inner" gap="12" vertical="start">
                <Flex
                  horizontal="center"
                  vertical="center"
                  width="40"
                  height="40"
                  radius="m"
                  background="brand-alpha-medium"
                  flex={0}
                >
                  <Icon
                    name={proof.icon}
                    size="s"
                    onBackground="brand-medium"
                  />
                </Flex>
                <Column gap="2" className="sf-proof-text">
                  <Text variant="body-strong-s">{proof.title}</Text>
                  <Text variant="label-default-xs" onBackground="neutral-weak">
                    {proof.sub}
                  </Text>
                </Column>
              </Flex>
            </Card>
          ))}
        </Grid>
      </Column>
    </Column>
  );
};
