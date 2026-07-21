# Materialize discovered islands

Status: in-progress

Owner: dynamic-islands-backend-agent

Parent: Connect discovered islands to the world

## Outcome

Turn the authenticated user's finalized onboarding discovery into private, durable Convex island records exactly once.

## Boundaries

Own the Convex schema, discovery structure, authenticated finalize mutation, and private island query. Do not change the Expo renderer, map UI, check-in UI, or authentication screens.

## Done when

Finalizing onboarding idempotently creates owner-scoped islands with stable IDs, name, purpose, source context, deterministic AI-selected catalogue visuals, and creation metadata. A private query returns only the signed-in user's islands. Existing onboarding history and separation from scoring remain intact.

## Result

Added an owner-scoped `islands` table and private `islands.listMine` query. Onboarding discovery now preserves each candidate's purpose, interview-grounded source context, and AI-selected key from the approved four-theme V1 catalogue. Revealing a ready interview atomically materializes its islands with stable interview-and-position keys, deterministic visual seeds, and timestamps. Repeating finalization returns the already revealed state without creating duplicates. Existing name-only interviews receive a deterministic compatibility fallback, and onboarding still creates no scored activity data.

## Verification

Local strict TypeScript passed before the repair review; rerunning both the project and focused backend checks after the repair remained active without diagnostics for more than two minutes and was stopped. Focused deterministic materialization, legacy revealed backfill, partial-retry, and catalogue-fallback tests passed with `node --test tests/island-materialization.test.ts` (4 tests). `git diff --check` passed for the backend slice. Convex code generation was retried but exited before generation because the restricted sandbox could not resolve `o1192621.ingest.sentry.io`; generated API confirmation therefore remains an integration step and no generated file was hand-edited. Deployment, live idempotency, legacy-account repair, and two-account privacy remain for the primary agent.

## Commit

Pending.
