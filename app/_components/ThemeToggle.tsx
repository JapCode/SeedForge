"use client";

import { useEffect, useRef, useState } from "react";
import { IconButton, useTheme } from "@once-ui-system/core";
import { MorphIcon } from "morphicons/react";
import { Moon, Sun } from "lucide";

// Keeps the `theme-switching` class on <html> a little longer than the CSS
// transition (0.3s, see app/globals.css) so the fade always finishes.
const THEME_TRANSITION_MS = 400;

/**
 * Single-button light/dark toggle for the navbar. The app defaults to the
 * system theme (see resources/once-ui.config.ts); the button shows the
 * current theme — Moon in dark mode, Sun in light mode — and toggles between
 * the two explicit themes, leaving "system" until the first click. The
 * mounted guard mirrors Once UI's ThemeSwitcher so the server and the first
 * client render agree on the icon (resolvedTheme depends on the client's OS
 * preference).
 */
export const ThemeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  // Mounted guard: resolvedTheme is "dark" on the server but reflects the
  // client's OS preference after hydration, so the icon must not be read
  // before mount (same pattern as Once UI's ThemeSwitcher).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  // Fades every theme change, not just toggle clicks: a MutationObserver on
  // `data-theme` adds the `theme-switching` class (app/globals.css) right
  // after the attribute mutates — covering OS preference changes while the
  // app is in "system" mode. The class lands in the microtask before the
  // next paint, so the browser animates from the old colors. The initial
  // data-theme (set by ThemeInit pre-hydration) predates this observer.
  useEffect(() => {
    const html = document.documentElement;
    const observer = new MutationObserver(() => {
      html.classList.add("theme-switching");
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        html.classList.remove("theme-switching");
        timeoutRef.current = null;
      }, THEME_TRANSITION_MS);
    });
    observer.observe(html, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => {
      observer.disconnect();
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <IconButton
      variant="secondary"
      size="s"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      aria-pressed={isDark}
      tooltip={isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      tooltipPosition="top"
    >
      <MorphIcon icon={isDark ? Moon : Sun} size={16} spring="snappy" />
    </IconButton>
  );
};
