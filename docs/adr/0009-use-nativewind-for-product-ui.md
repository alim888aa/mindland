# ADR 0009: Use NativeWind for product UI

Status: accepted

Date: 2026-07-17

## Context

Mindland needs several consistent two-dimensional screens around its custom 3D world, including chat, questionnaires, onboarding, history, and account flows. The user wants the chat to borrow the calm, composable patterns of shadcn-based AI Elements while remaining a native Expo experience.

## Decision

Use NativeWind 5 with Tailwind CSS 4 for ordinary native product screens and shared UI primitives. Recreate useful AI Elements patterns with React Native components rather than importing its web components. Keep the WebGPU island renderer and its overlay free to use direct styles where that better matches rendering and animation needs.

## Reason

This provides a shared visual language for future screens while keeping the custom world renderer independent. AI Elements supplies a design reference, while native controls preserve mobile behavior and accessibility.

## Consequences

NativeWind setup must coexist with the custom Metro resolver for Three WebGPU. Shared wrappers expose `className` to React Native through `react-native-css`. Web-only AI Elements packages are not runtime dependencies.
