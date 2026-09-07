import { Column, Row, Heading, Text } from "@once-ui-system/core";
import { Tournament } from "@/domain/entities/Tournament";
import { TopCutBracket } from "@/domain/entities/TopCutBracket";
import { BracketMatchCard, BracketPlayerSlot } from "./BracketMatchCard";
import { BracketCanvas } from "./BracketCanvas";
import { Connector, CONNECTOR_WIDTH, CONNECTOR_WIDTH_REM } from "./Connector";
import { ShareStandings } from "../standings/ShareStandings";

/**
 * Official Spanish names for each bracket round, indexed by bracket size.
 * A cut of 8 plays Cuartos → Semifinal → Final; 16 adds Octavos before the
 * quarters; 32 adds Dieciseisavos. Sizes are powers of two (2, 4, 8, 16, 32).
 */
const ROUND_LABELS: Record<number, readonly string[]> = {
  2: ["Final"],
  4: ["Semifinal", "Final"],
  8: ["Cuartos de final", "Semifinal", "Final"],
  16: ["Octavos de final", "Cuartos de final", "Semifinal", "Final"],
  32: [
    "Dieciseisavos de final",
    "Octavos de final",
    "Cuartos de final",
    "Semifinal",
    "Final",
  ],
};

const roundLabel = (size: number, roundIndex: number): string =>
  ROUND_LABELS[size]?.[roundIndex - 1] ?? `Ronda ${roundIndex}`;

/**
 * Fixed height of one bracket grid row. Each round-1 match spans two rows, so
 * a match card (two player cells + optional revert footer) fits comfortably
 * inside its span without overflowing into the next match.
 */
const GRID_ROW_HEIGHT = "4.75rem";

interface BracketConnector {
  key: string;
  column: number;
  row: string;
  /** Feeder pair index in the connector's round. */
  pair: number;
  /** Round the feeders belong to (1-based). */
  roundIndex: number;
}

/**
 * One connector per pair of feeder matches, between round r and r+1. In the
 * aligned grid a match in round r spans `2^r` rows, so the two feeders of the
 * next round's match k are matches 2k and 2k+1; their vertical centers sit at
 * `2k·2^r + 2^(r-1)` and `(2k+1)·2^r + 2^(r-1)` (row units). The connector
 * spans exactly between those two centers, so its top/bottom edges land on
 * the feeders' centers and its right edge (the vertical line) lands on the
 * receiving match's center.
 */
const buildConnectors = (
  size: number,
  totalRounds: number,
): BracketConnector[] => {
  const connectors: BracketConnector[] = [];
  for (let roundIndex = 1; roundIndex < totalRounds; roundIndex++) {
    const span = Math.pow(2, roundIndex); // rows spanned by one match in this round
    const pairs = size / Math.pow(2, roundIndex + 1); // matches in the next round
    for (let pair = 0; pair < pairs; pair++) {
      connectors.push({
        key: `connector-r${roundIndex}-p${pair}`,
        column: 2 * roundIndex,
        row: `${2 * pair * span + span / 2 + 1} / ${
          (2 * pair + 1) * span + span / 2 + 1
        }`,
        pair,
        roundIndex,
      });
    }
  }
  return connectors;
};

/**
 * Top Cut bracket view: the single-elimination bracket rendered as a CSS
 * grid — one column per round (left = first bracket round, right = the
 * final), with each match in round r spanning 2^(r-1) grid rows and centered
 * vertically, so every match sits exactly between the two matches that feed
 * it. A 2.5rem connector column between rounds carries the classic bracket
 * "bones" (HTML borders with rounded elbows) joining each pair of feeders
 * into the next match, with a short stub pointing into the receiving match;
 * connectors on the path of a reported winner are drawn in the brand color,
 * so results visibly flow toward the final. The whole bracket sits inside a
 * lightweight pan/zoom canvas (BracketCanvas) that fits it to the viewport on
 * any screen. Each match is a BracketMatchCard where the organizer reports
 * the winner; the domain advances the winner into the next round
 * automatically. Once the final is decided the tournament is marked
 * completed.
 */
