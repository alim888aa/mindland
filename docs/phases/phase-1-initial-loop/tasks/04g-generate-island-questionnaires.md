# Generate island questionnaires

Status: completed

Owner: primary-agent

Depends on: Build initial AI interview, Create initial islands, Build daily check-ins

## Outcome

When the user taps Create my map, one private low-reasoning Luna request generates a three-to-seven-question daily questionnaire for every discovered island using the onboarding conversation, island name, and purpose. The creation mist remains visible until every questionnaire is stored. Existing islands receive a one-time backfill when the signed-in app opens.

## Approved behavior

Luna chooses each prompt, answer choices, and input kind. Every questionnaire covers supportive progress and possible difficulty or harmful behavior. Saved questionnaires remain stable for V1. If generation fails, the existing theme-aware fallback is stored and the map can still open. Later automatic regeneration after an island's purpose changes is deliberately deferred.

## Verification

`npx tsc --noEmit` passed. All 110 repository tests passed, including exact structured-batch validation, stable generated question IDs, saved-questionnaire selection, and complete fallback coverage. `npx convex dev --once` deployed the schema and functions. A signed-in iOS Simulator account backfilled four existing islands, and Sleep routine opened a saved personalized Luna questionnaire with a custom time question and explanation.

## Result

Map creation now waits for one low-reasoning Luna questionnaire batch before revealing the islands. Questions are validated, stored privately with each island, and loaded by guided check-in. Existing islands backfill by their original onboarding conversation. Failure stores a usable theme-aware questionnaire instead of blocking the map.

## Commit

Pending.
