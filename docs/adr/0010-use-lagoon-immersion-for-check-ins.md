# ADR 0010: Use Lagoon Immersion for check-ins

Status: accepted

Date: 2026-07-17

## Context

The first native check-in shell feels visually disconnected from Mindland's living island world. Three current-iOS directions were researched: Shoreline Glass, Lagoon Immersion, and Warm Native Studio.

## Decision

Use Lagoon Immersion. A selected island remains visually present behind the check-in conversation or questionnaire. Native glass is reserved for compact controls and the composer, while readable message content sits on a shared mist surface. Completing a check-in reveals the island change beneath it.

## Reason

The user chose the direction with the strongest emotional connection between daily reflection and the evolving map.

## Consequences

The implementation needs a measured rendering policy for live 3D, glass, scrolling, keyboard movement, and completion motion. It also needs reduced-motion, reduced-transparency, and lower-performance fallbacks before the visual direction is considered complete.

The initial performance policy keeps one persistent WebGPU canvas with `interactive`, `ambient`, `frozen`, and `reveal` modes. Ambient check-ins begin at 15 fps and 1.0–1.25 pixel ratio, text and keyboard activity freeze the world, and a completed change receives a short 60 fps reveal. Release-device measurements may revise those tuning values.
