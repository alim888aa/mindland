# Render growth, rocks, sinking, and resurfacing

Status: completed

Owner: growth-renderer-agent

Depends on: Apply growth, rocks, sinking, and resurfacing

## Outcome

Make the persisted island-growth ledger visible in the 3D world without moving product arithmetic into the renderer.

## Approved direction

New islands remain small and bare. Positive details and five-point milestones add deterministic vegetation, paths, objects, and larger terrain features from the stored catalogue. Visible rocks reflect the stored rock count. A sunk island remains visible as a reminder and can rise again when its stored condition changes.

The renderer consumes stored counters and detail keys. It does not recalculate daily points, negative points, rocks, or survival.

## Open decision

The user still needs to confirm how many five-point growth steps take land from its 30% starter footprint to the 80% cap.

## Done when

The owned-world query drives stable land/detail/rock/sunk visuals, zero-growth islands stay bare, the renderer degrades safely with many stored details, and focused automated tests cover the data-to-world mapping.

## Result

The app now joins the private growth ledger to the exact owned-island rows by island ID. Runtime island data carries the stored positive and negative totals, rocks, growth steps, survival state, and both visual-detail lists without redoing any domain arithmetic.

The scene deterministically places the stored small props and legacy milestone features. A demo-safe per-island level-of-detail cap allows twenty-four small props and eight rock meshes without letting growth elsewhere remove an established island's visuals. Larger stored rock totals make the capped boulders feel heavier, while every full numeric value remains in memory. Untouched islands remain small and bare. Sunk islands remain partially visible at the waterline with a calmer desaturated treatment; a later query update rebuilds only the WebGPU scene so they can visibly resurface without closing an open check-in.

Land now moves through five fixed steps: 30%, 40%, 50%, 60%, 70%, then the 80% cap. Context-fitting props begin at point six and render one per later stored point. Legacy pre-cap detail rows stay hidden so existing accounts follow the same visual rule without a migration.

## Verification

`node --test tests/island-growth-rendering.test.ts tests/dynamic-island-lifecycle.test.ts` passed all twelve focused checks.

`node --test tests/*.test.ts` passed all eighty-eight repository tests, including map-camera and gesture regressions.

TypeScript strict checking and `git diff --check` pass. Independent review found and drove fixes for two performance/lifecycle risks: growth refreshes no longer close an open check-in, and fixed level-of-detail caps no longer let activity on one island erase another island's visible history. Final re-review is clean.

TypeScript strict checking and all 107 repository tests pass. The updated Convex functions deployed to the development environment, and the native app bundled and opened in the simulator without a runtime error. A live multi-day visual progression remains for the user-led demo check.

## Commit

Pending.