export const TopCutView = ({
  tournament,
  bracket,
  readOnly = false,
}: {
  tournament: Tournament;
  bracket: TopCutBracket | null;
  /** Read-only rendering (public view): no report/revert controls. */
  readOnly?: boolean;
}) => {
  const topCutSize = tournament.getTopCutSize();

  if (!bracket) {
    return (
      <Column fillWidth gap="24">
        <TopCutHeader topCutSize={topCutSize}>
          <ShareStandings
            tournamentId={tournament.getId()}
            existingToken={tournament.getShareToken()}
            tab="bracket"
          />
        </TopCutHeader>
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
            Todavía no hay un bracket generado para este torneo.
          </Text>
        </Column>
      </Column>
    );
  }

  const playerById = new Map(
    tournament.getPlayers().map((player) => [player.getId(), player]),
  );
  const slot = (playerId: string | null): BracketPlayerSlot | null => {
    if (playerId === null) return null;
    const player = playerById.get(playerId);
    return {
      id: playerId,
      name: player?.getName() ?? playerId,
      seed: player?.getTopCutSeed() ?? null,
    };
  };

  const totalRounds = bracket.getTotalRounds();
  const size = bracket.getSize();

  // Winner lookup for the per-half connector highlight: the top half (feeder
  // position 2p) and bottom half (feeder position 2p+1) are highlighted
  // independently; the connector lights brand only when both have winners,
  // and the stub at the middle only lights when both halves are lit.
  const winnerById = new Map<string, string | null>();
  for (let roundIndex = 1; roundIndex <= totalRounds; roundIndex++) {
    for (const match of bracket.getRound(roundIndex)) {
      winnerById.set(
        `${roundIndex}:${match.getPosition()}`,
        match.getWinnerId(),
      );
    }
  }
  const hasTopWinner = (roundIndex: number, pair: number): boolean =>
    winnerById.get(`${roundIndex}:${2 * pair}`) !== null;
  const hasBottomWinner = (roundIndex: number, pair: number): boolean =>
    winnerById.get(`${roundIndex}:${2 * pair + 1}`) !== null;

  // Interleaved columns: round column, connector column, round column, ...
  // Round columns never shrink below 15rem so the bracket keeps its shape;
  // the BracketCanvas fits and pans/zooms the whole grid on any screen.
  const gridColumns = Array.from({ length: totalRounds }, (_, i) =>
    i === 0 ? "minmax(15rem, 1fr)" : `${CONNECTOR_WIDTH} minmax(15rem, 1fr)`,
  ).join(" ");
  const gridRows = `repeat(${size}, ${GRID_ROW_HEIGHT})`;
  const gridMinWidth = `${
    totalRounds * 15 + (totalRounds - 1) * CONNECTOR_WIDTH_REM
  }rem`;
  const connectors = buildConnectors(size, totalRounds);

  return (
    <Column fillWidth gap="24">
      <TopCutHeader topCutSize={topCutSize}>
        <ShareStandings
          tournamentId={tournament.getId()}
          existingToken={tournament.getShareToken()}
          tab="bracket"
        />
      </TopCutHeader>

      <BracketCanvas>
        {/* The bracket: match in round r spans 2^(r-1) rows, centered, with
            connector "bones" joining each pair of feeders into the next
            round's match. */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: gridColumns,
            gridTemplateRows: gridRows,
            minWidth: gridMinWidth,
          }}
        >
          {Array.from({ length: totalRounds }, (_, i) => {
            const roundIndex = i + 1;
            const round = bracket.getRound(roundIndex);
            const span = Math.pow(2, roundIndex);
            const roundName = roundLabel(size, roundIndex);
            return round.map((match) => (
              <div
                key={match.getId()}
                style={{
                  gridColumn: 2 * roundIndex - 1,
                  gridRow: `${match.getPosition() * span + 1} / ${
                    (match.getPosition() + 1) * span + 1
                  }`,
                  alignSelf: "center",
                  width: "100%",
                }}
              >
                <BracketMatchCard
                  tournamentId={tournament.getId()}
                  roundIndex={match.getRoundIndex()}
                  position={match.getPosition()}
                  matchLabel={
                    round.length === 1
                      ? roundName
                      : `${roundName} ${match.getPosition() + 1}`
                  }
                  player1={slot(match.getPlayer1Id())}
                  player2={slot(match.getPlayer2Id())}
                  winnerId={match.getWinnerId()}
                  readOnly={readOnly}
                />
              </div>
            ));
          })}

          {connectors.map((connector) => (
            <div
              key={connector.key}
              style={{
                gridColumn: connector.column,
                gridRow: connector.row,
                position: "relative",
              }}
            >
              <Connector
                highlightedTop={hasTopWinner(
                  connector.roundIndex,
                  connector.pair,
                )}
                highlightedBottom={hasBottomWinner(
                  connector.roundIndex,
                  connector.pair,
                )}
              />
            </div>
          ))}
        </div>
      </BracketCanvas>
    </Column>
  );
};

const TopCutHeader = ({
  topCutSize,
  children,
}: {
  topCutSize: number | null;
  children?: React.ReactNode;
}) => (
  <Row fillWidth horizontal="between" vertical="center" wrap gap="16">
    <Column gap="4">
      <Heading as="h2" variant="heading-strong-m">
        Top Cut
      </Heading>
      <Text onBackground="neutral-weak">
        Eliminación simple{topCutSize ? ` · Top ${topCutSize}` : ""}
      </Text>
    </Column>
    {children}
  </Row>
);
