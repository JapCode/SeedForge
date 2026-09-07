---
name: Seed Forge
description: Yu-Gi-Oh Swiss tournament manager — the modern web alternative to KTS desktop software
colors:
  forge-violet: "#9745F7"
  forge-violet-bright: "#B07AFA"
  white-hot-magenta: "#D166FA"
  steel-slate: "#080811"
  surface-slate: "#15151F"
  text-muted: "#757683"
  ghost-line: "#9697A5"
  danger: "#E90507"
  success: "#08AC3A"
  warning: "#FE9C0B"
typography:
  display:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "4rem"
    fontWeight: 600
    lineHeight: 4.25rem
    letterSpacing: "normal"
  headline:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 2rem
    letterSpacing: "normal"
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5rem
    letterSpacing: "normal"
  label:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "0.825rem"
    fontWeight: 600
    lineHeight: 1rem
    letterSpacing: "normal"
  code:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5rem
rounded:
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.25rem"
  full: "9999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2.5rem"
components:
  button-primary:
    backgroundColor: "{colors.forge-violet}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.75rem"
    height: "40px"
  button-secondary:
    textColor: "{colors.text-muted}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.75rem"
    height: "40px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.75rem"
    height: "40px"
  card:
    backgroundColor: "{colors.surface-slate}"
    rounded: "{rounded.lg}"
    padding: "1.5rem"
  input:
    backgroundColor: "{colors.surface-slate}"
    rounded: "{rounded.md}"
    height: "40px"
  nav-pill:
    backgroundColor: "{colors.surface-slate}"
    rounded: "{rounded.full}"
---

# Design System: Seed Forge

> **Note on provenance:** this file was auto-extracted from the incumbent
> implementation. The token values (frontmatter) are normative and taken from
> the live Once UI configuration (`resources/once-ui.config.ts` and the
> library's token CSS). The qualitative language (North Star, color names,
> named rules) is **inferred from the implementation** — it was not
> user-supplied, because no structured interview tool was available when this
> file was generated. Treat it as a proposal and adjust freely.

## Overview

**Creative North Star: "The Forge Floor"**

Seed Forge is a judge's workbench: hot violet metal on cool slate. The brand
name is the metaphor made literal — an event enters as raw material (names on
a list) and is hammered into shape round by round until it leaves as a sealed
result, a finished tournament. The interface carries the two temperatures of
the forge at once: the **plasma heat** of the violet brand, which appears
wherever the organizer acts or the event is alive, and the **cooled steel**
of the slate neutral, which carries everything else so the room stays calm.

The system is deliberately calm for an audience that works under pressure.
A store organizer on a laptop, mid-event, with players asking questions, does
not need drama — they need legibility, speed, and the absolute certainty that
a score is correct. So the visual language is soft-edged and light on
saturation: playful radii (16px cards, 12px controls), translucent surfaces
that float over a quiet page background, and a two-tone text hierarchy that
never asks the eye to parse gray-on-gray. The one place the design lets go is
the **live state**: the current round pulses in magenta, the only motion in
the system, telling the organizer at a glance where the event stands.

**Key Characteristics:**
- Warm steel: slate neutrals (near-black `#080811`) over violet heat
  (`#9745F7`), with magenta (`#D166FA`) reserved strictly for the live/now state.
- Soft-edged and approachable: playful radii everywhere, full-pill for
  floating chrome (nav, avatars, status dots).
- Translucent layering, flat at rest: surfaces blur what's behind them
  (`backdrop-filter: blur(1rem)`) but cast no resting shadows.
- Two-tone text discipline: `neutral-strong` for what matters, `neutral-weak`
  for everything secondary — never a third gray.
- A single content column (48rem) for every operator surface; wide layouts
  exist only on the public landing page.
- Everything reversible: destructive and hard-to-revert actions sit behind
  confirm dialogs, and every action has a visible "revert" counterpart.

## Colors

A two-temperature palette: the violet/magenta heat of an active event against
the cool steel slate chassis. Saturation is spent almost entirely on the brand
pair; neutrals and functional roles do the rest.

### Primary
- **Forge Violet** (`#9745F7`, scheme violet-500): the brand workhorse.
  Dark-mode primary buttons, active Swiss phase badges (`brand-weak` bg +
  `brand-strong` text), icon tiles, the completed-round dots in the Swiss
  timeline, and all brand-alpha washes (`brand-alpha-weak/medium`).
