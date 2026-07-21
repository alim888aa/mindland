# Animate the onboarding mist reveal

Status: completed

Owner: primary-agent

Depends on: Render the full-screen Liquid Glass interview; Create initial islands

## Outcome

Create my map clears the glass and cloud-like mist before the app hands control to the revealed island map.

## Done when

The final button starts one calm transition, disables repeated taps, animates native glass toward no effect, breaks the remaining mist into lightweight fading cloud layers, then completes the private reveal mutation and opens the sharp map. Reduced Motion and reduced transparency receive a short readable crossfade.

## Result

The shared onboarding and check-in backdrop uses Expo 57's native `GlassView` transition plus four lightweight cloud layers. Frame-by-frame simulator analysis found that full-screen native glass still disappeared in one frame and that live growth could rebuild the WebGPU world underneath it for a variable amount of time.

The foreground now fades during calculation, a standard translucent mist veil provides the reliable visible dissolve, and the WebGPU map publishes a first-frame-ready signal. Both onboarding and check-in wait for the changed world's exact key to present its first frame before clearing the mist, so a fixed timing guess cannot reveal a blank ocean.

## Verification

The shared conversation veil now remains softly visible for text contrast, while the final reveal fades it completely over 200 ms. Reduced Motion keeps a shorter path. TypeScript, all one hundred thirteen repository tests, and `git diff --check` pass.

A fresh onboarding recording was intentionally skipped because the agreed three-run clean-onboarding limit had been reached and the user chose to record the submission video. The onboarding path now uses the same verified renderer-ready gate as check-in.

## Commit

Pending.
