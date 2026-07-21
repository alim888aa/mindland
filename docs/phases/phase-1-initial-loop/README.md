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

The 3D map now renders the signed-in user's materialized islands with variable world coordinates, small sparse land, equal generated territories, camera-following labels, an invisible expandable perimeter, and reachable bounded two-axis movement. Lagoon Immersion is selected and has a bounded renderer policy. Native Clerk email/password sign-in, fresh account creation, email-code verification, persisted sessions, real Convex JWT exchange, two-user private isolation, and the custom Liquid Glass account entry are verified. Apple reaches its native system prompt, with the final provider test waiting on an Apple Account and production developer membership.

The map camera now supports continuous native pan, moving-midpoint focal pinch zoom, smooth whole-territory focus, and double-tap home framing. The repeated native gesture callback crash has been removed. Equal shared hexagonal territory cells stay connected in a radial cluster as the world grows, with automated invariants covering three through twenty islands. The home frame keeps the smallest visible territory at least 30% of screen width and lets outer cells extend beyond the viewport. Their lines remain visible while the harsh outer world border has been removed. Starter shoreline is bare at 30% of its stable territory and can later grow to an 80% cap. The visual-only WebGPU canvas leaves territory taps to the parent map gesture layer. Check in remains available during island focus. The map-level avatar opens Mindland's Liquid Glass account sheet, which hands profile and security changes to Clerk's maintained native surface. The signed-in iOS simulator holds 60 FPS for both UI and JavaScript after settling.

The persistent Luna onboarding interview is deployed and connected to the signed-in app. Real simulator interviews proved streaming, private saved history, adaptive forward-only progress, interruption resume, structured discovery, dynamic island materialization, and reveal. Daily check-in shares onboarding's full-screen Liquid Glass and mist shell, focuses a chosen island for its guided questionnaire, streams a real private Luna conversation, requires a separate “anything else?” confirmation, and keeps calculation mist visible until the map update is applied. Same-day follow-ups reopen chat and questionnaires while retaining daily score caps. Each later local day receives a fresh stored thread while Luna privately receives up to forty messages from the most recent earlier completed check-in, including across skipped days. Earlier activities are explicitly treated as background and never scored as today. Luna now generates and stores all island-specific questionnaires during map creation, with a private existing-account backfill and complete fallback. The private activity ledger, daily scoring, rocks, sinking, resurfacing, context-fitting visual details, and bounded growth rendering are connected. The first five positive points grow land from 30% to 80%, while every later point adds one contextual prop. Focused islands now open one draggable tabbed Liquid Glass sheet backed by the private Summary and History read models. Daily history expands inline to show its exact saved sources.

## Tasks

[Build the Clerk and Convex foundation](tasks/00-build-clerk-and-convex-foundation.md)

[Verify the private Convex foundation](tasks/00a-verify-private-convex-foundation.md)

[Verify the Clerk development instance](tasks/00b-verify-clerk-development-instance.md)

[Verify native Clerk end to end](tasks/00c-verify-native-clerk-end-to-end.md)

[Support fresh Clerk account creation](tasks/00d-support-fresh-clerk-account-creation.md)

[Add account management entry](tasks/00e-add-account-management-entry.md)

[Redesign auth and account surfaces](tasks/00f-redesign-auth-and-account-surfaces.md)

[Define the life-map domain](tasks/01-define-life-map-domain.md)

[Build the initial AI interview](tasks/02-build-initial-ai-interview.md)

[Build the persistent streaming interview backend](tasks/02a-build-persistent-streaming-interview-backend.md)

[Build the liquid-glass interview shell](tasks/02b-build-liquid-glass-interview-shell.md)

[Extract island discovery and interview progress](tasks/02c-extract-island-discovery-and-progress.md)

[Connect the onboarding shell to Convex](tasks/02d-connect-onboarding-shell-to-convex.md)

[Integrate and verify onboarding in the app](tasks/02e-integrate-and-verify-onboarding.md)

[Render the full-screen Liquid Glass interview](tasks/02f-render-full-screen-liquid-glass-mist.md)

[Fix onboarding stream feedback](tasks/02g-fix-onboarding-stream-feedback.md)

[Polish interview and check-in presentation](tasks/02h-polish-interview-and-checkin-presentation.md)

[Create initial islands](tasks/03-create-initial-islands.md)

[Build the expandable world map](tasks/03a-build-expandable-world-map.md)

[Fix map navigation and starting growth](tasks/03b-fix-map-navigation-and-starting-growth.md)

[Animate the onboarding mist reveal](tasks/03c-animate-onboarding-mist-reveal.md)

[Add real map camera and compact territories](tasks/03d-add-real-map-camera-and-compact-territories.md)

[Build the map camera controller](tasks/03d1-build-map-camera-controller.md)

[Fix runtime gestures and territory shape](tasks/03e-fix-runtime-gestures-and-territory-shape.md)

[Connect discovered islands to the world](tasks/03f-connect-discovered-islands-to-the-world.md)

[Materialize discovered islands](tasks/03f1-materialize-discovered-islands.md)

[Render owned islands](tasks/03f2-render-owned-islands.md)

[Use owned islands in check-in](tasks/03f3-use-owned-islands-in-checkin.md)

[Polish map motion, territories, and chrome](tasks/03g-polish-map-motion-territories-and-chrome.md)

[Arrange small worlds in circular clusters](tasks/03h-arrange-small-worlds-in-circular-clusters.md)

[Build daily check-ins](tasks/04-build-daily-check-ins.md)

[Prototype the native check-in shell](tasks/04a-prototype-native-check-in-shell.md)

[Research the iOS visual direction](tasks/04b-research-ios-visual-direction.md)

[Research Lagoon Immersion performance](tasks/04c-research-lagoon-performance.md)

[Unify the daily check-in glass shell](tasks/04d-unify-daily-checkin-glass-shell.md)

[Build the conversational check-in agent](tasks/04e-build-conversational-checkin-agent.md)

[Carry recent check-in context forward](tasks/04f-carry-recent-checkin-context-forward.md)

[Apply growth, rocks, sinking, and resurfacing](tasks/05-apply-island-change.md)

[Render growth, rocks, sinking, and resurfacing](tasks/05a-render-growth-and-rocks.md)

[Build island history and summary](tasks/06-build-island-history.md)

[Verify and polish the complete loop](tasks/07-verify-demo-loop.md)

[Review codebase architecture](tasks/08-review-codebase-architecture.md)

[Publish a readable architecture review](tasks/08a-publish-readable-architecture-review.md)

[Publish the hackathon repository](tasks/09-publish-hackathon-repository.md)

## Open questions

Map expansion limits and remaining physical-device tuning can follow after the demo. The privacy boundary is decided: every user-owned record is scoped to the verified Clerk identity on the Convex server. A fresh daily chat privately receives the most recent completed transcript even after skipped days.
