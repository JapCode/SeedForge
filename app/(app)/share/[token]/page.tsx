import { notFound } from "next/navigation";
import { Column, Heading, Text } from "@once-ui-system/core";
import { useCases } from "@/infrastructure/composition-root";
import { StandingsTable } from "@/components/tournament/StandingsTable";

const SharedTournamentPage = async ({
  params,
}: {
  params: Promise<{ token: string }>;
}) => {
  const { token } = await params;

  const tournament = await useCases.getTournamentByShareToken
    .execute({ token })
    .catch(() => null);

  if (!tournament) {
    notFound();
  }

  return (
    <Column fillWidth maxWidth={48} horizontal="center" paddingY="40" gap="24">
      <Column gap="4">
        <Heading as="h1" variant="heading-strong-xl">
          {tournament.getName()}
        </Heading>
        <Text onBackground="neutral-weak">
          Ronda {tournament.getRounds().length} de{" "}
          {tournament.getTotalSwissRounds()} · Vista pública
        </Text>
      </Column>

      <StandingsTable tournament={tournament} />
    </Column>
  );
};

export default SharedTournamentPage;
