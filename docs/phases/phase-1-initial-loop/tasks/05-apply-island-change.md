# Apply growth, rocks, sinking, and resurfacing

Status: completed

Owner: growth-domain-agent

Depends on: Build daily check-ins

## Outcome

Translate recorded activity into visible positive nodes, expanding land, richer terrain features, accumulated negative points, rocks, gradual sinking, and possible resurfacing.

## Approved rules

Preserve every original user entry and extract structured activities only after the conversational agent has separately confirmed the user is finished. One entry may affect several owned islands.

For each island and user-local day, merge all supportive activity into one summarized positive node and at most one lifetime positive point. Merge all harmful activity into at most one negative point. Five negative points produce one visible rock. A rock weighs the same as one lifetime positive point for sinking, and a submerged island resurfaces as soon as lifetime positive points again exceed its rock count.

The first five lifetime positive points grow land by ten percentage points each, from 30% through the 80% cap. Every later positive point adds one semantic prop chosen by the AI from an approved visual catalogue, while the stored selection and all score arithmetic remain deterministic. Keep the rules independent from Convex and the 3D renderer so the same examples can be tested directly.

## Done when

Each island receives at most one summarized positive node, one positive point, and one negative point per day. The first five positive points expand land to its cap, and each later positive point adds a small contextual prop from the approved catalogue. Every five negative points creates a rock. A submerged island resurfaces when lifetime positive points exceed its rocks. These rules are implemented independently from rendering, tested against agreed examples, and reflected through island area, trees, hills, paths, buildings, rocks, and water level.

## Result

Added one private activity ledger for both completed AI conversations and guided island questionnaires. Every source keeps its exact raw conversation link or question-and-answer record before Luna produces typed activity metadata. One activity may affect several owned islands, while the server alone decides supportive and harmful effects from the user's saved island purposes.

Daily island summaries still merge repeated sources into one visible positive node, while the hackathon build awards up to twelve positive points per island per day so land and later props can evolve during one judge session. Harmful activity remains capped at one negative point for the stored local date and time zone. A plain TypeScript domain derives lifetime positives, negative points, one rock per five negatives, the five land-growth steps, sinking, and resurfacing. From point six onward, small activity props come from the typed approved catalogue at one stored prop per point.

Convex uses an idempotent interpretation ledger, exact request comparison, bounded retries, stale-work expiry, and owner-derived reads/writes. The public growth query returns zero-state defaults for untouched owned islands. Onboarding remains outside this scoring path.

The guided questionnaire client now preserves every prompt, input kind, skipped answer, and exact answer before submitting one stable request to that same ledger. It keeps the focused island and calculation mist in place while polling the private receipt, reuses the same request on retry, and reveals the focused changed island only after the server reports `applied`.

## Verification

`npx convex codegen` completed successfully.

`npx tsc --noEmit` completed successfully.

`node --test tests/*.test.ts` passed all 71 tests, including multi-island assignment, exact questionnaire retry identity, bounded terminal retries, absent-interpretation handling, one-point-per-day merging, five-negative-point rocks, twenty-positive/five-rock survival, twenty-positive/twenty-rock sinking, and later resurfacing.

`git diff --check` completed successfully.

The focused questionnaire and growth suite passed all 13 checks, and `npx expo export --platform ios` produced a clean iOS bundle after the client wiring.

The combined Convex backend deployed successfully to the development deployment. A live unauthenticated `activityApplication:listMyGrowth` call returned `UNAUTHENTICATED`. ID-taking endpoints reject malformed IDs before their owner checks, while their handlers use the same server-derived owner boundary. Independent review found two retry/query edge cases; both were fixed, covered by regressions, and accepted on re-review.

## Commit

Pending.
