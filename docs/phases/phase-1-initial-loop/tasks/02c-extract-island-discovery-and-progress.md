# Extract island discovery and interview progress

Status: completed

Owner: onboarding-discovery-agent

Depends on: Build the persistent streaming interview backend

## Outcome

After each streamed onboarding reply, run a private structured AI interpretation of the saved conversation. It identifies clear island candidates using normal topic names, chooses forward-only interview progress, and decides when the conversation is ready for the user to create their map.

## Done when

The structured result is validated, never appears in the visible transcript, uses normal concise topic names, updates the private Convex interview state, keeps candidate names hidden before reveal, lets progress pause or advance without shrinking, and cannot turn a successfully streamed chat reply into a failed submission when interpretation alone fails.

## Result

Added a private structured interpretation after each successfully streamed onboarding reply. The AI now returns supported island candidates with ordinary topic names, chooses the adaptive progress amount, and decides when the interview is ready to create a map.

The interpretation uses the saved conversation for context while `saveMessages: "none"` keeps its prompt and JSON result out of the visible transcript. Runtime validation enforces candidate, progress, and readiness rules. Interpretation and completion-bookkeeping failures are isolated from the saved assistant reply, while real stream failures keep the existing retry path.

## Verification

Focused strict TypeScript passed from the fast local mirror with `npx tsc --noEmit --pretty false -p tsconfig.discovery.json`.

An independent reviewer checked privacy, AI SDK 6 and Convex Agent usage, retry races, structured validation, and failure boundaries. Its first pass found post-stream failure handling and validation gaps. Those were fixed, and the second pass was clean.

The deployed action completed five real Luna replies and five private discovery passes. Progress advanced to 100 without visible JSON, and the final normal-name candidates were saved privately until reveal.

## Commit

Pending.
