import { notFound } from "next/navigation";
import { Column, Row, Heading, Text } from "@once-ui-system/core";
import { getSessionUserId } from "@/infrastructure/auth/getSessionUserId";
import { useCases } from "@/infrastructure/composition-root";
import { StandingsTable } from "@/components/tournament/StandingsTable";
import { ShareButton } from "./ShareButton";

const StandingsPage = async ({
  params,
}: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  const userId = (await getSessionUserId())!;

  const tournament = await useCases.getTournament
    .execute({ tournamentId: id, requestingUserId: userId })
    .catch(() => null);

  if (!tournament) {
    notFound();
  }

  return (
    <Column fillWidth maxWidth={48} horizontal="center" paddingY="40" gap="24">
      <Row fillWidth horizontal="between" vertical="center" wrap>
        <Column gap="4">
          <Heading as="h1" variant="heading-strong-xl">
            Standings — {tournament.getName()}
          </Heading>
          <Text onBackground="neutral-weak">
            Ronda {tournament.getRounds().length} de{" "}
            {tournament.getTotalSwissRounds()}
          </Text>
        </Column>
        <ShareButton
          tournamentId={tournament.getId()}
          existingToken={tournament.getShareToken()}
        />
      </Row>

      <StandingsTable tournament={tournament} />
    </Column>
  );
};

export default StandingsPage;