- **Forge Violet Bright** (`#B07AFA`, scheme violet-600): the same role in
  light mode, where solid elements step up one tone to hold contrast against
  the white page (`brand-solid-strong` in light = violet-600).

### Secondary
- **White-Hot Magenta** (`#D166FA`, scheme magenta-600): the live-state
  color, used only where something is happening right now — the pulsing
  "current round" dot in the timeline and the Top Cut phase badge. It is the
  accent by configuration (`resources/once-ui.config.ts`), and restraint is
  part of the identity: magenta never decorates, it signals.

### Neutral
- **Steel Slate** (`#080811`, scheme slate-100): near-black chassis. Dark
  mode's page background, light mode's strongest text color.
- **Surface Slate** (`#15151F`, scheme slate-200): dark-mode card and surface
  fill (with the translucent blur applied on top).
- **Text Muted** (`#757683`, scheme slate-500): secondary text
  (`neutral-weak`/`neutral-medium`) in light mode; in dark mode the muted
  role remaps to slate-700 (`#B2B3C1`).
- **Ghost Line** (`#9697A5`, scheme slate-600): the source of every border —
  rendered as alpha overlays (`neutral-alpha-weak` = 15%, `-medium` = 30%,
  `-strong` = 50%) rather than solid lines.

### Named Rules
**The Two Temperatures Rule.** Every screen is mostly steel with a violet heat
source; magenta is a thermocouple, not a decoration. If a screen needs more
than one magenta element, it needs a simpler design, not more magenta.

**The Alpha Line Rule.** Borders are never solid neutrals. All dividers,
card edges, and focus-adjacent strokes use the `neutral-alpha` overlay ramp
(15 / 30 / 50%) derived from Ghost Line — it keeps edges visible in both
themes without adding chrome.

## Typography

**Display Font:** Geist (with system-ui sans-serif fallback)
**Body Font:** Geist (with system-ui sans-serif fallback)
**Label/Mono Font:** Geist Mono (with ui-monospace, monospace fallback) for code

**Character:** A single geometric-grotesque family (Geist) carries the whole
system, which keeps an information-dense app calm; hierarchy comes from size,
weight, and color, not from a second voice. Labels are compact and numeric
data is set strong so scores read at a glance.

### Hierarchy
- **Display** (600, 4rem, 4.25rem): hero headlines on the public landing
  page only (`display-strong-l`). Never used inside the operator app.
- **Headline** (600, 1.5rem, 2rem): page titles (`heading-strong-xl`) and the
  largest operator surfaces; `heading-strong-l` (1.33rem) and
  `heading-strong-m` (1.25rem) for card and section titles.
- **Body** (400, 1rem, 1.5rem): default reading text (`body-default-m`);
  `body-default-s` (0.875rem) for secondary; `body-strong-*` (700) for names
  and scores. Keep prose lines short — the 48rem column already caps width.
- **Label** (600, 0.825rem, 1rem): meta labels — table numbers, round
  counters, stat-card captions (`label-default-s`); `label-default-xs`
  (0.75rem) for the tightest spots like round labels under timeline dots.

### Named Rules
**The Strong Numbers Rule.** Any number a player or organizer would compare —
points, game scores, positions — is set in `body-strong-*` (700). Labels and
captions around it are 400. Scores must be findable without reading.

## Layout

The operator app lives in a single centered column of **48rem max width**
(`maxWidth={48}`), with `40px` vertical padding around each surface and
`32px` gaps between major blocks. The public landing page breaks out to wider
containers (`maxWidth={40}` hero, `maxWidth={60}` feature grid) but never to
full-bleed content.

Responsive behavior is utility-driven at the component level: rows wrap
(`wrap`), two-column rows (overview: timeline + top-3 | sticky action panel)
collapse to one column under `minWidth` floors (20rem / 15rem), and the nav
pill hides brand text and secondary links on small screens (`xs={{ hide: true }}`).
Density stays constant — spacing steps are fixed (4 / 8 / 16 / 24 / 40), and
reflow happens by stacking, never by shrinking type.

Lists of matches, players, and history rows share one rhythm: **12px padding,
`radius-m` (0.75rem), alpha border** per row, stacked with 8px gaps inside
16px-gapped surfaces.

