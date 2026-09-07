import type { Metadata, Viewport } from "next";
import "@once-ui-system/core/css/styles.css";
import "@once-ui-system/core/css/tokens.css";
import "./globals.css";

import classNames from "classnames";
import { Column, ThemeInit } from "@once-ui-system/core";
import { fonts, style } from "../resources/once-ui.config";
import { Providers } from "./providers";
import { SiteNav } from "./_components/SiteNav";
import { OverlayScrollbar } from "./_components/OverlayScrollbar";

export const metadata: Metadata = {
  title: {
    default: "Seed Forge — Gestor de torneos Yu-Gi-Oh",
    template: "%s · Seed Forge",
  },
  description:
    "Gestor de torneos suizos para Yu-Gi-Oh: emparejamientos, desempates, top cut y resultados públicos.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

const RootLayout = async ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <Column
      as="html"
      lang="es"
      suppressHydrationWarning
      className={classNames(
        fonts.heading.variable,
        fonts.body.variable,
        fonts.label.variable,
        fonts.code.variable,
      )}
    >
      <head>
        {/* Pre-hydration theme/style defaults (prevents FOUC). The
            ThemeProvider in Providers.tsx is the runtime source of truth. */}
        <ThemeInit
          config={{
            theme: style.theme,
            brand: style.brand,
            accent: style.accent,
            neutral: style.neutral,
            solid: style.solid,
            "solid-style": style.solidStyle,
            border: style.border,
            surface: style.surface,
            transition: style.transition,
            scaling: style.scaling,
            "viz-style": "gradient",
          }}
        />
      </head>
      <Providers>
        <Column
          background="page"
          as="body"
          fillWidth
          margin="0"
          padding="0"
          style={{ minHeight: "100vh" }}
        >
          <SiteNav />
          {children}
          <OverlayScrollbar />
        </Column>
      </Providers>
    </Column>
  );
};

export default RootLayout;
