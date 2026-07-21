# ADR 0010: Use Lagoon Immersion for check-ins

Status: accepted

Date: 2026-07-17

## Context

The first native check-in shell feels visually disconnected from Mindland's living island world. Three current-iOS directions were researched: Shoreline Glass, Lagoon Immersion, and Warm Native Studio.

## Decision

Use Lagoon Immersion. Daily check-in opens as the same full-screen Liquid Glass and mist shell used by onboarding, with the complete map visible beneath it. Its opening chat shows island names as guided-check-in shortcuts alongside the conversational composer. Choosing an island smoothly focuses that island behind the glass and opens its questionnaire. Chat and questionnaires share the shell, while only questionnaires show a numberless progress bar. Completing a check-in clears the glass and mist to reveal the changed island beneath it.

During conversational check-in, the AI asks whether the user has anything else to add. A confirming response begins calculation and the reveal automatically, without requiring a separate completion button.

## Reason

The user chose the direction with the strongest emotional connection between daily reflection and the evolving map.

## Consequences

The implementation needs a measured rendering policy for live 3D, glass, scrolling, keyboard movement, and completion motion. It also needs reduced-motion, reduced-transparency, and lower-performance fallbacks before the visual direction is considered complete.

The initial performance policy keeps one persistent WebGPU canvas with `interactive`, `ambient`, `frozen`, and `reveal` modes. Ambient check-ins begin at 15 fps and 1.0–1.25 pixel ratio, text and keyboard activity freeze the world, and a completed change receives a short 60 fps reveal. Release-device measurements may revise those tuning values.
