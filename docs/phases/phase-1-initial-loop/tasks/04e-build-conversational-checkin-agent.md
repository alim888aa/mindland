# Build the conversational check-in agent

Status: in-progress

Owner: checkin-agent-backend-agent

Parent: Build daily check-ins

## Outcome

Persist a private daily check-in conversation in Convex and let Luna calmly interview the user about the day. The agent asks whether there is anything else to add and returns a typed completion signal only after the user confirms they are finished.

## Boundaries

This slice owns the private conversation, streaming response, and completion decision. Activity scoring, daily merge rules, nodes, rocks, and terrain changes remain in the following domain slice.

## Done when

The signed-in app can start or resume today's private conversation, stream each assistant reply, preserve messages, reject cross-user access, ask the final confirmation conversationally, and automatically return a typed `complete` state after the user agrees they are done.

## Result

Added one authenticated, owner-scoped Convex Agent thread per user-local calendar day. The backend saves every raw user and assistant message, streams Luna replies through Convex deltas, resumes today's state, and supports idempotent submit and retry receipts.

The next local calendar day creates a fresh visible thread. Prior transcripts remain private and stored. Passing the previous day's transcript into the new agent as hidden context is approved; whether a skipped day falls back to the most recent completed check-in is awaiting the user's choice.

Each generation loads every current owned island from Convex and gives Luna the island names and purposes, allowing one activity to relate naturally to several islands. A private typed classifier advances the conversation through `collecting`, `awaitingConfirmation`, and `complete`. The state machine requires a separate user confirmation after the agent asks whether there is anything else, even if a model tries to finish early. Scoring and map changes remain untouched.

Idempotency compares the exact normalized request text stored with each new submission. Legacy development rows that contain only the former short hash are safely refused and require a new request identifier. A stale active stream is aborted through the Agent component before retrying; the replacement queues from the old action's failure exit, after that action has stopped writing. Failed streamed messages and aborted deltas are excluded from the public message list.

Every model request also owns an eight-minute server lease, which expires before the fifteen-minute stale-stream threshold. This closes the pre-first-chunk gap where no Agent stream row exists to abort: the request signal stops the provider, the old action records a conclusive failure, and only then may a retry queue.

The first check-in opened for a local day remains bound to its starting time zone. A later `getToday` or `startOrResumeToday` call from another zone returns that still-current row and reports `usesRequestedTimeZone: false`, avoiding overlapping day threads while travelling. After the bound zone's calendar day ends, date lookup includes both the requested local date and time zone, so westward travel can open the repeated calendar date without returning a closed row from the earlier zone.

The UI-facing API is `checkIn.startOrResumeToday`, `checkIn.getToday`, `checkIn.listThreadMessages`, `checkIn.submitMessage`, `checkIn.retryMessage`, and `checkIn.getSubmission`.

Completion reveal now waits for the owner-scoped activity application to reach `applied`. While interpretation runs, the calculation mist remains visible and closing is held; a failed interpretation restores the conversation with a calm retry action. Each completion cycle has its own idempotency key, so a user can reopen the same local day, continue the saved conversation or choose a guided questionnaire, and add more historical activities. Existing daily summaries still enforce the approved one-positive-point and one-negative-point caps per island per day.

## Verification

The focused backend suite passes ten checks, including typed completion, the separate confirmation turn, exact idempotent request matching, owner isolation, multi-island prompt context, user-local date boundaries, stable time-zone binding, repeated-date travel, abort-before-retry policy, and pre-stream model-lease expiry.

The combined repository suite passes 71 tests. `npx tsc --noEmit` and `git diff --check` pass. Official `npx convex codegen` succeeded, then `npx convex dev --once` deployed the reviewed schema and functions to `adventurous-zebra-515`. Unauthenticated live calls to the private check-in and growth APIs reached the updated functions and were rejected with the expected `UNAUTHENTICATED` Convex error.

An independent final review found no actionable ownership, retry-overlap, model-lease, repeated-date, API, or post-completion scheduling issue.

The follow-up and application-status update passes strict TypeScript checking and the focused check-in, interpretation-selection, and growth-policy suite. The complete repository suite now passes all ninety-eight tests, including sanitized AI logging, single-use follow-up resume, timer cleanup, WebGPU recovery, and small-world layout invariants. A signed-in iOS simulator reopen of the completed local day restored an editable AI composer plus Sleep, Fitness, and Study questionnaire entries; opening Sleep correctly focused its island and rendered the guided flow.

## Commit

Pending.
