# Build the persistent streaming interview backend

Status: completed

Owner: convex-interview-agent

Depends on: Build the Clerk and Convex foundation

## Outcome

Create the private Convex foundation for a resumable onboarding interview. Every user and assistant message is durable, GPT-5.6 Luna replies stream through a Convex action and the AI SDK, retries do not duplicate answers, and only the signed-in owner can read or continue an interview.

## Done when

The Convex Agent component is mounted, the onboarding interview and submission records are defined, authenticated functions enforce ownership, a saved opener can start a thread, answer submission is idempotent, an internal action streams and persists the assistant reply, and the public interview state hides candidate island names before reveal. Type checking and the relevant Convex verification pass.

## Result

Mounted the Convex Agent component and added private interview and submission records. The backend now creates or resumes one owner-scoped interview, saves the opening assistant question, stores every user answer, streams GPT-5.6 Luna replies through an internal action, and persists the final assistant response.

Each client request ID is idempotent and bound to the submitted text. Failed or stale sends keep their original prompt message and can be retried without duplicating the user's answer. Attempt numbers prevent an older action or discovery result from overwriting a newer retry. Public state and message queries verify the Clerk identity against the interview owner. Candidate counts can be returned during discovery while candidate names remain empty until the reveal transition.

Queued and streaming attempts now schedule guarded server-side watchdogs. If the same active attempt remains stuck for two minutes before starting or fifteen minutes while streaming, Convex marks it failed so the existing retry action becomes reachable even when the phone was closed.

Discovery extraction is handled by the next interview integration slice. `applyDiscoveryState` provides its private persistence boundary.

## Verification

Inspected the installed `@convex-dev/agent` 0.6.4 and `@ai-sdk/openai` 4.0.16 types before implementation. Confirmed the Responses API model factory, low reasoning option, stream-delta APIs, saved-message APIs, and UI message synchronization shape against installed types and official guidance.

Focused strict TypeScript passed from the fast local mirror. `npx convex dev --once` regenerated the API bindings and deployed the component, schema, queries, mutations, and actions to `adventurous-zebra-515`.

One real simulator interview stored five user submissions. Each finished with one attempt, `completed` status, and no error. Closing and reopening the app restored the same saved transcript and ready-to-create state.

The watchdog deployment and focused strict TypeScript check passed after the live run.

## Commit

Pending.
