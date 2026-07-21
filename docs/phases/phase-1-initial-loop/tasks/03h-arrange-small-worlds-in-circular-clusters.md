# Arrange small worlds in circular clusters

Status: completed

Owner: small-world-layout-agent

Depends on: Polish map motion, territories, and chrome

## Outcome

Make small island groups feel centered and spacious on a portrait screen instead of forming a squeezed horizontal row.

## Requested direction

Three islands form a compact centered triangle with two islands above and one below. Larger worlds continue to grow outward in a ring-like shared-territory cluster while preserving equal territory sizes, related-island adjacency, deterministic placement, and the neutral-ocean reserve.

## Done when

Three runtime islands occupy equal connected territories in the approved triangular composition, camera home framing centers the cluster, layout invariants still pass through twenty islands, and the iPhone simulator shows all three islands without runtime errors.

## Verification

The three-island template now uses three connected equal hex cells in a centered triangle: two cells share the upper row and one sits beneath their midpoint. The existing five-island center-and-four-neighbours star, deterministic related-island placement, equal territory sizing, connected cells, and neutral-ocean reserve remain unchanged. Relationship-aware placement can use only later unassigned slots, so arranging a newly discovered island cannot move an earlier island.

`node --experimental-strip-types --test tests/world-layout.test.ts` passes all 25 layout tests, including the new explicit three-island composition and placement-stability tests plus the existing 3–20 island invariants. `npx tsc --noEmit` and the scoped `git diff --check` pass.

## Commit

Pending.
