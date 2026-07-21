# Carry recent check-in context forward

Status: completed

Owner: recent-checkin-context-agent

Depends on: Build the conversational check-in agent

## Outcome

Give each fresh daily AI chat continuity without showing yesterday's transcript in today's conversation.

## Requested direction

Every new local day keeps its own fresh visible thread. When an earlier completed check-in exists, the server privately supplies the most recent completed check-in transcript even if the user skipped one or more days. Bound the carry-over to the latest forty saved user and assistant messages. Tell Luna clearly that the transcript is background context and that earlier activities must not be treated or scored as events from today.

## Done when

The previous transcript remains owner-private, the current visible thread contains only today's messages, the agent receives the latest completed check-in after skipped days, old activities cannot leak into today's interpretation, and automated tests cover selection, prompt boundaries, and no-history behavior.

## Verification

The selection policy uses a bounded owner/status/completion-time index lookup, excludes the current thread, requires a genuinely earlier completion, and chooses the latest completion even across skipped days. Transcript loading examines at most two hundred records and carries at most forty successful nonempty user and assistant messages. If private history cannot load, today's reply continues without it. The system prompt labels history as untrusted background and forbids treating earlier activity as today. Activity interpretation remains scoped to the current thread.

TypeScript strict checking, the twenty-one focused check-in backend tests, the full one-hundred-six-test repository suite, and `git diff --check` pass. A child review found a spoofable transcript delimiter; the payload now escapes angle brackets, and an adversarial regression test covers it. Final review then bounded both database and transcript history reads and made historical context optional so it cannot break today's conversation. The reviewed schema and functions are deployed to the Convex development environment.

## Commit

Pending.