## Elevation & Depth

The system is **flat at rest, translucent in layering, lifted only when
floating**. Depth is conveyed three ways, in increasing rarity:

1. **Tonal layering** (the default): the page is the darkest or lightest
   plane; surfaces (`background="surface"`) sit one tone in and blur the
   backdrop (`backdrop-filter: blur(1rem)` in light mode, `#15151F` in dark).
   This is how cards, forms, and the match tiles separate from the page —
   no shadow involved.
2. **Alpha borders**: card edges are 15–50% alpha strokes, which read as
   "cut from the same sheet" rather than "stacked boxes".
3. **Shadows** — reserved for chrome that floats over content:
   - **nav pill** (`shadow-m`): `0px 0px 2px rgba(0,0,0,0.12), 0px 2px 4px rgba(0,0,0,0.08), 0px 8px 8px rgba(0,0,0,0.08)`
   - **dialog** and similar overlays step up the same stack (`shadow-l`).

### Named Rules
**The Flat At Rest Rule.** No resting card ever casts a shadow. If a surface
is flat against the page, it stays flat; shadows appear only on elements that
genuinely float (nav, dialogs, overlays). A shadow on a list row is a bug.

## Shapes

The form language is **playful radii over soft-edged controls**: `radius-l`
(1rem) on cards, `radius-m` (0.75rem) on inputs, buttons, and row items,
`radius-s` (0.5rem) on the smallest tiles, and `radius-full` (pill) on
floating chrome — the nav pill, avatars, icon tiles in stats, and the round
dots of the Swiss timeline. Once UI's nest scale steps radii up by one level
for elements inside elements (e.g., a button inside a 1rem card gets 1.25rem),
which keeps the inner shape feeling intentional rather than cramped.

Two signature form behaviors:
- **Joined field groups** (auth pages): consecutive inputs merge into one
  block — top field rounds its top corners, bottom field its bottom corners,
  and the `-1px` overlapping borders collapse into a single line.
- **Solid style is flat**: `solid-style: flat` means solid elements (primary
  buttons) have no inset or inner border — a flat color slab with the pill/soft
  radius doing all the talking.

## Components

All components are Once UI primitives (`@once-ui-system/core`) configured by
`resources/once-ui.config.ts`; the app composes them rather than restyling
them. The patterns below are the observed, recurring ones.

### Buttons
- **Shape:** `radius-m` (0.75rem), flat solid style, heights 32/40/48px
  (`s`/`m`/`l`); default padding 8px 12px at 40px height.
- **Primary:** Forge Violet fill (`--brand-solid-strong`), white label.
  The single loudest element on any surface — used for "create", "start",
  "generate round", and the landing CTAs.
- **Secondary:** transparent fill, neutral-alpha border, `text-muted` label —
  used for match score entry (2-0 / 2-1) and quiet alternatives.
- **Tertiary:** borderless text button — "revert result", "quitar".
- **Danger:** solid red (`danger-strong`) — destructive confirms (drop
  player, revert round completion, finish tournament).
- **State:** pending actions swap the label ("Generando...") and disable the
  button; errors surface both inline and as a danger toast. Focus is a 2px
  solid brand ring with 2px offset.

### Badges (phase & status chips)
- **Style:** `radius-s` (0.5rem), **weak background + strong text** pairing —
  `brand-weak`/`brand-strong` (Swiss in progress, BYE), `info-weak`/`info-strong`
  (registration), `accent-weak`/`accent-strong` (Top Cut), `success-weak`/
  `success-strong` (completed), `danger-weak`/`danger-strong` (dropped).
- **Role:** status is always a badge, never a raw color on text — the weak/strong
  pairing keeps every status legible in both themes.

### Cards / Containers
- **Corner Style:** `radius-l` (1rem).
- **Background:** `background="surface"` — translucent surface (dark: `#15151F`
  + blur; light: 50% white + blur). Some cards leave `surface` off and rely on
  the alpha border alone.
- **Shadow Strategy:** none at rest (Flat At Rest Rule).
- **Border:** `neutral-alpha-weak` (15%) — the default; prominent cards use
  `neutral-alpha-medium`.
- **Internal Padding:** 16–24px (compact cards 16px, content cards 24px).

