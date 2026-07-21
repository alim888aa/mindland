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

Let the AI choose semantic visual details from an approved catalogue. Keep asset selection and rendering deterministic so the same stored choice can be reproduced later.

## Design

The main map should feel like a living expandable world with the user’s initial small islands visible together. Territory borders remain subtle. Tapping an island zooms into its territory.

Prioritize legibility, responsive touch targets, smooth motion, and stable frame pacing. Visual richness should degrade gracefully on weaker devices.

Preserve the warm, playful miniature-island direction established by the selected design reference. Ask before making a significant visual change.

Use floating softly glowing text for island names. Map controls, including Check in, account, Summary, and History, share one clear native Liquid Glass family with accessible fallbacks.

During AI conversation, keep the world readable through clear glass without mist. Reserve mist for short calculation and map-change transitions. Stream assistant text with a restrained magical glow and progressive letter reveal, with accessible reduced-motion behavior.
