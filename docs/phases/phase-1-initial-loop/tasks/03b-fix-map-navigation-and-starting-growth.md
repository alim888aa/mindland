# Fix map navigation and starting growth

Status: in-progress

Owner: primary-agent

Depends on: Build the expandable world map

## Outcome

Make the overview genuinely draggable and make new islands appear as small, sparse starting land that can visibly grow later.

## Done when

Two-axis movement responds reliably on iPhone without breaking island taps, the four prototype islands fit comfortably inside the overview, and their initial terrain is sparse enough to communicate zero completed activity.

## Result

Made the map renderer the parent of its interactive overlay and claim movement
in the responder capture phase. A drag can now begin on water, the WebGPU
canvas, or an island label. A stationary label touch remains a normal tap.

Replaced the guessed pan footprint with a camera policy that projects all four
viewport corners onto the map plane and derives its limits from that real
footprint. The prototype world is wide and deep enough to leave movement in
both directions after those limits are applied.

Zero-progress prototype islands render as bare terrain at 42% land scale, with
the selected-island camera adapting to that smaller radius. Runtime visual
growth is deferred to the life-map world model architecture decision so this
startup task does not create a temporary or capped growth interface.

## Verification

Code inspection confirms the capture responder is an ancestor of the native
canvas and interactive labels. A direct projection exercise using the current
iPhone aspect and overview camera confirmed all four viewport rays intersect
the ground plane and showed why the earlier fixed depth prevented vertical
movement. All prototype islands now use the approved bare 42% starting scale.
No banned React hooks were introduced.

Simulator drag verification is still pending. The new Clerk-enabled native
development build compiled, installed, and opened its launcher successfully,
while Metro startup is delayed by unusually slow local package reads. Two independent code-review passes found no
actionable issues in the responder hierarchy, camera limits, or starting-island
rendering. TypeScript and focused diff checks passed after dependency work
settled.

Hands-on feedback found three remaining camera problems: the initial overview
was offset toward one vertical limit, island focus framed the small starter land
instead of its territory, and leaving an island snapped the viewing direction
while its position was still moving. The follow-up keeps the previous overview
pose, centers the starting pan within its real limits, frames the selected
territory polygon, and interpolates the same look target in both directions.

The camera now has one owner for position and viewing direction. Territory
framing and overview limits are recalculated after viewport changes, while the
render loop reuses its projection vector to avoid creating camera garbage every
frame. TypeScript passes. The iPhone 16 simulator shows the full Health
territory and returns to the four-island overview successfully. Final drag feel
still needs the user's hands-on pass in the running simulator.

## Commit

`64b112c` — `fix: make the island world draggable`
