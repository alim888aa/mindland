# Polish interview and check-in presentation

Status: completed

Owner: interview-polish-agent

Depends on: Unify the daily check-in glass shell

## Outcome

Match the approved check-in wireframe and make onboarding and daily conversation feel magical, readable, and visibly connected to the island world.

## Requested direction

Use native Expo Liquid Glass with a pale misted world view during conversation so dark text stays readable while blurred islands remain visible. Thicken the mist while the AI calculates islands, scores, or map changes, then fade it over 0.2 seconds to reveal the result.

Place the first assistant message near the top. Daily check-in greets the signed-in user by first name, shows vertically arranged island questionnaire links with chevrons, keeps a glass composer at the bottom, and omits the title while retaining a top-right close control. When a user begins typing, smoothly transform the opening composition into a normal top-down transcript.

Onboarding also places conversation at the top. Assistant text should appear with a restrained magical glow and progressive letter reveal that remains compatible with real AI streaming, Reduce Motion, and accessibility.

Apply the magical progressive reveal to generated AI replies. Keep the saved daily opening message fully loaded when the screen appears. For a conversational check-in, the AI asks whether the user has anything else to add. When the user confirms they are finished, calculation begins automatically; no separate Done or Update button is required.

The whole daily check-in layer slides up when opened and slides down when closed.

## Open decisions

None.

## Done when

The supplied check-in composition is matched on iPhone, the world remains clearly visible through native glass, opening and closing motion is smooth, text animation does not fight streaming, and the brief calculation mist correctly surrounds map-changing work.

## Result

Implemented the focused presentation slice. Conversation now uses misted native glass with the transcript anchored at the top, while calculation briefly thickens the veil before a 0.2-second fade. The daily opening greets by first name, appears fully loaded, presents the exact owned islands as vertical questionnaire links with chevrons, and transforms into the transcript as typing begins. Generated assistant messages retain the streaming-safe progressive reveal and restrained glow with Reduce Motion and accessibility behavior.

The daily conversation now starts or resumes the private user-local check-in through Convex, streams Luna's saved messages, retries the same idempotent submission after interruptions, and shows a calm retry state. Once Luna asks whether there is anything else and the user confirms completion, the final acknowledgement remains visible briefly before calculation mist appears and dissolves back to the map automatically.

## Verification

`npx tsc --noEmit` passed. All eighty-eight repository tests passed and `git diff --check` passed.

The signed-in iOS simulator verified native clear glass over the live island world, top-anchored composition, keyboard entry, progressive magical text, the waiting indicator disappearing when streamed text begins, retry after an interrupted request, the separate “anything else?” confirmation, automatic calculation/reveal, and clean slide-down close behavior.

## Commit

Pending.
