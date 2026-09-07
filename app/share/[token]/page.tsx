import { notFound } from "next/navigation";
import {
  Column,
  Row,
  Heading,
  Text,
  Flex,
  Icon,
  Badge,
  Background,
  SmartLink,
} from "@once-ui-system/core";
import { useCases } from "@/infrastructure/composition-root";
import { StandingsTable } from "@/components/tournament/StandingsTable";
import { TopCutView } from "@/app/(app)/torneo/[id]/topcut/TopCutView";
import { PublicTabs } from "./PublicTabs";
import { TournamentPhase } from "@/domain/entities/Tournament";

const phaseLabel: Record<TournamentPhase, string> = {
  registration: "Inscripción",
  swiss: "Fase suiza",
  top_cut: "Top Cut",
  completed: "Finalizado",
};

const SharedTournamentPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ tab?: string }>;
}) => {
  const { token } = await params;
  const { tab } = await searchParams;

  const tournament = await useCases.getTournamentByShareToken
    .execute({ token })
    .catch(() => null);

  if (!tournament) {
    notFound();
  }

  const roundCount = tournament.getRounds().length;
  const phase = tournament.getPhase();
  const subtitle =
    phase === "registration"
      ? "Inscripción en curso"
      : `Ronda ${roundCount} de ${tournament.getTotalSwissRounds()} · ${phaseLabel[phase]}`;

  // The bracket exists from the moment the tournament advances to top cut and
  // stays viewable after the champion is decided (completed phase). It is a
  // separate aggregate persisted by its own repository, so it needs its own
  // read; a missing bracket is handled by skipping the section.
  const hasTopCut =
    tournament.getTopCutSize() !== null &&
    (phase === "top_cut" || phase === "completed");
  const bracket = hasTopCut
    ? await useCases.getTopCutBracketByShareToken
        .execute({ token })
        .catch(() => null)
    : null;

  // Tab state: the bracket is the default view when a top cut exists; the
  // standings are the only view otherwise. An explicit ?tab=standings wins
  // over the default.
  const showBracket = hasTopCut && bracket !== null;
  const activeTab = !showBracket
    ? "standings"
    : tab === "standings"
      ? "standings"
      : "bracket";

  return (
    <Column fillWidth horizontal="center" position="relative">
      {/* Decorative forge background (same as the auth pages): gradient +
          lines + dots. Anchored to the page (not the viewport) so it scrolls
          together with the standings card — a fixed background behind the
          card's backdrop-filter re-samples every frame while scrolling and
          shimmers; moving together keeps the backdrop constant. */}
      <Background
        position="absolute"
        top={0}
        left={0}
        fill
        style={{ minHeight: "100vh" }}
        gradient={{
          display: true,
          opacity: 100,
          x: 50,
          y: 0,
          colorStart: "brand-background-strong",
          colorEnd: "static-transparent",
        }}
        lines={{
          display: true,
          opacity: 60,
          size: "16",
          thickness: 1,
          angle: 90,
          color: "brand-background-weak",
        }}
        dots={{
          display: true,
          opacity: 60,
          size: "4",
          color: "page-background",
        }}
      />

      {/* Floating brand pill — the SiteNav is hidden on /share, so this
          header is the page's only chrome. Sticky so the brand and the
          "Vista pública" badge stay visible while scrolling standings. */}
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
          maxWidth={48}
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
          <SmartLink href="/" unstyled>
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
              <Heading as="p" variant="heading-strong-m">
                Seed Forge
              </Heading>
            </Row>
          </SmartLink>
          <Badge background="brand-weak" onBackground="brand-strong">
            Vista pública
          </Badge>
        </Flex>
      </Flex>

      <Column
        fillWidth
        maxWidth={48}
        horizontal="center"
        paddingY="40"
        gap="24"
        position="relative"
        zIndex="1"
      >
        <Column gap="4" horizontal="center">
          <Heading as="h1" variant="heading-strong-xl" align="center">
            {tournament.getName()}
          </Heading>
          <Text onBackground="neutral-weak" align="center">
            {subtitle}
          </Text>
        </Column>

        {showBracket && (
          <PublicTabs
            token={token}
            current={activeTab}
            tabs={[
              { value: "bracket", label: "Bracket" },
              { value: "standings", label: "Clasificación" },
            ]}
          />
        )}

        {activeTab === "bracket" && showBracket && (
          <TopCutView tournament={tournament} bracket={bracket} readOnly />
        )}

        {activeTab === "standings" && (
          <StandingsTable tournament={tournament} />
        )}

        <Text
          variant="body-default-s"
          onBackground="neutral-weak"
          align="center"
        >
          Creado con Seed Forge
        </Text>
      </Column>
    </Column>
  );
};

export default SharedTournamentPage;
