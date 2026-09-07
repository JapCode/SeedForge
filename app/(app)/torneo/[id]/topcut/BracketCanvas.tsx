"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { Button, Text } from "@once-ui-system/core";

const MIN_SCALE = 0.2;
const MAX_SCALE = 2;
const ZOOM_STEP = 1.2;
/** Wheel zoom sensitivity: the factor per wheel event is exp(-deltaY * SENSITIVITY). */
const WHEEL_ZOOM_SENSITIVITY = 0.002;
/** Movement (px) before a drag becomes a pan; below it the gesture stays a click. */
const PAN_THRESHOLD = 4;
/** Max time (ms) between two taps to count as a double-tap. */
const DOUBLE_TAP_MS = 300;
/** Max distance (px) between two taps to count as a double-tap. */
const DOUBLE_TAP_DISTANCE = 30;
/** Viewport height: tall enough to browse comfortably, capped for small screens. */
const CANVAS_HEIGHT = "min(38rem, 65vh)";

interface View {
  x: number;
  y: number;
  scale: number;
}

/**
 * Lightweight pan/zoom canvas for the Top Cut bracket (no external
 * dependency): the bracket world is positioned with left/top and scaled with
 * the CSS `zoom` property inside a clipped viewport. `zoom` re-renders text
 * and HTML at the final size, so the bracket stays crisp at any zoom level
 * (a `transform: scale()` would rasterize it and blur on zoom-in). On mount
 * the bracket is fitted to the viewport (never upscaled beyond 100%), so the
 * whole bracket is visible on any screen; the organizer zooms in for detail.
 *
 * Zooming keeps the bracket centered: the wheel, the floating buttons and
 * double-click/double-tap all zoom around the bracket's center, so the
 * bracket stays put in the middle of the viewport while it grows or shrinks.
 * The wheel factor is continuous (trackpad-friendly) instead of a fixed step.
 * Drag pans, two-finger pinch zooms around the fingers' midpoint and pans
 * with it so the content follows the fingers, and double-tap zooms in on
 * touch. Interactive children (the match cards' "Ganó" buttons) keep
 * working: a click without movement is not swallowed by the pan gesture.
 */
