import {
  Column,
  Flex,
  Row,
  Heading,
  Text,
  Button,
  Card,
  Badge,
  Icon,
} from "@once-ui-system/core";

const Home = () => {
  return (
    <Column fillWidth padding="160" horizontal="center" gap="80">
      {/* ── Hero section ── */}
      <Column
        as="section"
        fillWidth
        maxWidth={640}
        horizontal="center"
        gap="24"
        center
      >
        <Badge icon="sparkle" arrow href="#">
          New release v1.7
        </Badge>

        <Heading
          as="h1"
          variant="display-strong-l"
          align="center"
          wrap="balance"
        >
          Build faster with Once UI
        </Heading>

        <Text
          as="p"
          variant="body-default-l"
          onBackground="neutral-medium"
          align="center"
          wrap="balance"
        >
          An open-source design system for the AI-native era. Deploy fully
          functional apps in minutes or build custom solutions with less code.
        </Text>

        <Row gap="16" horizontal="center" wrap>
          <Button variant="primary" size="l" label="Get started" arrowIcon />
          <Button
            variant="secondary"
            size="l"
            label="View on GitHub"
            href="#"
          />
        </Row>
      </Column>

      {/* ── Features section ── */}
      <Flex
        as="section"
        fillWidth
        direction="row"
        wrap
        horizontal="center"
        gap="24"
        maxWidth={960}
      >
        {features.map((feature) => (
          <Card
            key={feature.title}
            fillWidth
            padding="24"
            radius="l"
            border="neutral-alpha-medium"
            borderStyle="solid"
            borderWidth={1}
            style={{ flex: "1 1 280px" }}
          >
            <Column gap="12">
              <Flex
                horizontal="center"
                vertical="center"
                width={40}
                height={40}
                radius="m"
                background="brand-alpha-medium"
              >
                <Icon
                  name={feature.icon}
                  size="s"
                  onBackground="brand-medium"
                />
              </Flex>
              <Heading as="h3" variant="heading-strong-m">
                {feature.title}
              </Heading>
              <Text variant="body-default-s" onBackground="neutral-medium">
                {feature.description}
              </Text>
            </Column>
          </Card>
        ))}
      </Flex>

      {/* ── CTA section ── */}
      <Column
        as="section"
        fillWidth
        maxWidth={640}
        horizontal="center"
        gap="16"
        center
        padding="48"
        radius="l"
        background="brand-alpha-weak"
        border="brand-alpha-medium"
        borderStyle="solid"
        borderWidth={1}
      >
        <Heading as="h2" variant="heading-strong-l" align="center">
          Ready to get started?
        </Heading>
        <Text
          variant="body-default-m"
          onBackground="neutral-medium"
          align="center"
        >
          Install Once UI in your project and start building.
        </Text>
        <Button
          variant="primary"
          size="l"
          label="Install Now"
          arrowIcon
          href="#"
        />
      </Column>
    </Column>
  );
};

const features = [
  {
    icon: "sparkle" as const,
    title: "100+ Components",
    description:
      "A comprehensive library of accessible, customizable components built for modern React and Next.js applications.",
  },
  {
    icon: "eyeDropper" as const,
    title: "Semantic Tokens",
    description:
      "Design tokens for colors, spacing, typography, and more. Consistent theming across your entire application.",
  },
  {
    icon: "computer" as const,
    title: "Responsive by Default",
    description:
      "Every component is responsive out of the box. Breakpoint props for fine-tuning layouts at any screen size.",
  },
  {
    icon: "light" as const,
    title: "Light & Dark Mode",
    description:
      "Built-in dark mode support with system preference detection. Seamless transitions between themes.",
  },
  {
    icon: "world" as const,
    title: "Open Source",
    description:
      "MIT-licensed core components. Free to use in personal and commercial projects alike.",
  },
  {
    icon: "gift" as const,
    title: "Pro Templates",
    description:
      "Pre-built deployment-ready templates and copy-paste blocks for rapid application development.",
  },
];

export default Home;
