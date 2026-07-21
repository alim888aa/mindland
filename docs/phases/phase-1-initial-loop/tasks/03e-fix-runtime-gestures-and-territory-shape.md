# Fix runtime gestures and territory shape

Status: in-progress

Owner: primary-agent

Depends on: Add real map camera and compact territories

## Outcome

Remove every runtime gesture error, verify pan, pinch, island focus, selection exit, and double-tap home in the iPhone simulator, and restore the approved softened polygon territory appearance.

## Done when

The simulator and Metro remain free of gesture errors while every map gesture is exercised. Camera motion stays bounded and focal. Territory cells remain equal, connected, and deterministic while reading visually as softly rounded polygons instead of square tiles.

The user receives exact simulator instructions for tap, drag, double-tap, and pinch.

## Result

The first callback fix was incomplete: a real click-drag showed that Gesture Handler also loses the component instance captured directly inside inline builder callbacks. The task has been reopened to move all gesture callbacks behind stable JavaScript-bound handlers. Pinch zoom already follows a moving two-finger midpoint as well as preserving its original world anchor. The overview and island-focus poses are visually recentered and the four starter labels remain onscreen.

Territories now use deterministic shared hexagonal cells instead of square tiles. They remain equal, connected, centered, and expandable while reading as a visible polygon cluster. Starting land stays at the approved 30% scale inside each stable territory.

The harsh visible line around the entire world has been removed. Its camera limits remain active invisibly, while the internal shared territory lines stay visible.

## Verification

All 30 camera, territory, and gesture-binding tests pass, including moving-focal pinch behavior and layouts from three through twenty islands. A clean simulator restart visually confirmed that the outer line is gone while the territory cluster still renders. A real user click-drag exposed the remaining component-binding crash earlier, so tactile simulator verification is still active.

The desktop automation layer cannot inject drag or multitouch events into the Simulator window, so the final tactile pan, pinch, and double-tap feel remains a short manual simulator check using Apple's native controls.

## Commit

Unavailable while the repository's iCloud-offloaded Git object store remains unhydrated.
