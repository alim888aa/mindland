# Render owned islands

Status: in-progress

Owner: dynamic-islands-ui-agent

Parent: Connect discovered islands to the world

Depends on: Materialize discovered islands

## Outcome

Parameterize the world, layout, scene builder, camera, labels, and overlays around the authenticated user's queried Convex islands instead of module-level prototype islands.

## Done when

Variable private islands with stable string IDs render deterministically from one runtime array, preserve camera and territory behavior, and survive restart without falling back to the fixed prototype set.

## Result

Added a deterministic runtime-world factory that turns private Convex island rows into the layout, visual catalogue, territory bounds, stable camera IDs, and renderer input used across the app. The authenticated experience queries `api.islands.listMine`, shows up to all eight unnamed candidate landforms during onboarding, and renders the exact persisted island names after reveal. The WebGPU scene, camera, labels, projection store, and overlays now consume that runtime array; changing its stable key safely rebuilds the scene and releases the previous scene's geometry, materials, textures, and renderer. An empty revealed account stays empty instead of receiving the former four prototype topics, while a guarded owner-checked repair bridge materializes missing rows for legacy revealed or completed interviews.

## Verification

Strict TypeScript passed with `npx tsc --noEmit`. The focused runtime and lifecycle suites cover deterministic ordering, exact Sleep/Study/Fitness names and count, arbitrary IDs, all eight unnamed onboarding previews, no fallback four-island world, legacy-repair eligibility, keyed state ownership, GPU resource disposal exactly once, and abandoned-scene cleanup. The 37-test combined island, layout, lifecycle, and gesture run passed, as did `git diff --check`. Live Convex deployment and simulator verification remain for the primary integration pass.

## Commit

Pending.
