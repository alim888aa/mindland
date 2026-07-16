# Mindland standards

Changes to this file require user approval.

## Coding

Use TypeScript and preserve strict type checking. Prefer clear names and small focused modules. Add abstractions only after the code shows a repeated need.

Never use `useEffect`, `useMemo`, or `useCallback`.

Read the Expo 57 documentation at https://docs.expo.dev/versions/v57.0.0/ before writing Expo code. Ask before adding or replacing a dependency.

Test important product rules, especially island assignment, growth, rocks, sinking, resurfacing, and activity migration. Verify user-facing work on a real simulator or device when possible.

## Architecture

Keep product rules independent from the 3D renderer and screen components. An activity should update plain domain data first; the visual world should render that data afterward.

Keep AI interpretation separate from confirmed user history. Preserve the user’s original message alongside structured metadata so classifications can be explained or corrected later.

Use one source of truth for islands, activities, nodes, rocks, and their relationships. Ask the user before choosing persistence, backend, authentication, or AI-provider architecture.

## Design

The main map should feel like a living archipelago with four islands visible in the initial viewport. Territory borders remain subtle. Tapping an island zooms into its territory.

Prioritize legibility, responsive touch targets, smooth motion, and stable frame pacing. Visual richness should degrade gracefully on weaker devices.

Preserve the warm, playful miniature-island direction established by the selected design reference. Ask before making a significant visual change.
