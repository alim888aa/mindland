# Add real map camera and compact territories

Status: completed

Owner: primary-agent

Depends on: Fix map navigation and starting growth

## Outcome

Make the map feel like one navigable world across overview and island close-up while keeping small islands centered inside compact, equal territories.

## Done when

Pinching zooms continuously around the fingers from the world perimeter to an island close-up. One-finger panning remains bounded at every zoom level. Tapping an island animates to its center, and double-tapping animates home to as many as five central islands with adjacent land able to peek at the edges.

Territories form a compact shared cluster with neutral ocean between the cluster and world perimeter. Each island settles near its territory center. Starting land occupies roughly 30% of the territory and can later grow to an 80% cap. Labels scale with the terrain and disappear when crowded.

The obsolete compass control is removed, Clerk account access remains available from the map, and the result is verified in the iPhone simulator.

## Implementation note

The user approved `react-native-gesture-handler` after reviewing the camera approach. Expo 57's versioned guidance recommends it for native pinch and composed gestures, so the app now uses the Expo-compatible 2.32 release.

## Result

The map now has a renderer-independent camera controller and native focal pinch, pan, and double-tap gestures. Pan races double-tap home. Each projected island landform has its own scaling circular touch target, while empty territory water remains free for navigation. Home frames up to five central islands and is also the farthest allowed zoom, removing the jarring distant world view. Its overview targets the cluster's visual center, enforces a 30%-of-screen minimum territory width, and allows the outer ring to crop beyond the screen. The invisible navigation bounds expand to contain that centered home footprint, preventing the first drag update from snapping back to the old higher framing. The WebGPU canvas is visual-only. Tapping an island or its name animates to its territory while keeping the land visually centered, Check in remains available, and zooming out preserves the continuous camera pose.

Territories now form a radial equal-area cluster inside a larger world perimeter. The prototype shoreline begins at 30% of its territory, its cell remains stable, and future growth is capped at 80%. Shared and outer lines are rendered separately with softened joints. Labels scale with camera distance and disappear when the overview becomes crowded.

The obsolete compass was removed. The top-right control now opens Clerk's native account profile and management sheet.

## Verification

The complete client suite passes 113/113 with Node's test runner. Territory invariants cover every island count from three through twenty, and stable gesture bindings include the territory tap handler.

A clean Expo 57 iOS development build completed with zero errors after compiling WebGPU, Gesture Handler, Reanimated, Clerk, and the Expo dev client. The signed-in simulator verified the closer centered home frame, cropped outer territories, 30% bare starter shoreline, island-to-territory animation, daily check-in in both overview and focus, and Clerk's native profile and Manage account screens.

React Native's development performance monitor held both UI and JavaScript at 60 FPS after the map settled. Debug simulator memory was roughly 508 MB, so device memory and gesture feel still need the later release-build polish pass.

The repo-wide TypeScript command still reports pre-existing errors in the app entry, NativeWind wrapper, check-in scroll ref, and WebGPU cast. None of the files added or changed for this task appear in that error list.

## Commit

Blocked locally: iCloud has offloaded every loose object under `.git/objects`, so Git freezes when reading the current commit. Code, tests, native build, simulator verification, and review are complete; commit once the repository metadata is downloaded.
