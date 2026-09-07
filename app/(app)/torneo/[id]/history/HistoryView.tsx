import {
  Column,
  Row,
  Heading,
  Text,
  Badge,
  SmartLink,
} from "@once-ui-system/core";
import type { Colors } from "@once-ui-system/core";
import { Tournament } from "@/domain/entities/Tournament";
import { Match } from "@/domain/entities/Match";
import { TiebreakerCalculator } from "@/domain/services/TiebreakerCalculator";
import { StandingsBeforeRoundService } from "@/domain/services/StandingsBeforeRoundService";
import {
  RoundStandingsDialog,
  RoundStandingsRow,
} from "./RoundStandingsDialog";

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

const roundStatusBadge: {
  [key: string]: { label: string; background: Colors; onBackground: Colors };
} = {
  inProgress: {
    label: "En curso",
    background: "brand-weak",
    onBackground: "brand-strong",
  },
  completed: {
    label: "Completada",
    background: "success-weak",
    onBackground: "success-strong",
  },
};

/**
 * Read-only history of every Swiss round and its match results, ordered
 * chronologically. Mirrors the result wording used on the round page.
 */
export const HistoryView = ({ tournament }: { tournament: Tournament }) => {
  const rounds = [...tournament.getRounds()].sort(
    (a, b) => a.getRoundNumber() - b.getRoundNumber(),
  );

  const playerName = (playerId: string) =>
    tournament.getPlayer(playerId).getName();

  /**
   * Standings snapshot at the start of `roundNumber` — the exact view the
   * pairing algorithm used to generate that round's matches.
   */
  const standingsRows = (roundNumber: number): RoundStandingsRow[] => {
    const players = StandingsBeforeRoundService.snapshot(
      tournament,
      roundNumber,
    );
    const tiebreakersById = TiebreakerCalculator.calculateForAll(players);
    return players.map((player, index) => {
      const tiebreakers = tiebreakersById.get(player.getId())!;
      return {
        position: index + 1,
        name: player.getName(),
        points: player.getPoints(),
        omw: formatPercent(tiebreakers.opponentsMatchWinPercentage),
        ogw: formatPercent(tiebreakers.opponentsOpponentsMatchWinPercentage),
        ddd: tiebreakers.sumOfSquaresOfLosses,
        dropped: player.isDropped(),
      };
    });
  };

  const resultSummary = (match: Match): string => {
    const result = match.getResult();
    if (result.type === "win") {
      const winnerName =
        result.winnerId === match.getPlayer1Id()
          ? playerName(match.getPlayer1Id())
          : playerName(match.getPlayer2Id()!);
      return `${winnerName} ganó ${result.winnerGames}-${result.loserGames}`;
    }
    if (result.type === "draw") {
      return `Empate ${result.player1Games}-${result.player2Games}`;
    }
    if (result.type === "double_loss") {
      return `Doble derrota (${result.player1Games}-${result.player2Games})`;
    }
    return "Pendiente";
  };

  return (
    <Column fillWidth gap="24">
      <Column gap="4">
        <Heading as="h2" variant="heading-strong-m">
          Historial
        </Heading>
        <Text onBackground="neutral-weak">
          {rounds.length} de {tournament.getTotalSwissRounds()} rondas jugadas
        </Text>
      </Column>

      {rounds.length === 0 && (
        <Column
          fillWidth
          padding="32"
          radius="l"
          border
          background="surface"
          horizontal="center"
          gap="8"
        >
          <Text onBackground="neutral-weak">
            Todavía no hay rondas generadas.
          </Text>
        </Column>
      )}

      <Column fillWidth gap="16">
        {rounds.map((round) => {
          const badge =
            roundStatusBadge[round.isCompleted() ? "completed" : "inProgress"];
          return (
            <Column
              key={round.getRoundNumber()}
              fillWidth
              padding="20"
              radius="l"
              border
              background="surface"
              gap="12"
            >
              <Row
                fillWidth
                horizontal="between"
                vertical="center"
                wrap
                gap="12"
              >
                <Row gap="12" vertical="center">
                  <Heading as="h3" variant="heading-strong-m">
                    Ronda {round.getRoundNumber()}
                  </Heading>
                  <Badge
                    background={badge.background}
                    onBackground={badge.onBackground}
                  >
                    {badge.label}
                  </Badge>
                </Row>
                <Row gap="12" vertical="center" wrap>
                  <RoundStandingsDialog
                    roundNumber={round.getRoundNumber()}
                    rows={standingsRows(round.getRoundNumber())}
                  />
                  <SmartLink
                    href={`/torneo/${tournament.getId()}/ronda/${round.getRoundNumber()}`}
                    unstyled
                  >
                    <Text variant="label-default-s" onBackground="brand-strong">
                      Ver ronda →
                    </Text>
                  </SmartLink>
                </Row>
              </Row>

              <Column fillWidth gap="8">
                {round.getMatches().map((match) => {
                  const p1 = playerName(match.getPlayer1Id());
                  const p2 = match.getPlayer2Id()
                    ? playerName(match.getPlayer2Id()!)
                    : null;
                  return (
                    <Row
                      key={match.getId()}
                      fillWidth
                      horizontal="between"
                      vertical="center"
                      padding="12"
                      radius="m"
                      border
                      gap="12"
                    >
                      <Row gap="12" vertical="center">
                        <Text
                          variant="label-default-s"
                          onBackground="neutral-weak"
                        >
                          Mesa {match.getTableNumber()}
                        </Text>
                        {match.isBye() ? (
                          <Text variant="body-default-m">{p1}</Text>
                        ) : (
                          <Text variant="body-default-m">
                            {p1} vs {p2}
                          </Text>
                        )}
                      </Row>
                      {match.isBye() ? (
                        <Badge
                          background="brand-weak"
                          onBackground="brand-strong"
                        >
                          BYE
                        </Badge>
                      ) : (
                        <Text
                          variant="body-default-s"
                          onBackground={
                            match.isPending()
                              ? "neutral-weak"
                              : "neutral-strong"
                          }
                        >
                          {resultSummary(match)}
                        </Text>
                      )}
                    </Row>
                  );
                })}
              </Column>
            </Column>
          );
        })}
      </Column>
    </Column>
  );
};
