# Build the liquid-glass interview shell

Status: completed

Owner: onboarding-ui-agent

Depends on: Build the initial AI interview

## Outcome

Create the native iPhone onboarding conversation surface over the live island world. The world remains visible as a mysterious blurred silhouette, the conversation reads clearly on calm liquid glass, and the screen supports streaming text, a simple progress bar, message input, retry, and the final Create my map action without revealing island names early.

## Done when

The presentational component has clear typed props, uses Expo liquid glass with a blur fallback, respects safe areas and keyboard movement, exposes accessible controls, keeps the transcript readable, shows a bar without fake precision, and avoids rendering candidate names. It does not own Convex calls or change the existing map and app integration files.

## Result

Added a typed presentational onboarding overlay that keeps the live world beneath one readable mist layer. It uses native iOS Liquid Glass for the compact progress, final action, and composer controls when available, with one shared BlurView and translucent control surfaces as the fallback. The shell includes a calm transcript, stream state, retry state, accessible progress bar, correction-ready composer, and final Create my map action. It accepts no candidate-island data or names.

## Verification

`npx tsc --noEmit` passed. A separate code-review agent checked the component against the task, ADR 0011, SDK 57 glass behavior, accessibility, streaming performance, candidate-name privacy, and forbidden hooks. Its valid findings were addressed: the composer stays available beside the final action, streamed auto-scroll follows only when the reader is near the bottom, fallback devices use one blur layer, and decorative marks are hidden from VoiceOver.

## Commit

Pending.
