# ADR 0013: Shared territory clusters and real map zoom

Status: accepted

Date: 2026-07-20

## Context

The first generated territories extend to the world perimeter, which can leave a small island visually stranded inside a very large cell. The map also needs camera gestures that remain useful as the world gains more islands.

## Decision

Build territories as equal-sized shared polygon cells with visually softened corners. Internal territory edges remain shared. The claimed territory cluster ends before the world perimeter, leaving roughly one starting-island width of neutral ocean for future islands.

Settle each island toward the visual center of its territory without changing its relationships. Starter shoreline occupies roughly 30% of the enlarged territory and may grow to at most 80%; territory size does not grow with the land. The home camera targets the island cluster's own center, keeps the smallest visible territory at least 30% of screen width, and permits outer cells to crop beyond the viewport rather than shrinking the full cluster.

Support continuous focal-point pinch zoom from the full world perimeter to an island close-up. Give each visible island landform a direct circular touch target that scales with the rendered land and smoothly centers that island. Keep island names tappable, leave empty territory water available for navigation, and keep Check in visible during focus. Double-tapping returns to a home frame containing up to five central islands, with nearby islands allowed to peek at the edges. Labels scale with the world and disappear when the view becomes crowded.

Beginning a pan cancels any in-flight camera transition and preserves the exact camera pose and zoom visible at the moment of touch. Expand the invisible navigation boundary to contain the centered home camera footprint, preventing the first pan update from clamping it back to the older high-screen framing. A recognized pan wins over both tap recognizers.

Make the island-to-overview transition roughly 200 milliseconds longer than the prototype while leaving island-entry focus at its current pace. Render island names as floating softly glowing text. Use a shared clear native Liquid Glass family for map controls.

Use Expo's compatible `react-native-gesture-handler` 2.32 release for native simultaneous pan, pinch, and double-tap recognition. Keep camera math in a renderer-independent controller so focal zoom, bounds, and transitions can be tested without React or WebGPU.

## Reason

This keeps the map legible, leaves visible space for discovery, and lets growth change the island without constantly rearranging territorial ownership. Real camera zoom also gives the same world a useful overview and close-up interaction.

## Consequences

Territory generation must separate the claimed cluster boundary from the larger navigation perimeter. The navigation perimeter may expand beyond the generated world bounds to contain an approved home camera footprint. The layout needs a deterministic centering pass, and the camera needs zoom-aware pan limits, focal-point anchoring, animated home and island poses, and density-aware labels. Gesture Handler becomes a native dependency, so changing it requires a rebuilt development client rather than only a Metro reload.
