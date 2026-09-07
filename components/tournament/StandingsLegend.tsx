"use client";

import { Fragment, useState } from "react";
import { Text, Row, Column, Icon, Grid } from "@once-ui-system/core";
import { MorphIcon } from "morphicons/react";
import { ChevronDown, ChevronUp } from "lucide";

const orderChain = [
  { code: "AA", sigla: "Pts" },
  { code: "BBB", sigla: "OMW%" },
  { code: "CCC", sigla: "OGW%" },
  { code: "DDD", sigla: "DDD" },
];

const legendItems: { sigla: string; description: string }[] = [
  {
    sigla: "AA",
    description: "Puntos ganados durante el torneo",
  },
  {
    sigla: "BBB",
    description: "Match-win % de tus rivales",
  },
  {
    sigla: "CCC",
    description: "Match-win % de los rivales de tus rivales",
  },
  {
    sigla: "DDD",
    description:
      "Suma de los cuadrados de las rondas donde perdiste. Ej.: rondas 2 y 7 → 2² + 7² = 53 · menor = mejor",
  },
];

export const StandingsLegend = () => {
  const [showLegend, setShowLegend] = useState(false);

  return (
    <Column fillWidth gap="8">
      <Row
        gap="4"
        vertical="center"
        cursor="pointer"
        role="button"
        tabIndex={0}
        aria-expanded={showLegend}
        onClick={() => setShowLegend((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setShowLegend((value) => !value);
          }
        }}
      >
        <span className="neutral-on-background-weak">
          <MorphIcon
            icon={showLegend ? ChevronUp : ChevronDown}
            size={16}
            spring="snappy"
          />
        </span>
        <Text variant="label-default-s" onBackground="neutral-weak">
          ¿Qué significan OMW%, OGW% y DDD?
        </Text>
      </Row>
      <Grid
        fillWidth
        transition="macro-medium"
        style={{ gridTemplateRows: showLegend ? "1fr" : "0fr" }}
        aria-hidden={!showLegend}
      >
        <Row fillWidth minHeight={0} overflow="hidden">
          <Column
            fillWidth
            gap="16"
            padding="16"
            radius="l"
            border="neutral-alpha-medium"
            background="surface"
          >
            <Column fillWidth gap="8">
              <Text variant="label-default-s" onBackground="neutral-weak">
                Número de desempate (AABBBCCCDDD)
              </Text>
              <Row fillWidth gap="8" wrap vertical="center">
                {orderChain.map((item, index) => (
                  <Fragment key={item.code}>
                    {index > 0 && (
                      <Icon
                        name="chevronRight"
                        size="xs"
                        onBackground="neutral-weak"
                      />
                    )}
                    <Column
                      paddingX="8"
                      paddingY="4"
                      radius="s"
                      background="brand-alpha-weak"
                      border="brand-alpha-medium"
                      horizontal="center"
                      gap="2"
                    >
                      <Text
                        variant="label-default-s"
                        onBackground="brand-medium"
                      >
                        {item.code}
                      </Text>
                      <Text
                        variant="label-default-xs"
                        onBackground="neutral-weak"
                      >
                        {item.sigla}
                      </Text>
                    </Column>
                  </Fragment>
                ))}
              </Row>
            </Column>

            <Row fillWidth height="1" background="neutral-alpha-weak" />

            <Column fillWidth gap="12">
              {legendItems.map((item) => (
                <Row key={item.sigla} gap="12" vertical="center" wrap>
                  <Row
                    paddingX="8"
                    paddingY="4"
                    radius="s"
                    background="neutral-alpha-weak"
                    horizontal="center"
                    style={{ minWidth: "3.5rem" }}
                  >
                    <Text variant="label-default-xs">{item.sigla}</Text>
                  </Row>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    {item.description}
                  </Text>
                </Row>
              ))}
            </Column>

            <Row gap="8" vertical="center">
              <Icon name="info" size="xs" onBackground="brand-medium" />
              <Text variant="body-default-s" onBackground="neutral-weak">
                Cada rival cuenta con un piso de 33% en su match-win %.
              </Text>
            </Row>

            <Row gap="8" vertical="center">
              <Icon name="info" size="xs" onBackground="brand-medium" />
              <Text variant="body-default-s" onBackground="neutral-weak">
                Ejemplo: 18 (AA) · 72,6% (BBB) · 67,7% (CCC) · 53 (DDD: 2² + 7²)
              </Text>
            </Row>
          </Column>
        </Row>
      </Grid>
    </Column>
  );
};
