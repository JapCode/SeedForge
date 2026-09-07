import { Geist, Geist_Mono } from "next/font/google";
import type {
  BorderStyle,
  NeutralColor,
  ScalingSize,
  Schemes,
  SolidStyle,
  SolidType,
  SurfaceStyle,
  Theme,
  TransitionStyle,
} from "@once-ui-system/core";

const heading = Geist({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

const body = Geist({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const label = Geist({
  variable: "--font-label",
  subsets: ["latin"],
  display: "swap",
});

const code = Geist_Mono({
  variable: "--font-code",
  subsets: ["latin"],
  display: "swap",
});

const fonts = {
  heading,
  body,
  label,
  code,
};

// Single source of truth for the Once UI style configuration.
// Consumed by ThemeInit (pre-hydration, prevents FOUC) and by the
// ThemeProvider in app/providers.tsx (runtime source of truth).
// NOTE: values saved in localStorage (e.g. via the StylePanel) take
// priority over these — clear them if a style change seems ignored.
export const style = {
  theme: "system", // system | dark | light
  neutral: "slate", // sand | gray | slate
  brand: "violet", // blue | indigo | ... | cyan
  accent: "magenta", // blue | indigo | ... | cyan
  solid: "color", // color | contrast | inverse
  solidStyle: "flat", // flat | plastic
  border: "playful", // rounded | playful | conservative
  surface: "translucent", // filled | translucent
  transition: "all", // all | micro | macro | none
  scaling: "100", // 90 | 95 | 100 | 105 | 110
} satisfies {
  theme: Theme;
  neutral: NeutralColor;
  brand: Schemes;
  accent: Schemes;
  solid: SolidType;
  solidStyle: SolidStyle;
  border: BorderStyle;
  surface: SurfaceStyle;
  transition: TransitionStyle;
  scaling: ScalingSize;
};

export { fonts };
