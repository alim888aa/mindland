# Prototype the native check-in shell

Status: completed

Owner: primary agent

Parent: Build daily check-ins

## Outcome

Replace the original static check-in card with a native, AI Elements-inspired conversation and a representative full-screen island questionnaire. Set up NativeWind for two-dimensional product UI without changing the 3D island renderer.

## Boundaries

This slice uses local sample data and interactions. AI streaming, generated questionnaires, persistence, activity scoring, and island animation remain in their phase tasks.

## Done when

The Check in button opens a usable native conversation, island chips open a three-to-seven question flow, answers advance automatically, Skip works, completing the sample flow returns to the selected island, and the experience is verified on an iPhone simulator.

## Result

Set up NativeWind 5 with Tailwind CSS 4 while preserving the Three WebGPU Metro resolver. Replaced the static check-in card with an AI Elements-inspired native chat, four island questionnaire samples using AI-selectable input shapes, automatic choice advance, Skip, scroll-safe layouts, accessible touch targets, and completion that returns to the selected island. Restored `expo-gl` as an explicit dependency because the existing iOS Pods project already requires it.

## Verification

`npx expo export --platform ios --output-dir /tmp/mindland-checkin-final` produced a 4.4 MB Hermes bundle.

`npx expo run:ios --no-install --device "Mindland iPhone 16"` completed with Build Succeeded and installed the app on the iOS 26.2 simulator.

Manual simulator verification covered opening Check in, sending by the composer button and Return key, opening Health, automatic choice advance, Skip, a written answer, and returning to the zoomed Health island. A separate reviewer checked the diff; its touch-target, safe-area, scrolling, submit behavior, and task-wording findings were addressed.

The full TypeScript checker remains impractically slow on the repository's existing WebGPU type graph and was stopped without a result. Metro bundling and the native Xcode build both passed.

## Commit

Pending.
