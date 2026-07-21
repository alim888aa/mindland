# ADR 0011: Reveal islands through calm mist onboarding

Status: accepted

Date: 2026-07-18

## Context

The first interview should feel connected to the world it is creating without making the conversation hard to read or revealing a finished map all at once.

## Decision

Give the onboarding AI a neutral, calm-friend voice. Cover the live island world with one edge-to-edge Liquid Glass chat veil, so the transcript sits inside the material while the islands remain visible as blurred colorful shapes behind it. Show a numberless Liquid Glass progress control at the top and a Liquid Glass composer at the bottom. Let the AI decide how far progress advances as its understanding improves, while preventing backward movement. Keep the candidates' normal topic names hidden until the reveal. Let the AI summarize its understanding for correction through the same chat, then show a final Create my map button. Tapping it dissolves the full glass veil and cloud-like mist before revealing the sharp islands and their names.

Use Expo 57 native regular Liquid Glass for the full-screen veil and compact controls. Keep the transcript on the shared full-screen material instead of making every message its own glass card. Animate native glass through its `glassEffectStyle` transition and create the cloud breakup as separate lightweight overlay layers. Respect Reduce Transparency and Reduce Motion with an opaque surface and a short static crossfade.

## Reason

The user chose this presentation because the map can visibly emerge during the conversation and the final reveal becomes part of the product story. One shared full-screen material preserves transcript readability and keeps the number of expensive compositing layers bounded while matching the approved wireframe.

## Consequences

The onboarding world and chat need coordinated visual states. V1 can use `expo-glass-effect`; SwiftUI or a custom native module is unnecessary unless later designs require complex glass-shape morphing. The final effect must be profiled with the live WebGPU canvas on a real iPhone.

## Sources

[Apple: Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/)

[Expo SDK 57: GlassEffect](https://docs.expo.dev/versions/v57.0.0/sdk/glass-effect/)

[Apple: Applying Liquid Glass to custom views](https://developer.apple.com/documentation/SwiftUI/Applying-Liquid-Glass-to-custom-views)