export const BracketCanvas = ({ children }: { children: ReactNode }) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const [view, setView] = useState<View>({ x: 0, y: 0, scale: 1 });
  const [panning, setPanning] = useState(false);
  // Natural (unzoomed) size of the world, measured once on first mount while
  // the world is still at zoom 1. The bracket grid has fixed rem dimensions,
  // so the natural size never changes afterwards.
  const naturalSizeRef = useRef<{ width: number; height: number } | null>(null);
  // Last tap (touch) for double-tap detection.
  const lastTapRef = useRef<{
    time: number;
    x: number;
    y: number;
  } | null>(null);
  // Whether the current gesture moved past the pan threshold (a moved gesture
  // is a pan, not a tap) and how many pointers it involved.
  const gestureMovedRef = useRef(false);
  const maxPointersRef = useRef(0);

  const fit = useCallback(() => {
    const viewport = viewportRef.current;
    const world = worldRef.current;
    if (!viewport || !world) return;
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    if (naturalSizeRef.current === null) {
      naturalSizeRef.current = {
        width: world.offsetWidth,
        height: world.offsetHeight,
      };
    }
    const { width: ww, height: wh } = naturalSizeRef.current;
    if (vw === 0 || vh === 0 || ww === 0 || wh === 0) return;
    const scale = Math.max(MIN_SCALE, Math.min(vw / ww, vh / wh, 1));
    setView({
      scale,
      x: (vw - ww * scale) / 2,
      y: (vh - wh * scale) / 2,
    });
  }, []);

  useLayoutEffect(() => {
    fit();
  }, [fit]);

  const clampScale = (scale: number) =>
    Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));

  // Zoom keeping the point under (clientX, clientY) fixed in the viewport.
  const zoomAt = useCallback(
    (clientX: number, clientY: number, factor: number) => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const rect = viewport.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      setView((v) => {
        const scale = clampScale(v.scale * factor);
        const applied = scale / v.scale;
        return {
          scale,
          x: px - (px - v.x) * applied,
          y: py - (py - v.y) * applied,
        };
      });
    },
    [],
  );

  // Zoom keeping the bracket's center fixed in the viewport, so the bracket
  // stays centered while zooming in or out.
  const zoomAtBracketCenter = useCallback((factor: number) => {
    setView((v) => {
      const natural = naturalSizeRef.current;
      const scale = clampScale(v.scale * factor);
      const applied = scale / v.scale;
      const cx = natural ? v.x + (natural.width * v.scale) / 2 : 0;
      const cy = natural ? v.y + (natural.height * v.scale) / 2 : 0;
      return {
        scale,
        x: cx - (cx - v.x) * applied,
        y: cy - (cy - v.y) * applied,
      };
    });
  }, []);

  // Native wheel listener: React's synthetic onWheel can be registered as
  // passive, which would prevent preventDefault from blocking page scroll.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      // Normalize deltaMode: Firefox reports lines, some browsers pages.
      const delta =
        event.deltaMode === 1
          ? event.deltaY * 16
          : event.deltaMode === 2
            ? event.deltaY * 100
            : event.deltaY;
      zoomAtBracketCenter(Math.exp(-delta * WHEEL_ZOOM_SENSITIVITY));
    };
    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [zoomAtBracketCenter]);

  const zoomIn = () => zoomAtBracketCenter(ZOOM_STEP);
  const zoomOut = () => zoomAtBracketCenter(1 / ZOOM_STEP);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (pointersRef.current.size === 0) {
      gestureMovedRef.current = false;
      maxPointersRef.current = 0;
    }
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    maxPointersRef.current = Math.max(
      maxPointersRef.current,
      pointersRef.current.size,
    );
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = pointersRef.current.get(event.pointerId);
    if (!start) return;
    const current = { x: event.clientX, y: event.clientY };

    if (pointersRef.current.size === 1) {
      const dx = current.x - start.x;
      const dy = current.y - start.y;
      if (!panning && Math.hypot(dx, dy) > PAN_THRESHOLD) {
        setPanning(true);
        gestureMovedRef.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      if (panning) {
        setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
      }
    } else if (pointersRef.current.size === 2) {
      const [idA, idB] = [...pointersRef.current.keys()];
      const a = pointersRef.current.get(idA)!;
      const b = pointersRef.current.get(idB)!;
      const aCur = idA === event.pointerId ? current : a;
      const bCur = idB === event.pointerId ? current : b;
      const prevDist = Math.hypot(a.x - b.x, a.y - b.y);
      const curDist = Math.hypot(aCur.x - bCur.x, aCur.y - bCur.y);
      const prevMid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const curMid = { x: (aCur.x + bCur.x) / 2, y: (aCur.y + bCur.y) / 2 };
      if (prevDist > 0 && curDist > 0) {
        zoomAt(prevMid.x, prevMid.y, curDist / prevDist);
      }
      // Pan with the midpoint so the content follows the fingers.
      setView((v) => ({
        ...v,
        x: v.x + (curMid.x - prevMid.x),
        y: v.y + (curMid.y - prevMid.y),
      }));
    }

    pointersRef.current.set(event.pointerId, current);
  };

  const endPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size === 0) setPanning(false);
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    endPointer(event);
    // Double-tap zooms in on touch. A moved gesture is a pan, not a tap, and
    // multi-touch gestures are excluded.
    if (
      event.pointerType === "touch" &&
      !gestureMovedRef.current &&
      maxPointersRef.current === 1
    ) {
      const now = Date.now();
      const last = lastTapRef.current;
      if (
        last &&
        now - last.time < DOUBLE_TAP_MS &&
        Math.hypot(event.clientX - last.x, event.clientY - last.y) <
          DOUBLE_TAP_DISTANCE
      ) {
        zoomAtBracketCenter(ZOOM_STEP);
        lastTapRef.current = null;
      } else {
        lastTapRef.current = {
          time: now,
          x: event.clientX,
          y: event.clientY,
        };
      }
    }
  };

  const onPointerLeave = (event: ReactPointerEvent<HTMLDivElement>) => {
    // A mouse pointer that leaves before the pan threshold never captured the
    // viewport, so its pointerup may land elsewhere; drop it to avoid a stale
    // entry. Touch pointers are implicitly captured and never leave.
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      pointersRef.current.delete(event.pointerId);
    }
  };

  const onDoubleClick = () => {
    zoomAtBracketCenter(ZOOM_STEP);
  };

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={viewportRef}
        className="sf-bracket-canvas"
        style={{
          position: "relative",
          height: CANVAS_HEIGHT,
          overflow: "hidden",
          borderRadius: "0.75rem",
          border: "1px solid var(--neutral-alpha-medium)",
          touchAction: "none",
          cursor: panning ? "grabbing" : "grab",
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={endPointer}
        onPointerLeave={onPointerLeave}
        onDoubleClick={onDoubleClick}
      >
        <div
          ref={worldRef}
          style={{
            position: "absolute",
            left: view.x,
            top: view.y,
            zoom: view.scale,
            width: "max-content",
            willChange: "left, top",
          }}
        >
          {children}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          right: "0.75rem",
          bottom: "0.75rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <Button
          size="s"
          variant="secondary"
          prefixIcon="minus"
          aria-label="Alejar"
          onClick={zoomOut}
        />
        <Text variant="label-default-xs" onBackground="neutral-weak">
          {Math.round(view.scale * 100)}%
        </Text>
        <Button
          size="s"
          variant="secondary"
          prefixIcon="plus"
          aria-label="Acercar"
          onClick={zoomIn}
        />
        <Button
          size="s"
          variant="secondary"
          prefixIcon="maximize"
          aria-label="Ajustar el bracket a la vista"
          onClick={fit}
        />
      </div>
    </div>
  );
};
