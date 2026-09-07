"use client";

import type { CSSProperties, ReactElement } from "react";
import type { IconLibrary } from "@once-ui-system/core";
import type { IconNode } from "lucide";
import {
  AlertCircle,
  AlertTriangle,
  AlignJustify,
  ArrowUpRight,
  AtSign,
  BatteryFull,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsLeftRight,
  ClipboardList,
  Copy,
  CornerDownLeft,
  Eye,
  EyeOff,
  Flag,
  Gauge,
  Gift,
  Globe,
  HelpCircle,
  Info,
  Link,
  Maximize2,
  Minimize2,
  Minus,
  Monitor,
  Moon,
  PawPrint,
  Pause,
  Pipette,
  Play,
  Plus,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  Shuffle,
  SlidersHorizontal,
  Smile,
  Sparkles,
  Sun,
  Swords,
  TextCursorInput,
  Trophy,
  Undo2,
  Users,
  Utensils,
  Volleyball,
  X,
} from "lucide";
import { MorphIcon } from "morphicons/react";

// Global stroke weight for the whole icon set. Lucide's default is 2; if the
// design wants the old Heroicons look (1.5), change it here and it applies
// everywhere.
const STROKE_WIDTH = 2;

/**
 * Props surface Once UI's Icon passes to library components (react-icons
 * `IconBaseProps` subset). Once UI renders them with no props at all, so
 * everything is optional.
 */
interface IconComponentProps {
  size?: number | string;
  color?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Adapts a Lucide icon (data, not a component) to the component type Once
 * UI's IconProvider expects. Rendered through MorphIcon so every icon in the
 * app is a Lucide icon on the 24×24 grid. `size` defaults to "1em" because
 * Once UI sizes icons via the wrapper's font-size.
 */
const fromLucide = (icon: IconNode) => {
  const IconComponent = (props: IconComponentProps): ReactElement => (
    <MorphIcon
      icon={icon}
      size={props.size ?? "1em"}
      color={props.color}
      className={props.className}
      style={props.style}
      strokeWidth={STROKE_WIDTH}
    />
  );
  IconComponent.displayName = "AppIcon";
  return IconComponent;
};

/**
 * Single source of truth for the app's icons: maps every Once UI `IconName`
 * the app (and Once UI's internal components) renders to a Lucide icon.
 * Injected via `<IconProvider icons={appIcons}>` in app/providers.tsx.
 * Add new icons here, not ad-hoc.
 */
export const appIcons = {
  // App usage
  sparkle: fromLucide(Sparkles),
  refresh: fromLucide(RefreshCw),
  radialGauge: fromLucide(Gauge),
  flag: fromLucide(Flag),
  world: fromLucide(Globe),
  security: fromLucide(ShieldCheck),
  check: fromLucide(CheckCircle2),
  info: fromLucide(Info),
  clipboardList: fromLucide(ClipboardList),
  users: fromLucide(Users),
  swords: fromLucide(Swords),
  share: fromLucide(Share2),
  shuffle: fromLucide(Shuffle),
  trophy: fromLucide(Trophy),
  undo: fromLucide(Undo2),
  chevronDown: fromLucide(ChevronDown),
  chevronRight: fromLucide(ChevronRight),
  chevronLeft: fromLucide(ChevronLeft),
  search: fromLucide(Search),
  plus: fromLucide(Plus),
  close: fromLucide(X),
  link: fromLucide(Link),
  copy: fromLucide(Copy),
  arrowUpRight: fromLucide(ArrowUpRight),
  danger: fromLucide(AlertCircle),
  help: fromLucide(HelpCircle),
  // Once UI internals — keeps the whole UI on Lucide
  light: fromLucide(Sun),
  dark: fromLucide(Moon),
  computer: fromLucide(Monitor),
  screen: fromLucide(Monitor),
  eye: fromLucide(Eye),
  eyeOff: fromLucide(EyeOff),
  warning: fromLucide(AlertTriangle),
  chevronUp: fromLucide(ChevronUp),
  chevronsLeftRight: fromLucide(ChevronsLeftRight),
  minus: fromLucide(Minus),
  checkbox: fromLucide(Check),
  calendar: fromLucide(Calendar),
  wordmark: fromLucide(TextCursorInput),
  opacity: fromLucide(SlidersHorizontal),
  eyeDropper: fromLucide(Pipette),
  enter: fromLucide(CornerDownLeft),
  play: fromLucide(Play),
  pause: fromLucide(Pause),
  document: fromLucide(AlignJustify),
  minimize: fromLucide(Minimize2),
  maximize: fromLucide(Maximize2),
  linearGauge: fromLucide(BatteryFull),
  smiley: fromLucide(Smile),
  paw: fromLucide(PawPrint),
  food: fromLucide(Utensils),
  ball: fromLucide(Volleyball),
  gift: fromLucide(Gift),
  symbol: fromLucide(AtSign),
} satisfies Partial<IconLibrary>;
