"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

function subscribeToCoarsePointer(callback: () => void) {
  const mql = window.matchMedia("(pointer: coarse)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

/**
 * Thin overlay scrollbar for the document, replacing the native one (which
 * is hidden via globals.css). Renders a floating thumb that appears while
 * scrolling and fades out when idle, so the page background flows edge to
 * edge and expanding content never shifts the layout.
 */
export const OverlayScrollbar = () => {
  // Touch devices already use overlay scrollbars; a custom bar here would
  // only steal touch gestures near the edge. useSyncExternalStore keeps
  // the server and initial client snapshots identical (always true),
  // then reacts to pointer changes after hydration.
  const enabled = useSyncExternalStore(
    subscribeToCoarsePointer,
    () => !window.matchMedia("(pointer: coarse)").matches,
    () => true,
  );
  const [thumbTop, setThumbTop] = useState(0);
  const [thumbHeight, setThumbHeight] = useState(32);
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragging = useRef(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const update = () => {
      const scrollTop = window.scrollY;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;
      const maxScroll = Math.max(scrollHeight - clientHeight, 0);

      if (maxScroll === 0) {
        setVisible(false);
        return;
      }

      const height = Math.max((clientHeight / scrollHeight) * clientHeight, 32);
      const track = clientHeight - height;
      setThumbHeight(height);
      setThumbTop((scrollTop / maxScroll) * track);

      setVisible(true);
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
      }
      hideTimer.current = setTimeout(() => setVisible(false), 1200);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
      }
    };
  }, [enabled]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) {
      return;
    }
    const clientHeight = window.innerHeight;
    const scrollHeight = document.documentElement.scrollHeight;
    const maxScroll = Math.max(scrollHeight - clientHeight, 0);
    const track = clientHeight - thumbHeight;
    if (track <= 0) {
      return;
    }
    const ratio = (event.clientY - thumbHeight / 2) / track;
    window.scrollTo(0, Math.max(0, Math.min(1, ratio)) * maxScroll);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        right: 2,
        height: "100vh",
        width: 8,
        pointerEvents: "none",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.2s ease",
        zIndex: 50,
      }}
    >
      <div
        className="sf-scrollbar-thumb"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          position: "absolute",
          top: thumbTop,
          height: thumbHeight,
          width: "100%",
          borderRadius: 999,
          pointerEvents: enabled ? "auto" : "none",
          cursor: "pointer",
        }}
      />
    </div>
  );
};
