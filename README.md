# Seed Forge

**The modern web alternative to Konami Tournament System (KTS) for Yu-Gi-Oh Swiss tournaments.**

Seed Forge is a web-based tournament manager: create an event, register players, generate Swiss rounds, report match results, rank with official tiebreakers, run the top cut, and publish live standings. Organizers run the event from a laptop while players follow along on their phones — no desktop install, no spreadsheets, no mental math.

## Features

- **Official Swiss pairing** — automatic round generation with an exhaustive backtracking search over the whole field; every active player appears exactly once per round.
- **Official tiebreakers** — match points → OMW% → OGW% → DDD, with the 33% opponent floor required by the rules.
- **Current ruleset by default** — 3-1-0 points and no draws (Konami policy since July 29, 2025); a legacy ruleset is available for older events.
- **Top cut brackets** — Top 4/8/16/32 single elimination with standard seeding.
- **Public live standings** — share a read-only link so players can follow the event on their phones.
- **Everything is reversible** — every mutation (match result, round completion, bracket winner, tournament completion) has a matching revert.
- **Byes handled correctly** — max one per player, 3 points + a 2-0 game record, never counted as an opponent.

## Tech stack

- **Next.js** (App Router) + **TypeScript**
- **Once UI** — design system
- **Better Auth** — email/password + Google OAuth
- **Drizzle ORM** + **PostgreSQL**
- **Vitest** — unit + integration tests
- **Pino** — logging

## Architecture

Hexagonal architecture + DDD with a one-way dependency rule:

```
app/ (Next.js routes)  →  infrastructure/  →  application/  →  domain/
```

- `domain/` — pure TypeScript. No imports from application/infrastructure/app. If a domain file needs Drizzle, Next.js, or Better Auth, something is misplaced.
- `application/` — use-cases + ports (interfaces only). Depends only on `domain/`.
- `infrastructure/` — implements the ports (Drizzle repositories, Better Auth adapter, Pino logger).
- `app/` — route handlers/pages. Orchestration only: parse request → build command → call use-case → respond. No business logic.

See [AGENTS.md](AGENTS.md) for the full architecture and domain rules, and [DESIGN.md](DESIGN.md) for the design system.

## Getting started

### Prerequisites

- Node.js 20+ (this project uses **pnpm**)
- pnpm
- PostgreSQL (or a Neon serverless database)

### Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Create your environment file:

   ```bash
   cp .env.example .env
   ```

3. Fill in the required values in `.env`:

   - `DATABASE_URL` — PostgreSQL connection string
   - `BETTER_AUTH_SECRET` — generate one with `openssl rand -base64 32`
   - `BETTER_AUTH_URL` — your app URL (`http://localhost:3000` in development)
   - `NEXT_PUBLIC_APP_URL` — same as `BETTER_AUTH_URL`

4. Run the database migrations:

   ```bash
   pnpm db:migrate
   ```

5. Start the dev server:

   ```bash
   pnpm dev
   ```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Script | Description |
| --- | --- |
| `pnpm dev` | Start the dev server |
| `pnpm build` | Production build |
| `pnpm start` | Start the production server |
| `pnpm lint` | ESLint |
| `pnpm test` | Run tests in watch mode |
| `pnpm test:run` | Run unit tests once |
| `pnpm test:integration` | Run integration tests against a real database |
| `pnpm db:migrate` | Apply database migrations |
| `pnpm db:generate` | Generate migrations from schema changes |

## Testing

- **Unit tests** (`pnpm test:run`) — 346 tests across domain, application, and infrastructure. No database required.
- **Integration tests** (`pnpm test:integration`) — exercise the real data layer (Drizzle repositories + Better Auth) against a live PostgreSQL database. Configured via `vitest.config.integration.ts`; requires `DATABASE_URL` to point at a reachable database.

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first — it covers the architecture rules, code conventions, and how to run the test suite.

## Security

Found a vulnerability? See [SECURITY.md](.github/SECURITY.md) for how to report it privately.

## License

[MIT](LICENSE) — use it, modify it, fork it, do whatever you want with it.