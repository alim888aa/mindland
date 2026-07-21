# Integrate and verify onboarding in the app

Status: completed

Owner: primary-agent

Depends on: Build the persistent streaming interview backend; Build the liquid-glass interview shell; Extract island discovery and interview progress; Connect the onboarding shell to Convex

## Outcome

Show the real onboarding interview for a signed-in user, keep the live island world behind its mist, transition to the map after reveal, and verify one complete GPT-5.6 Luna conversation in the iPhone simulator.

## Done when

The signed-in app starts or resumes the private interview, streams real Luna replies, restores saved messages, advances the AI-controlled progress bar, hides names before reveal, and reaches the map after Create my map. Manual verification uses at most three fresh onboarding interviews.

## Result

Connected signed-in users to the real Convex onboarding controller over the live island world. Unfinished and ready-to-create interviews now open the mist conversation, while a revealed interview transitions to the map.

Added a development-only email/password screen because Clerk's native development sheet rendered blank after the simulator session expired. The production path continues to use Clerk's native account UI.

The manual run exposed two follow-up gaps for initial-island creation: the extractor produced seven overly specific candidates, and the revealed map still uses the four fixed prototype labels. The shared-mist overlay also used shorthand positioning that rendered over only part of the simulator; it now uses React Native's full-screen absolute-fill style.

## Verification

Fresh onboarding interviews used: 1 of 3.

The iPhone simulator completed one real GPT-5.6 Luna interview with five user answers. Replies streamed visibly, the AI-controlled bar advanced from zero to 100 without moving backward, the final reply summarized the understood goals and invited correction, and Create my map became available.

The app was closed to the Home screen and reopened before reveal. The complete transcript, full progress, summary, and Create my map action resumed from Convex. After reveal, the interview record was `revealed`, its generation state was `idle`, and all five submission records were `completed` with one attempt and no error.

The private candidates were `Sleep`, `Running`, `Nutrition`, `Work`, `Japanese`, `Friends`, and `Family`. They remained absent from the visible transcript before reveal. The immediate transition reached the map, while dynamic labels and the mist-dissolve animation remain in the next island-creation work.

An independent reviewer found that the map responder could steal long transcript drags, development sign-in ignored finalization errors, and stalled server actions could leave the UI waiting forever. Onboarding now disables world navigation, development sign-in surfaces finalization errors, and guarded Convex watchdogs make stale replies retryable. The final re-review found all three fixes clean and found no false-failure race in the watchdog guards.

## Commit

Pending.
