# Build island history and summary

Status: completed

Owner: primary-agent

Depends on: Apply growth, rocks, sinking, and resurfacing

## Outcome

Give each island a useful summary and chronological history that connects visible terrain changes to the user’s recorded activities.

## Approved data direction

Summary and history are read-only views over the same owner-scoped island, daily summaries, activities, and growth state used by the map. Preserve original activity wording and show how each day affected the island. Do not create a second scoring model for these views.

The approved screen composition is one tabbed Liquid Glass sheet. Summary opens first, History is the second tab, the sheet opens directly at near-full height and can be dragged downward, and history days reveal their saved source details inline.

## Done when

The user can open an island, understand its purpose and current condition, and inspect the activities behind its growth or decline.

## Result

Added owner-checked Convex read models for one island's current summary and newest-first paginated daily history. The summary reads the stored growth state directly and includes the island name, purpose, above-water or sunk condition, lifetime positive and negative points, rocks, growth steps, and reproduced small and milestone detail keys.

Each history day exposes the stored local date and time zone, positive and harmful flags, merged summary, contextual detail, affected activities, exact original user entries, and the full saved questionnaire source when an activity came from a structured check-in. History is capped at thirty days per page and does not recalculate scores.

Added one draggable tabbed Liquid Glass sheet to focused islands. The sheet slides directly to near-full height and can be dragged downward. Its regular native glass material uses a slightly stronger milky tint so the island remains visible without competing with the text. Summary opens first with the island purpose, stored condition, growth, points, rocks, and visible props. History opens second, pages newest-first, and expands each day inline to its stored activities, original wording, and questionnaire answers. A glass book control beside Check in opens the sheet while keeping the focused island visible behind it.

## Verification

Pure read-model tests cover bounded pagination, stored condition mapping, cross-owner resource rejection, per-island activity filtering, exact original wording, structured-source attribution, and duplicate removal. The focused suite passes five tests and the combined repository suite passes 86 tests.

Official Convex code generation and its TypeScript pass completed successfully. `git diff --check` passes, and the latest history and structured-check-in safety changes deployed to `adventurous-zebra-515` at 10:00:33 on 2026-07-21. A live unauthenticated call to the shared owner-scoped islands API was rejected with the expected `UNAUTHENTICATED` error. The development database currently contains no island rows, so an ID-based live history call cannot get through argument validation; the shared authentication gate, owner check, cross-owner mapping regression, and live auth probe cover the privacy boundary until end-to-end UI verification creates test data.

An independent code review found that the first history query ordered by document creation time and filtered ownership after the island index. The accepted fix uses the owner-and-island index directly, so pages are owner-scoped and newest local dates arrive first without scanning another owner's rows. The reviewer re-checked the fix and reported no remaining actionable findings.

The completed UI passes strict TypeScript, `git diff --check`, and all 117 repository tests. The native dev client accepted the updated bundle without a red error overlay. Final touch feel remains available for the user's simulator review.

## Commit

Pending.
