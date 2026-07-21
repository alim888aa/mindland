# Fix onboarding stream feedback

Status: in-progress

Owner: onboarding-stream-agent

Depends on: Connect the onboarding shell to Convex

## Outcome

Assistant words visibly stream into the transcript, and the typing indicator disappears as soon as response text is visible instead of lingering while hidden discovery work finishes.

## Done when

The client distinguishes waiting for the first token, receiving visible text, and server-side post-processing. The dots appear only before visible assistant text, streamed parts update incrementally, the composer remains protected from overlapping turns, and interrupted generation remains retryable.

## Result

The onboarding action now uses the Convex Agent's documented asynchronous delta pattern: it returns from `streamText` immediately, saves word-sized deltas through Convex, and keeps the action alive by consuming the model stream once. The client smooths the current assistant reply as those deltas arrive, so even a fast short response visibly builds instead of appearing in one block.

The typing dots now describe only the wait before the first visible assistant character. They disappear when that character is rendered, while the composer stays locked until discovery extraction and completion bookkeeping finish. Existing private thread queries, idempotent submissions, failure state, and retry behavior remain unchanged.

## Verification

Reviewed the installed `@convex-dev/agent` 0.6.4 streaming implementation and the official Convex Agent streaming guide. A focused strict TypeScript check passed for the container and generation action in the fast local mirror. Prettier also passed for both changed source files. Confirmed the owned files contain no direct `useEffect`, `useMemo`, or `useCallback` usage.

## Commit

Pending.