### Inputs / Fields
- **Style:** `radius-m` (0.75rem), `neutral-alpha-weak` background on a
  translucent surface, 40px height (`m`).
- **Auth exception:** the joined group (AuthFieldGroup) overrides the input
  background to opaque `--neutral-background-weak` so the decorative page
  backdrop doesn't darken fields behind the translucent card; fields overlap
  by `-1px` to merge their borders.
- **Focus:** 2px solid brand ring, 2px offset.

### Navigation
- **Style:** a single floating pill — `radius-full`, translucent `surface`
  fill, `neutral-medium` border, `shadow-m`, sticky at top with 16px padding
  and 32px horizontal inset. Brand mark is a 32px `radius-m` violet-alpha tile
  with a sparkle icon; the "Seed Forge" wordmark sits beside it.
- **States:** active route links get a `brand-alpha-weak` pill + `brand-medium`
  text; inactive are `neutral-medium`. Signed-in users get "Mis torneos" /
  "Crear torneo" links; signed-out get login/register buttons. Small screens
  hide the wordmark, links, and theme switcher, leaving the mark and CTAs.

### Standings Table
- A Once UI `Table` with six columns — position, player (name + dropped
  badge inline), Pts (strong), OMW%, GW%, OGW% (muted, `s` size). Shared
  verbatim between the operator Standings tab and the public share page.

### Dialogs (confirm)
- Used for destructive or hard-to-revert actions: drop player, remove player,
  revert round, complete round, finish tournament. Body carries the explicit
  line "Esta acción no se puede deshacer." for true irreversible cases;
  the confirm button is primary unless the action is destructive, then danger.
  Success/failure feedback returns as toasts (success / danger variants).

### Match Card (signature)
- The unit of the round page. A `radius-l` card with: a header row (table
  number label left, result badge right when reported), a `player1 vs
  player2` middle where each player is a `radius-m` surface tile with strong
  name text, and — while pending — 2-0 / 2-1 score buttons under each name
  (secondary variant) plus "Doble derrota" and, under legacy rulesets,
  "Empate" as tertiary footer actions. Once reported, the footer becomes a
  single "Revertir resultado" tertiary action.

### Swiss Timeline (signature)
- The overview's progress spine: one dot per Swiss round on a 1px track.
  Completed rounds are filled `brand-strong` dots with a check; the current
  round is a `radius-full` accent ring that **pulses** (`sf-pulse`, 1.8s
  ease-in-out, opacity 1 → 0.35); pending rounds are empty dots with a
  `neutral-alpha-medium` outline. Existing rounds are links to their round
  page; the track segments between dots are `brand-strong` when the preceding
  round completed, otherwise `neutral-alpha-medium`.

## Do's and Don'ts

### Do:
- **Do** use Forge Violet for every primary action and the brand-alpha washes;
  it is the system's single saturated workhorse.
- **Do** keep magenta strictly for live state — the pulsing current-round dot
  and the Top Cut phase — so "now" is always one glance away.
- **Do** pair every status with a weak-background badge + strong-text
  foreground; never express phase/status as raw color alone.
- **Do** render scores and points in `body-strong-*` (700) with labels around
  them in 400.
- **Do** keep every operator surface inside the 48rem centered column with
  40px vertical padding; let content stack on small screens rather than
  shrinking type.
- **Do** put reversible-but-costly actions behind a confirm dialog and give
  every completed mutation a visible revert path — it is a product promise.
- **Do** write interface copy in Spanish (Rioplatense, voseo): "Creá",
  "Generá", "Mirá".
- **Do** use alpha-based borders (`neutral-alpha-*`) for all dividers and
  card edges.

### Don't:
- **Don't** add a second saturated accent color; the palette is violet +
  magenta-now + steel, with functional colors only for danger/success/warning.
- **Don't** cast shadows on resting cards or list rows — shadows belong to
  floating chrome only.
- **Don't** introduce square corners or hard edges; the playful radius scale
  is part of the identity.
- **Don't** use a third gray in text hierarchy; two tones (strong/weak) are
  the whole system.
- **Don't** let the operator app exceed the 48rem column — density is fixed,
  reflow is by stacking.
- **Don't** emulate KTS or legacy desktop tournament software: no gray
  chrome, no dense tabular interfaces beyond the one standings table, no
  progress bars on every element.
