# Polish map motion, territories, and chrome

Status: completed

Owner: map-polish-agent

Depends on: Fix runtime gestures and territory shape

## Outcome

Make map movement feel calm and intentional while bringing map labels and controls into the same Liquid Glass visual language as the conversation surfaces.

## Requested direction

Keep camera zoom stable while panning instead of pulling back into an awkward zoomed-out view. Slow the island-to-overview transition slightly. Enlarge the equal territory polygons. Replace wooden island-name boards, the current Check in capsule, and other visually disconnected map chrome with a coherent glass treatment.

Starting a drag cancels any in-flight camera transition and preserves the exact currently displayed zoom. Increase territory footprint by roughly 25% while keeping the current starting-island land footprint unchanged; later growth may still approach the 80% territory cap.

Make the island-to-overview transition roughly 200 milliseconds longer than the current prototype. Replace wooden boards with floating island names that carry a soft glow. Use one clear native Liquid Glass family for Check in, account, Summary, and History controls.

## Open decisions

No remaining product decisions block this task.

## Done when

Pan preserves the chosen zoom, island exit feels smooth, territories retain equal deterministic geometry at the approved larger size, and map controls feel visually connected to the lagoon without compromising label legibility.

## Result

Pan now freezes the camera at its exact rendered pose before direct movement, including the visible zoom. Island entry retains its existing response rate while returning to overview adds approximately 200 milliseconds to reach one-percent error. Generic territory layout scales cell footprints by 1.25 without changing island land radius, starter scale, or the 0.8 maximum scale. Floating softly glowing names replace wooden boards, and Check in, account, Summary, and History now share a clear native Liquid Glass surface with an accessible opaque fallback.

## Verification

Passed `npx tsc --noEmit`.

Passed `node --import tsx --test tests/map-camera-controller.test.ts tests/world-layout.test.ts`, including exact camera-transition cancellation, split entry/overview pacing, deterministic equal territories for three through twenty islands, enlarged footprint math, shared-edge connectivity, related-island adjacency, and neutral-ocean reserve coverage.

Passed `git diff --check` for the owned implementation and task files.

Native iOS verification drove real one-finger pan, continuous pinch zoom, island tap focus, double-tap home, questionnaire focus and overview return. The camera stayed stable, no gesture exception appeared, and adaptive scene fog kept the small starter terrain visible at the farther portrait overview distance.

Renderer startup, render-loop, and asynchronous GPU-device loss now share a generation-scoped cleanup and retry path. Stale callbacks cannot touch a rebuilt world, and a calm retry surface replaces a permanently blank map. The final clean simulator restart rendered Fitness, Sleep, and Study normally.

## Commit

Pending.
