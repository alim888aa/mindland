# Phase 1: Initial loop

## Destination

An iPhone user can sign in with Apple or email/password, complete an AI interview, receive their first small islands, record a later day through either conversational or structured check-in, see the islands grow or gain rocks, and inspect a useful history or summary.

## Included

This phase covers Clerk accounts, Convex persistence, the first interview, initial island creation and reveal, an expandable two-dimensional map, AI check-ins, structured island check-ins, saved AI conversations, activity records, land and feature growth, rocks, sinking and resurfacing rules, island history, and a coherent end-to-end demo.

## Outside this phase

Android support, AI conversation-history browsing, archipelagos, user-purchased decorations, social features, production monetization, and a broad integrations ecosystem remain for later phases.

## Finish line

The complete loop works on an iPhone build with a real account and persistent user data in Convex. The important product rules have automated tests, and the full demo path has been manually verified.

## Progress

The 3D map now uses variable world coordinates, small sparse starting islands, generated territories, camera-following labels, an expandable perimeter, and reachable bounded two-axis movement. The native daily check-in shell has local chat and questionnaire interactions. Lagoon Immersion is selected and now has a measured rendering and fallback policy. Native Clerk email/password sign-in, persisted sessions, real Convex JWT exchange, and two-user private record isolation are verified. Apple reaches its native system prompt, with the final provider test waiting on an Apple Account and production developer membership. The final life-map records, AI interpretation, and scored map changes remain to be built.

## Tasks

[Build the Clerk and Convex foundation](tasks/00-build-clerk-and-convex-foundation.md)

[Verify the private Convex foundation](tasks/00a-verify-private-convex-foundation.md)

[Verify the Clerk development instance](tasks/00b-verify-clerk-development-instance.md)

[Verify native Clerk end to end](tasks/00c-verify-native-clerk-end-to-end.md)

[Define the life-map domain](tasks/01-define-life-map-domain.md)

[Build the initial AI interview](tasks/02-build-initial-ai-interview.md)

[Create initial islands](tasks/03-create-initial-islands.md)

[Build the expandable world map](tasks/03a-build-expandable-world-map.md)

[Fix map navigation and starting growth](tasks/03b-fix-map-navigation-and-starting-growth.md)

[Build daily check-ins](tasks/04-build-daily-check-ins.md)

[Prototype the native check-in shell](tasks/04a-prototype-native-check-in-shell.md)

[Research the iOS visual direction](tasks/04b-research-ios-visual-direction.md)

[Research Lagoon Immersion performance](tasks/04c-research-lagoon-performance.md)

[Apply growth, rocks, sinking, and resurfacing](tasks/05-apply-island-change.md)

[Build island history and summary](tasks/06-build-island-history.md)

[Verify and polish the complete loop](tasks/07-verify-demo-loop.md)

[Review codebase architecture](tasks/08-review-codebase-architecture.md)

[Publish a readable architecture review](tasks/08a-publish-readable-architecture-review.md)

## Open questions

The final Convex life-map schema, AI response format, sinking and resurfacing formulas, map expansion limits, and remaining screen details still need user decisions. The privacy boundary is decided: every user-owned record is scoped to the verified Clerk identity on the Convex server.
