# Contributing to Seed Forge

Thanks for your interest in contributing! This project follows a few strong conventions — please read them before opening a PR.

## Getting started

1. Fork the repository and clone your fork.
2. Install dependencies: `pnpm install`
3. Copy `.env.example` to `.env` and fill in the values (see the [README](README.md#getting-started)).
4. Run the migrations: `pnpm db:migrate`
5. Start the dev server: `pnpm dev`

## Architecture rules

Dependency direction is one-way and inward:

```
app/ (Next.js routes)  →  infrastructure/  →  application/  →  domain/
```

- `domain/` is pure TypeScript. No imports from application/infrastructure/app. If a domain file needs Drizzle, Next.js, or Better Auth, something is misplaced.
- `application/` contains use-cases and ports (interfaces only). Depends only on `domain/`.
- `infrastructure/` implements the ports (Drizzle repositories, Better Auth adapter, Pino logger).
- `app/` is orchestration only: parse request → build command → call use-case → respond. No business logic.
- `components/` is shared UI; depends only on `domain/` and itself.
- `resources/` is design tokens + icons; external packages only.

These rules are **enforced by `eslint-plugin-boundaries`** (`boundaries/dependencies`, `default: "disallow"`) in `eslint.config.mjs`. `pnpm lint` fails on violations — don't bypass the rule with disable comments.

## Code conventions

- All code and comments in English.
- UI copy is Spanish (Rioplatense) — keep new user-facing strings in Spanish.
- One test file per source file, in a sibling `__tests__/` folder, same name + `.test.ts`.
- Domain entities: private constructor + static factories (`create`, `fromProps`), `toProps()` for persistence mapping.
- Run the full unit suite before pushing: `pnpm test:run`.
- Run lint: `pnpm lint`.

## Domain rules you must not break

- **Points**: win = 3, draw = 1, loss/double-loss = 0.
- **No draws by default** (`TournamentRuleset.current()`): Konami removed draws July 29, 2025 — time-out ties resolve as `double_loss`. `TournamentRuleset.legacy()` re-enables draws for old-ruleset events; don't delete the `draw` result type.
- **Bye**: max one per player, awards 3 points + a 2-0 game record; a bye is never counted as an "opponent" for OMW%/OGW%.
- **Tiebreaker order**: match points → OMW% → OGW% → DDD, each opponent floored at 33% (`TiebreakerCalculator`). Don't reorder or change the floor without checking `TiebreakerCalculator.test.ts`'s reference-example test.
- **Pairing**: `SwissPairingService.generateNextRound` runs a single exhaustive backtracking search over the whole field — same-score-group pairings first (in standings order), downfloats only when forced, never repeated opponents. Manual/audit pairing goes through `buildManualRound`, which enforces "every active player exactly once" regardless of source.
- **Rollback**: every mutation (`Match.reportWin`, `Round.complete`, `BracketMatch.reportWinner`) has a matching revert method. `TopCutBracket.revertMatchWinner` blocks if the next round already has a decided result — cascade must be reverted top-down.

## Testing

- Unit tests: `pnpm test:run` (no database needed).
- Integration tests: `pnpm test:integration` (requires a reachable PostgreSQL database; see `vitest.config.integration.ts`).

## Pull requests

- Keep PRs focused: one logical change per PR.
- Include tests for new behavior.
- Make sure `pnpm lint`, `pnpm test:run`, and `pnpm build` pass.
- Describe what changed and why in the PR description.

## Reporting issues

Use the issue templates: [bug reports](.github/ISSUE_TEMPLATE/bug_report.md) and [feature requests](.github/ISSUE_TEMPLATE/feature_request.md). For security vulnerabilities, see [SECURITY.md](.github/SECURITY.md) — do not open a public issue.