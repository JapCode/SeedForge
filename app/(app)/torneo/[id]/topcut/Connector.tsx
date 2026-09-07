/**
 * One bracket connector "bone": joins a pair of feeder matches into the next
 * round's match. It fills the connector column cell of the aligned bracket
 * grid (the cell spans the rows between the two feeders' vertical centers).
 * Drawn with HTML borders: a horizontal line from each feeder's right edge,
 * two rounded 90° elbows, a vertical line split into top/bottom halves
 * between the feeders, and a short horizontal stub at the cell's vertical
 * middle pointing into the receiving match (which is centered between the
 * two feeders). The connector is inset from the cards by a uniform gap so it
 * reads as a separate element instead of lines glued to the card borders;
 * the stub bridges the gap on the receiving side and marks the connection.
 *
 * HTML borders (not SVG) on purpose: the bracket canvas scales the world
 * with the CSS `zoom` property, which re-renders text and HTML crisply at
 * any zoom level but does not reliably scale inline SVG contents (the box
 * zooms while the paths stay at their natural size, hiding thin strokes like
 * the vertical line).
 *
 * Highlighting: the connector can be highlighted per half — the top half
 * reflects the result of the upper feeder, the bottom half reflects the
 * result of the lower feeder. The whole connector lights brand only when
 * both feeders have winners; the stub at the middle only lights when both
 * halves are lit.
 */

/** Width of the connector column between two rounds (shared with TopCutView's grid). */
export const CONNECTOR_WIDTH_REM = 2.5;
export const CONNECTOR_WIDTH = `${CONNECTOR_WIDTH_REM}rem`;

/** Corner radius of the elbows where each horizontal line meets the vertical line. */
const ELBOW_RADIUS = "0.375rem";

const LINE = "var(--neutral-alpha-medium)";
const LINE_HIGHLIGHTED = "var(--brand-border-medium)";

/** Color of the vertical-line stub pointing into the receiving match. */
const STUB_COLOR = (highlightedTop: boolean, highlightedBottom: boolean) =>
  highlightedTop && highlightedBottom ? LINE_HIGHLIGHTED : LINE;

/** Connector half-colors given the two feeder results. */
export const Connector = ({
  highlightedTop,
  highlightedBottom,
}: {
  highlightedTop: boolean;
  highlightedBottom: boolean;
}) => {
  const topColor = highlightedTop ? LINE_HIGHLIGHTED : LINE;
  const bottomColor = highlightedBottom ? LINE_HIGHLIGHTED : LINE;
  return (
    <>
      {/* Mitad superior: línea horizontal superior + mitad de la línea vertical + codo superior */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: "calc(50%)",
          width: `calc(100% - 1rem)`,
          borderTop: `2px solid ${topColor}`,
          borderRight: `2px solid ${topColor}`,
          borderTopRightRadius: ELBOW_RADIUS,
        }}
      />
      {/* Mitad inferior: línea horizontal inferior + mitad de la línea vertical + codo inferior */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: "calc(50%)",
          bottom: 0,
          width: `calc(100% - 1rem)`,
          borderBottom: `2px solid ${bottomColor}`,
          borderRight: `2px solid ${bottomColor}`,
          borderBottomRightRadius: ELBOW_RADIUS,
        }}
      />
      {/* Stub apuntando al partido receptor, en el punto medio vertical */}
      <div
        style={{
          position: "absolute",
          top: "calc(50% - 1px)",
          left: `calc(100% - 1rem)`,
          width: "1rem",
          height: "2px",
          background: STUB_COLOR(highlightedTop, highlightedBottom),
          borderRadius: "1px",
        }}
      />
    </>
  );
};
