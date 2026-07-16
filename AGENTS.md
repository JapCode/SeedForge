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

Enforced by `eslint-plugin-boundaries` — don't bypass it.

## Folder map
```
domain/
  entities/       Player, Match, Round, Tournament, BracketMatch, TopCutBracket
  value-objects/  TournamentRuleset
  services/       TiebreakerCalculator, SwissPairingService, TopCutBracketGenerator
  entities/__tests__, services/__tests__
application/
  ports/          TorneoRepository, Logger, SessionProvider
  use-cases/      (not yet built)
infrastructure/
  db/drizzle, auth/, logging/, observability/
```

## Domain rules an agent must not break
- **Points**: win = 3, draw = 1, loss/double-loss = 0.
- **No draws by default** (`TournamentRuleset.current()`): Konami removed draws July 29, 2025 — ties at time-out resolve as `double_loss` (both players get a loss). `TournamentRuleset.legacy()` re-enables draws for old-ruleset events; don't delete the `draw` result type.
- **Bye**: max one per player, awards 3 points + a 2-0 game record (counts toward the player's own GW%, but a bye is never counted as an "opponent" for anyone's OMW%/OGW%).
- **Tiebreaker order**: match points → OMW% → GW% → OGW%, each opponent floored at 33% (`TiebreakerCalculator`). Don't reorder or change the floor without checking `TiebreakerCalculator.test.ts`'s reference-example test.
- **Pairing**: `SwissPairingService.generateNextRound` is a greedy downfloat algorithm, not exhaustive backtracking — known limitation, documented in the file. Manual/audit pairing goes through `buildManualRound`, which enforces "every active player exactly once" regardless of source.
- **Rollback**: every mutation (`Match.reportWin`, `Round.complete`, `BracketMatch.reportWinner`) has a matching revert method. `TopCutBracket.revertMatchWinner` blocks if the next round already has a decided result — cascade must be reverted top-down.

## Conventions
- All code and comments in English.
- One test file per source file, in a sibling `__tests__/` folder, same name + `.test.ts`.
- Domain entities: private constructor + static factories (`create`, `fromProps`), `toProps()` for persistence mapping.
- Run tests: `npm run test`.