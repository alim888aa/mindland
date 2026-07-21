# Use owned islands in check-in

Status: in-progress

Owner: dynamic-islands-ui-agent

Parent: Connect discovered islands to the world

Depends on: Render owned islands

## Outcome

Use the authenticated user's real islands as conversational context and guided-questionnaire entry points.

## Done when

The island names and IDs shown in daily check-in exactly match the persisted map, questionnaire answers stay associated with the owned island, and no fixed prototype list remains in the flow.

## Result

Daily check-in now receives the same runtime island world as the map. Its island shortcuts, focused title, completion IDs, and guided flows use only the signed-in user's persisted islands. A V1 questionnaire factory adapts three-to-four core questions from each island's stored AI-selected visual theme while including the actual island name and accepting any stable Convex island ID. The runtime world owns the selection and questionnaire state behind its stable key, so an island-list change automatically returns to overview with fresh state while leaving the active onboarding conversation mounted. Closing or completing check-in also clears stale local conversation messages before the next session. Clerk's first name now feeds the opening greeting.

## Verification

Strict TypeScript passed with `npx tsc --noEmit`. The focused runtime test verifies dynamic questionnaire lookup for arbitrary IDs and distinct stored themes, alongside exact dynamic island lists. The lifecycle test verifies keyed ownership resets stale selection without keying the onboarding container. `git diff --check` passed. Live questionnaire interaction and account-specific simulator verification remain for the primary integration pass.

## Commit

Pending.
