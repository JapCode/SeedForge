# AGENTS.md

Yu-Gi-Oh Swiss tournament manager (KTS-equivalent). Next.js + TypeScript, hexagonal architecture + DDD.

## Stack
- Next.js (App Router), Once UI, Better Auth, Drizzle ORM, PostgreSQL
- Pino (logging), OpenTelemetry (tracing), Vitest (tests)

## Architecture — dependency direction is one-way, inward

```
app/ (Next.js routes)  →  infrastructure/  →  application/  →  domain/
```

- `domain/` — pure TypeScript. **No imports from application/infrastructure/app.** If a domain file needs Drizzle, Next.js, or Better Auth, something is misplaced.
- `application/` — use-cases + `ports/` (interfaces only). Depends only on `domain/`.
- `infrastructure/` — implements the ports (Drizzle repositories, Better Auth adapter, Pino logger).
- `app/` — route handlers/pages. Orchestration only: parse request → build command → call use-case → respond. No business logic here.
- `components/` — shared UI (StandingsTable, avatar). Depends only on `domain/` and itself.
- `resources/` — design tokens + icon library. External packages only.
- `test/` — integration tests. May reach everything.

Enforced by `eslint-plugin-boundaries` (`boundaries/dependencies`, `default: "disallow"`) in `eslint.config.mjs` — don't bypass it. The element list lives there; keep it in sync with this file.

## Folder map
```
domain/
  entities/       Player, Match, Round, Tournament, BracketMatch, TopCutBracket
  value-objects/  TournamentRuleset
  services/       TiebreakerCalculator, SwissPairingService, TopCutBracketGenerator
  entities/__tests__, services/__tests__
application/
  ports/          TournamentRepository, TopCutBracketRepository, IdGenerator, Logger
  use-cases/      CreateTournament, RegisterPlayer, GenerateNextRound, RegisterMatchResult,
                  CompleteRound, AdvanceToTopCut, ReportBracketMatchWinner, CompleteTournament,
                  ShareTournament, GetTournamentByShareToken, ... (each with a revert counterpart)
infrastructure/
  db/drizzle, auth/, logging/, ids/
```

## Domain rules an agent must not break
- **Points**: win = 3, draw = 1, loss/double-loss = 0.
- **No draws by default** (`TournamentRuleset.current()`): Konami removed draws July 29, 2025 — ties at time-out resolve as `double_loss` (both players get a loss). `TournamentRuleset.legacy()` re-enables draws for old-ruleset events; don't delete the `draw` result type.
- **Bye**: max one per player, awards 3 points + a 2-0 game record (kept for game-record bookkeeping; a bye is never counted as an "opponent" for anyone's OMW%/OGW%).
- **Tiebreaker order**: match points → OMW% → OGW% (opponents' opponents' match-win %) → DDD (sum of the squares of the rounds lost), each opponent floored at 33% (`TiebreakerCalculator`). This is the official KTS order — GW% is NOT a ranking tiebreaker. Don't reorder or change the floor without checking `TiebreakerCalculator.test.ts`'s reference-example test.
- **Pairing**: `SwissPairingService.generateNextRound` runs a single exhaustive backtracking search over the whole field — same-score-group pairings first (in standings order), downfloats only when forced, never repeated opponents — so it finds a valid round whenever one exists. Manual/audit pairing goes through `buildManualRound`, which enforces "every active player exactly once" regardless of source.
- **Rollback**: every mutation (`Match.reportWin`, `Round.complete`, `BracketMatch.reportWinner`) has a matching revert method. `TopCutBracket.revertMatchWinner` blocks if the next round already has a decided result — cascade must be reverted top-down.

## Conventions
- All code and comments in English.
- One test file per source file, in a sibling `__tests__/` folder, same name + `.test.ts`.
- Domain entities: private constructor + static factories (`create`, `fromProps`), `toProps()` for persistence mapping.
- Run tests: `npm run test`.

## Icons — morphicons + Lucide (atomic design)
- **All icons are Lucide** (stroke-based, 24×24), rendered by `morphicons` (`MorphIcon`). Never import `react-icons` directly.
- **Single source of truth**: `resources/icon-library.tsx` maps Once UI's `IconName`s to Lucide icons, injected via `<IconProvider icons={appIcons}>` in `app/providers.tsx`. New icons are added there, not ad-hoc.
- **Static icons** keep using Once UI's `Icon` / `prefixIcon` / `suffixIcon` / `Badge icon` — they resolve to Lucide through the provider.
- **State-driven swaps** (copy → check, chevron expand/collapse) use `MorphIcon` directly with Lucide data: `import { Copy, Check } from "lucide"` (data, NOT `lucide-react` components).
- **Atomic design for icons**: the icon atom is the ONLY client boundary. Server components render `<Icon name="...">` or `MorphIcon` freely WITHOUT adding `"use client"` — the boundary lives inside the atom. Never convert a page or component to a client component just to render an icon.