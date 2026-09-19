# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Local game store tournament organizers running Yu-Gi-Oh Swiss events.
Each event belongs to a single organizer account. Players are spectators:
they follow the live standings through the public share link, they do not
log in.

## Product Purpose

Seed Forge is a web-based manager for Yu-Gi-Oh tournaments: create an event,
register players, generate Swiss rounds, report match results, rank with
official tiebreakers, run the top cut, and publish live standings. Success
means an organizer can run a correct event from a laptop while players follow
on their phones — without a desktop install, spreadsheets, or mental math.

## Positioning

The modern web alternative to Konami Tournament System (KTS): the same
official rules, none of the desktop friction. Pairings, tiebreakers, and the
bracket are computed by the app; the organizer only enters results.

## Operating Context

The organizer drives the app on a laptop at the event (dashboard, rounds,
standings, top cut). Players open the public share link on their phones to
follow standings live. Content is authored in neutral Spanish (no regional
dialect). Workflow:
create tournament → register players → start → generate rounds → report/revert
results → complete rounds → advance to top cut → complete → share standings.

## Capabilities and Constraints

- Tournaments: name, Swiss round count, optional top cut (4/8/16/32).
- Rulesets: current (no draws; 50-min matches; time-out ties resolve as double
  loss) and legacy (draws allowed; 40-min) selectable per tournament.
- Points 3–1–0; bye = 3 points + 2–0 record, max one per player, never counted
  as an opponent. Tiebreak order match points → OMW% → OGW% → DDD with a 33%
  opponent floor.
- Swiss pairing is a greedy downfloat algorithm (documented limitation), with
  manual/audit pairing via `buildManualRound` guaranteeing every active player
  exactly once.
- Every mutation (match result, round completion, bracket winner, tournament
  completion) is reversible; top-cut revert is blocked top-down.
- Public read-only standings via share token; auth is email/password + Google
  via Better Auth; PostgreSQL/Drizzle; Next.js App Router.
- Single organizer per event (owner-scoped); no collaborator/co-host model.
- Undecided: player self-registration/self check-in; offline mode; tournament
  templates or bulk import.

## Brand Commitments

Name: Seed Forge. Product language: neutral Spanish (no regional dialect;
informal "tú" forms). Voice: practical, reassuring, close to the organizer.
The visual world (Once UI, violet/magenta, Geist, sparkle mark) is the
incumbent implementation, not a binding commitment — treated as evidence by
any later visual work.

## Evidence on Hand

The working implementation itself (domain tests, use-case tests, live UI).
No testimonials, case studies, benchmarks, pricing, or deployment claims exist
and none may be fabricated.

## Product Principles

1. Rules correctness is the product: follow current Konami policy exactly and
   keep every change reversible.
2. The organizer is the operator; players are spectators — keep operator flows
   fast and public views read-only.
3. Replace KTS friction: compute what Swiss software should compute, never ask
   the organizer to redo it by hand.
4. Run where the event runs: laptop at the table, phones in the room, no
   install.
5. Accessibility is contracted: WCAG 2.2 AA applies to every surface, public
   standings included.

## Accessibility & Inclusion

Required conformance: WCAG 2.2 AA. Public standings page is consumed on
players' phones and must meet the same bar.
