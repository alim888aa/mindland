# Render the full-screen Liquid Glass interview

Status: completed

Owner: onboarding-glass-agent

Depends on: Build the liquid-glass interview shell

## Outcome

Match the approved onboarding wireframe with one edge-to-edge Liquid Glass chat veil over the live four-island world. The islands remain visibly colorful but mysterious through the material, while the transcript, progress control, and composer stay readable.

## Done when

The full chat background is real Expo Liquid Glass on supported iOS 26 devices, uses one performant blur fallback, reveals recognizable island color and placement behind the material, keeps the transcript on the shared surface, respects reduced transparency, and matches the supplied 390-point mobile composition.

## Result

The onboarding interview now places one native Expo 57 `GlassView` across the entire live island world instead of covering it with an opaque mist wash. Its pale tint and four lightweight cloud patches preserve the calm haze while allowing the colorful island forms and their positions to remain recognizable behind the transcript.

The progress control, reveal action, and composer use compact native clear-glass chrome above that veil, and visible sparkle and send controls use SF Symbols. Unsupported devices keep one full-screen blur strategy with lightweight translucent control fills. An optional `isRevealing` presentation state changes the native glass style to `none` with Expo's supported 850 ms transition, fades the interview chrome, moves the mist patches outward, and removes the disappearing controls from VoiceOver. The blur and solid reduced-transparency fallbacks clear over the same duration.

## Verification

`prettier` formatted the component and task documentation.

A focused strict TypeScript check passed against `src/components/onboarding-interview.tsx` in the fast local development mirror.

The native reveal follows Expo 57's documented GlassEffect workaround: `glassEffectStyle` performs the transition without applying opacity to the `GlassView` or one of its parents.

A separate reviewer found three issues in the first pass: flat control chrome, reveal accessibility, and waiting dots overlapping visible streamed text. All three were corrected before the final focused checks passed.

## Commit

Pending.
