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
import type { Colors } from "@once-ui-system/core";
import { getSessionUserId } from "@/infrastructure/auth/getSessionUserId";
import { useCases } from "@/infrastructure/composition-root";
import { TournamentPhase } from "@/domain/entities/Tournament";

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

const PAGE_SIZE = 10;

const MyTournamentsPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) => {
  const userId = (await getSessionUserId())!; // (app)/layout.tsx already guarantees this
  const { page: pageParam } = await searchParams;
  const parsedPage = Number(pageParam);
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const {
    tournaments,
    total,
    page: currentPage,
    totalPages,
  } = await useCases.listTournaments.execute({
    requestingUserId: userId,
    page,
    pageSize: PAGE_SIZE,
  });

  return (
    <Column fillWidth maxWidth={48} horizontal="center" paddingY="40" gap="32">
      <Row fillWidth horizontal="between" vertical="center" wrap gap="16">
        <Column gap="4">
          <Heading as="h1" variant="heading-strong-xl">
            Mis torneos
          </Heading>
          <Text onBackground="neutral-weak">
            {total === 0
              ? "Todavía no creaste ningún torneo."
              : `${total} ${total === 1 ? "torneo" : "torneos"}`}
          </Text>
        </Column>
        <Button href="/crear" prefixIcon="plus">
          Crear torneo
        </Button>
      </Row>

      {total === 0 ? (
        <Column
          fillWidth
          padding="40"
          radius="l"
          border
          background="surface"
          horizontal="center"
          gap="16"
        >
          <Flex
            horizontal="center"
            vertical="center"
            width="48"
            height="48"
            radius="l"
            background="brand-alpha-medium"
          >
            <Icon name="sparkle" size="m" onBackground="brand-medium" />
          </Flex>
          <Column horizontal="center" gap="8">
            <Heading as="h3" variant="heading-strong-m">
              Empieza tu primer torneo
            </Heading>
            <Text onBackground="neutral-weak" align="center">
              Crea un torneo, registra jugadores y genera la primera ronda suiza
              en minutos.
            </Text>
          </Column>
          <Button href="/crear" variant="primary">
            Crear el primero
          </Button>
        </Column>
      ) : (
        <>
          <Column fillWidth gap="12">
            {tournaments.map((tournament) => {
              const phase = phaseBadge[tournament.getPhase()];
              const completedRounds = tournament
                .getRounds()
                .filter((r) => r.isCompleted()).length;
              return (
                <Card
                  key={tournament.getId()}
                  href={`/torneo/${tournament.getId()}`}
                  fillWidth
                  padding="20"
                  radius="l"
                  border
                >
                  <Row
                    fillWidth
                    horizontal="between"
                    vertical="center"
                    wrap
                    gap="16"
                  >
                    <Column gap="4">
                      <Text variant="body-strong-l">
                        {tournament.getName()}
                      </Text>
                      <Text
                        onBackground="neutral-weak"
                        variant="body-default-s"
                      >
                        {tournament.getPlayers().length} jugadores ·{" "}
                        {tournament.getTotalSwissRounds()} rondas suizas
                        {tournament.getTopCutSize()
                          ? ` · Top ${tournament.getTopCutSize()}`
                          : ""}
                      </Text>
                    </Column>
                    <Row gap="12" vertical="center">
                      {tournament.getPhase() === "swiss" && (
                        <Text
                          variant="label-default-s"
                          onBackground="neutral-weak"
                        >
                          Ronda {completedRounds}/
                          {tournament.getTotalSwissRounds()}
                        </Text>
                      )}
                      <Badge
                        background={phase.background}
                        onBackground={phase.onBackground}
                      >
                        {phase.label}
                      </Badge>
                    </Row>
                  </Row>
                </Card>
              );
            })}
          </Column>

          {totalPages > 1 && (
            <Row fillWidth horizontal="center" vertical="center" wrap gap="16">
              <Button
                variant="secondary"
                prefixIcon="chevronLeft"
                href={
                  currentPage > 1
                    ? `/dashboard?page=${currentPage - 1}`
                    : undefined
                }
                disabled={currentPage <= 1}
              >
                Anterior
              </Button>
              <Text variant="body-default-s" onBackground="neutral-weak">
                Página {currentPage} de {totalPages}
              </Text>
              <Button
                variant="secondary"
                suffixIcon="chevronRight"
                href={
                  currentPage < totalPages
                    ? `/dashboard?page=${currentPage + 1}`
                    : undefined
                }
                disabled={currentPage >= totalPages}
              >
                Siguiente
              </Button>
            </Row>
          )}
        </>
      )}
    </Column>
  );
};

export default MyTournamentsPage;
