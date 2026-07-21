# Verify and polish the complete loop

Status: in-progress

Owner: primary-agent

Depends on: Build island history and summary

## Outcome

Connect the phase into one reliable, understandable, and visually coherent mobile experience.

## Done when

The complete demo path works from a clean iPhone install, automated checks pass, device performance is measured, and visual comparison evidence is recorded.

## Result

The signed-in development account now exercises the connected map and daily loop. Its exact Fitness, Sleep, and Study islands render from Convex, the map accepts native pan/pinch/tap/double-tap gestures, guided Sleep questions advance automatically, and Check in slides open and closed over native clear glass.

A real conversational check-in persisted a harmless test message, surfaced its recoverable interruption state, retried idempotently, streamed Luna's response with progressive text, asked whether anything else remained, accepted the separate confirmation, and automatically completed calculation/reveal back to the map without recording an activity.

After the completion-gating repair, the same signed-in account reopened today's completed check-in into an editable follow-up chat with all three owned questionnaire entries restored. Sleep opened its focused questionnaire normally, proving the same-day continuation path without submitting another activity.

A clean disposable Clerk account then completed email/password sign-in, test-code verification, a five-answer Luna onboarding interview, exact creation of Sleep Routine, Strength Training, and Japanese Study, the generated Strength Training questionnaire, activity interpretation, and return to the grown island. The first questionnaire application exposed an internal `sourceMessageIds` field crossing into a narrower Convex mutation validator. Both conversational and structured handoffs now construct the allowed database input explicitly, and the exact retry completed successfully after deployment.

The complete six-minute simulator flow is recorded at `artifacts/mindland-full-flow-demo.mp4`, with a 42 MB mobile copy at `artifacts/mindland-full-flow-demo-small.m4v`.

The phase remains in progress until the land-area growth schedule and Summary/History sheet composition are approved and wired.

## Verification

The Expo 57 iOS development client builds, installs, launches, and reconnects to Metro on the iOS 26.2 simulator. Native verification covered Clerk account entry, Clerk profile/security handoff, exact owned-island rendering, adaptive fog visibility, island territory focus, check-in chat, guided questionnaire focus, and all map gestures without a runtime overlay.

`npx tsc --noEmit` passes. All one hundred twelve repository tests pass under Node's test runner. `git diff --check` passes. The Convex development deployment accepted the updated generation, activity-application, privacy-logging, follow-up, skipped-day-context, and structured-application functions plus the bounded completed-check-in index. Real Luna questionnaire submissions completed for all three generated islands. The assembled video was decoded from start to finish after export.

## Commit

Pending.
