import { notFound } from "next/navigation";
import { Column, Row, Heading, Text, Badge, Tag } from "@once-ui-system/core";
import type { Colors } from "@once-ui-system/core";
import { getSessionUserId } from "@/infrastructure/auth/getSessionUserId";
import { useCases } from "@/infrastructure/composition-root";
import { Tournament, TournamentPhase } from "@/domain/entities/Tournament";
import { TournamentTabs, TournamentTabOption } from "./TournamentTabs";
import { OverviewView } from "./overview/OverviewView";
import { PlayersView } from "./jugadores/PlayersView";
import { StandingsView } from "./standings/StandingsView";
import { HistoryView } from "./history/HistoryView";
import { TopCutView } from "./topcut/TopCutView";

const phaseBadge: Record<
  TournamentPhase,
  { label: string; background: Colors; onBackground: Colors }
> = {
  registration: {
    label: "Inscripción",
    background: "info-weak",
    onBackground: "info-strong",
  },
  swiss: {
    label: "Fase suiza",
    background: "brand-weak",
    onBackground: "brand-strong",
  },
  top_cut: {
    label: "Top Cut",
    background: "accent-weak",
    onBackground: "accent-strong",
  },
  completed: {
    label: "Finalizado",
    background: "success-weak",
    onBackground: "success-strong",
  },
};

const TAB_VALUES = [
  "tournament",
  "players",
  "standings",
  "history",
  "topcut",
] as const;
type TabValue = (typeof TAB_VALUES)[number];

const isTabValue = (value: string | undefined): value is TabValue =>
  value !== undefined && (TAB_VALUES as readonly string[]).includes(value);

const buildTabs = (tournament: Tournament): TournamentTabOption[] => {
  const tabs: TournamentTabOption[] = [
    { value: "tournament", label: "Torneo" },
    { value: "players", label: "Jugadores" },
    { value: "standings", label: "Clasificación" },
    { value: "history", label: "Historial" },
  ];
  // The bracket exists from the moment the tournament advances to top cut and
  // stays viewable after the champion is decided (completed phase).
  if (
    tournament.getTopCutSize() !== null &&
    (tournament.getPhase() === "top_cut" ||
      tournament.getPhase() === "completed")
  ) {
    tabs.push({ value: "topcut", label: "Top Cut" });
  }
  return tabs;
};

const TournamentPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; ronda?: string; emparejar?: string }>;
}) => {
  const { id } = await params;
  const { tab, ronda, emparejar } = await searchParams;
  const userId = (await getSessionUserId())!; // (app)/layout.tsx already guarantees this

  const tournament = await useCases.getTournament
    .execute({ tournamentId: id, requestingUserId: userId })
    .catch(() => null);

  if (!tournament) {
    notFound();
  }

  // The bracket is a separate aggregate persisted by its own repository, so
  // it needs its own read. Only loaded once a top cut can exist (top_cut or
  // completed phase); a missing bracket is handled by the view.
  const hasTopCut =
    tournament.getTopCutSize() !== null &&
    (tournament.getPhase() === "top_cut" ||
      tournament.getPhase() === "completed");
  const bracket = hasTopCut
    ? await useCases.getTopCutBracket
        .execute({ tournamentId: id, requestingUserId: userId })
        .catch(() => null)
    : null;

  const activeTab = isTabValue(tab) ? tab : "tournament";
  const parsedRound = Number(ronda);
  const roundNumber =
    ronda !== undefined && Number.isInteger(parsedRound) && parsedRound > 0
      ? parsedRound
      : undefined;
  const tabs = buildTabs(tournament);
  const phase = phaseBadge[tournament.getPhase()];
  const playerCount = tournament.getPlayers().length;
  const totalSwissRounds = tournament.getTotalSwissRounds();
  const topCutSize = tournament.getTopCutSize();
  const currentRound = tournament.getRounds().length;
  const isSwiss = tournament.getPhase() === "swiss";

  return (
    <Column fillWidth maxWidth={48} horizontal="center" paddingY="40" gap="32">
      {/* ── Header ── */}
      <Row fillWidth horizontal="between" vertical="center" wrap gap="16">
        <Column gap="8">
          <Row gap="12" vertical="center" wrap>
            <Heading as="h1" variant="heading-strong-xl">
              {tournament.getName()}
            </Heading>
            <Badge
              background={phase.background}
              onBackground={phase.onBackground}
            >
              {phase.label}
            </Badge>
            {tournament.getPairingMode() === "manual" && (
              <Tag variant="neutral" size="s" label="Auditoría" />
            )}
          </Row>

          <Row gap="12" vertical="center" wrap>
            <Row gap="4" vertical="center">
              <Text variant="body-strong-m">{playerCount}</Text>
              <Text variant="body-default-s" onBackground="neutral-weak">
                {playerCount === 1 ? "jugador" : "jugadores"}
              </Text>
            </Row>

            <Text variant="body-default-s" onBackground="neutral-medium">
              ·
            </Text>

            <Row gap="4" vertical="center">
              <Text variant="body-strong-m">{totalSwissRounds}</Text>
              <Text variant="body-default-s" onBackground="neutral-weak">
                rondas suizas
              </Text>
            </Row>

            {topCutSize ? (
              <>
                <Text variant="body-default-s" onBackground="neutral-medium">
                  ·
                </Text>
                <Text variant="body-strong-m">Top {topCutSize}</Text>
              </>
            ) : null}

            {isSwiss && currentRound > 0 ? (
              <>
                <Text variant="body-default-s" onBackground="neutral-medium">
                  ·
                </Text>
                <Text variant="body-strong-m">
                  Ronda {currentRound}/{totalSwissRounds}
                </Text>
              </>
            ) : null}
          </Row>
        </Column>
      </Row>

      {/* ── Segmented control ── */}
      <TournamentTabs
        tournamentId={tournament.getId()}
        current={activeTab}
        tabs={tabs}
      />

      {/* ── Active view ── */}
      {activeTab === "players" && <PlayersView tournament={tournament} />}
      {activeTab === "standings" && <StandingsView tournament={tournament} />}
      {activeTab === "history" && <HistoryView tournament={tournament} />}
      {activeTab === "topcut" && (
        <TopCutView tournament={tournament} bracket={bracket} />
      )}
      {activeTab === "tournament" && (
        <OverviewView
          tournament={tournament}
          roundNumber={roundNumber}
          emparejar={emparejar === "1"}
        />
      )}
    </Column>
  );
};

export default TournamentPage;
