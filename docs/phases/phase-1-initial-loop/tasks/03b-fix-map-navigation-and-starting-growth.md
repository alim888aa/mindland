# Fix map navigation and starting growth

Status: in-progress

Owner: map-navigation-agent

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

Simulator verification is still pending. The installed development build is
available, but the Expo CLI currently exits inside its environment helper while
Clerk and Convex dependencies are being changed in parallel. TypeScript and git
diff checks also stalled without output during that concurrent dependency work,
so they need to be rerun after the package installation settles.

## Commit

Pending.
