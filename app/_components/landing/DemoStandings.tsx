import { Column, Flex, Row, Text, Table, Icon } from "@once-ui-system/core";

/**
 * Synthetic, static standings demo for the landing hero. It renders the real
 * Once UI Table with plausible round-3 data so the product demonstrates its
 * own mechanism (official tiebreakers, strong numbers) instead of claiming
 * it. The "Datos de ejemplo" label keeps the synthetic nature honest.
 */
const demoRows = [
  { name: "Carlos Mendoza", pts: 9, omw: "58.3%", ogw: "55.3%" },
  { name: "Andrés Vega", pts: 9, omw: "55.6%", ogw: "57.1%" },
  { name: "María Fernández", pts: 7, omw: "61.1%", ogw: "52.4%" },
  { name: "Jorge Ramírez", pts: 6, omw: "50.0%", ogw: "54.2%" },
  { name: "Lucía Torres", pts: 6, omw: "44.4%", ogw: "52.8%" },
];

export const DemoStandings = () => {
  return (
    <Column
      fillWidth
      padding="20"
      radius="l"
      background="surface"
      border="neutral-alpha-medium"
      borderStyle="solid"
      borderWidth={1}
      gap="16"
    >
      {/* Header: live state + synthetic-data label */}
      <Row fillWidth horizontal="between" vertical="center" wrap gap="12">
        <Column gap="4">
          <Text variant="label-default-s" onBackground="neutral-weak">
            Posiciones · Ronda 3
          </Text>
          <Row gap="8" vertical="center">
            <Flex
              width="8"
              height="8"
              radius="full"
              solid="accent-strong"
              className="sf-pulse"
            />
            <Text variant="label-default-s" onBackground="accent-medium">
              En vivo
            </Text>
          </Row>
        </Column>
        <Text variant="label-default-xs" onBackground="neutral-weak">
          Datos de ejemplo
        </Text>
      </Row>

      <Table
        className="sf-demo-table"
        data={{
          headers: [
            { content: "#", key: "position" },
            { content: "Jugador", key: "player" },
            { content: "Pts", key: "points" },
            { content: "OMW%", key: "omw" },
            { content: "OGW%", key: "ogw" },
          ],
          rows: demoRows.map((row, index) => [
            <Text key="pos" variant="body-default-m">
              {index + 1}
            </Text>,
            <Column key="name" gap="2">
              <Text
                variant={index === 0 ? "body-strong-m" : "body-default-m"}
                onBackground={index === 0 ? "brand-medium" : undefined}
              >
                {row.name}
              </Text>
              <Text
                variant="label-default-xs"
                onBackground="neutral-weak"
                className="sf-demo-mobile-pct"
              >
                {row.omw} · {row.ogw}
              </Text>
            </Column>,
            <Text
              key="pts"
              variant="body-strong-m"
              onBackground="neutral-strong"
            >
              {row.pts}
            </Text>,
            <Text
              key="omw"
              variant="body-default-s"
              onBackground="neutral-weak"
            >
              {row.omw}
            </Text>,
            <Text
              key="ogw"
              variant="body-default-s"
              onBackground="neutral-weak"
            >
              {row.ogw}
            </Text>,
          ]),
        }}
      />

      {/* Footer: the public standings link, the product's share mechanism */}
      <Row
        gap="12"
        vertical="center"
        padding="12"
        radius="m"
        border="neutral-alpha-weak"
        borderStyle="solid"
        borderWidth={1}
      >
        <Flex
          horizontal="center"
          vertical="center"
          width="32"
          height="32"
          radius="m"
          background="brand-alpha-medium"
        >
          <Icon name="link" size="s" onBackground="brand-medium" />
        </Flex>
        <Column gap="2">
          <Text variant="body-strong-s">Enlace público de la tabla</Text>
          <Text variant="label-default-xs" onBackground="neutral-weak">
            seedforge.app/t/8f2ac4
          </Text>
        </Column>
      </Row>
    </Column>
  );
};
