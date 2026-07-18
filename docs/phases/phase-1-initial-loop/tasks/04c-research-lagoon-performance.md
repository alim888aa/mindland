# Research Lagoon Immersion performance

Status: completed

Owner: lagoon-performance-agent

Parent: Build daily check-ins

## Outcome

Define a source-grounded way to keep Lagoon Immersion smooth while combining the island world, native glass, chat scrolling, keyboard movement, and completion transitions.

## Done when

The research identifies likely GPU, CPU, memory, and accessibility risks; proposes a measurable rendering policy and graceful fallbacks; and cites current Apple, Expo 57, React Native, and Three.js guidance where applicable.

## Result

Lagoon Immersion can be smooth if the island remains visually present without asking the WebGPU scene, Liquid Glass, chat, and keyboard to animate at full rate together. The recommended approach is a single persistent island renderer behind a native interface, controlled by an explicit rendering policy. The check-in must never mount a second WebGPU canvas or rebuild the scene.

The current prototype always runs `WebGPURenderer.setAnimationLoop`, updates the water texture, renders, and presents at display cadence. It also caps device pixel ratio at 2. A 2x ratio draws four times as many pixels as 1x before iOS composites glass and the chat above it. The current transcript uses `ScrollView`, which mounts every message. These choices are acceptable for the small prototype, but they create the main Lagoon risks: continuous GPU work behind content, full-screen offscreen composition, keyboard-driven layout, and an increasingly expensive transcript.

### Recommended rendering policy

Give the world renderer four modes. The mode is product state rather than a timing guess scattered across screens.

| Mode | When | World policy |
| --- | --- | --- |
| `interactive` | Map dragging, island zoom, or direct world interaction | Render at 60 fps while touch or camera motion is active, then stop when settled. |
| `ambient` | Check-in is open and the transcript is resting | Show only the selected island and essential water. Start at 15 fps. Permit 30 fps only after a release-device profile passes the budgets below. Cap render pixel ratio at 1.0-1.25 because the world is defocused behind the mist panel. |
| `frozen` | Keyboard enters or exits, chat scrolls, text changes rapidly, an AI answer streams, the app is inactive, or Reduce Motion is enabled | Present one final frame, then stop the Three.js animation loop. Native text, scrolling, and keyboard movement continue at 60 fps over the held image. Render one new frame only when island state visibly changes. |
| `reveal` | A completed check-in reveals growth or a rock | Prebuild the hidden visual change before the transition, then render at 60 fps for at most 1.2 seconds. Return to `frozen` after it settles. Use an immediate update or short crossfade with Reduce Motion. |

Stopping the animation loop matters more than merely skipping water updates inside a 60 Hz callback. Three.js supports ending `setAnimationLoop` with `null`; the renderer owner can draw and present one frame on demand, then restart its loop when a policy mode needs motion. Pause immediately when React Native `AppState` becomes inactive or backgrounded. Keep one GPU device, one scene, and one canvas resident so opening check-in does not compile pipelines or reload textures during the transition.

Before showing Lagoon, hide non-selected islands, territory geometry, labels, and map-only effects. Keep the selected island, a simplified water plane, the camera, and existing lights. Do not create materials, geometry, textures, or AI-selected details inside a frame callback. A completed detail should be constructed while the mist panel still covers it and made visible for the reveal.

Start the check-in background at 1.25 pixel ratio. If the real-device profile misses the GPU budget, try 1.0 before reducing the scene's identity. Resolution should change before the opening animation and remain stable during it; resizing the render surface mid-transition can itself hitch. Shadows are already disabled and should stay disabled in Lagoon. The current 3,536-segment water plane should be tested against a simpler background mesh because its texture movement is largely obscured by the panel.

### Native interface policy

Use at most two compact native glass regions at once: navigation and composer. Group related controls with Expo's `GlassContainer`. The large transcript mist panel should be a stable regular material or an opaque translucent surface, not another nested interactive glass layer. Apple warns that too many glass effects and containers degrade rendering performance, and recommends keeping Liquid Glass in the control and navigation layer.

Use Expo 57's `isGlassEffectAPIAvailable()` before mounting native glass. `isLiquidGlassAvailable()` alone does not account for accessibility. Query `AccessibilityInfo.isReduceTransparencyEnabled()` and use an opaque warm mist panel and opaque controls when it is enabled. Increased Contrast should add a stronger outline and text contrast. Reduce Motion should freeze the world, remove camera drift and panel morphing, and replace the completion dissolve with an immediate change or a short crossfade.

The WebGPU backdrop must remain absolutely positioned and outside keyboard layout. Only the transcript and composer should respond to the keyboard. On iOS, use one native scroll-inset strategy rather than combining several competing adjustments: `automaticallyAdjustKeyboardInsets` on the transcript is the first option to test. Keep interactive keyboard dismissal so the composer tracks the user's finger.

The present V1 conversations are short enough for `ScrollView`, but saved daily conversations will eventually make it shallow. Move the transcript to an append-only `FlatList` before long histories are exposed. Start with `initialNumToRender` sufficient to fill one screen, a small render batch, stable message keys, and `maintainVisibleContentPosition`; measure before changing its window settings. Avoid inverted transforms and leave `removeClippedSubviews` off on iOS unless testing proves it safe, because React Native documents missing-content risks with complex transforms. AI parsing and island scoring must not run synchronously during scrolling, keyboard animation, or the reveal.

### Static fallback ladder

1. Preferred: live selected island at the `ambient` rate while the interface is resting.
2. Contention fallback: the last presented WebGPU frame with the animation loop stopped during keyboard, scrolling, typing, streaming, and accessibility-reduced motion.
3. Guaranteed fallback: a cached static island poster behind an opaque mist panel when glass is unavailable, Reduce Transparency is active, the renderer cannot resume, or release-device profiling fails.

Do not capture the full GPU view when the user opens check-in. A synchronous GPU readback at that moment would put expensive work directly in the transition. Generate or refresh the poster only after island state changes and during an idle period, then reuse it for every check-in until the island changes again. The installed `react-native-webgpu` `CanvasRef` exposes a surface and context but no supported snapshot method, so the guaranteed poster needs a separate approved snapshot adapter or a deterministic 2D island portrait. That choice should be made before implementation. Until then, holding the last presented frame must be verified on a physical iPhone rather than assumed.

### Acceptance budgets

These are Mindland engineering targets, not platform guarantees. Measure them in an iOS release build on the oldest iPhone the demo intends to support and on one current Pro device.

| Area | V1 budget |
| --- | --- |
| Native chat, keyboard, and questionnaire motion | 60 fps; Apple hitch-time ratio below 5 ms/s; no repeatable hitch above 33 ms. |
| WebGPU work while Lagoon rests | 15 fps default; each GPU background frame below 8 ms; JS scene update below 2 ms. |
| Completion reveal | 60 fps for at most 1.2 seconds; no AI token streaming or synchronous domain work during the reveal. |
| Touch and typing | Visual response begins within one 16.67 ms display frame when already mounted; no dropped characters during AI streaming. |
| Memory | One WebGPU canvas only; opening Lagoon adds no more than 30 MB over the settled map; after ten open/close cycles, resident memory returns to within 10 MB of its first settled value. |
| Glass | No more than two compact visible glass regions; zero nested glass effects. |
| Backdrop quality | 1.25 pixel ratio initially; 1.0 fallback; no resolution changes during a visible transition. |

Apple considers a hitch-time ratio below 5 ms/s good and mostly unnoticeable; 5-10 ms/s should be investigated, and more than 10 ms/s requires immediate attention. A 60 Hz display gives each foreground frame 16.67 ms, but the app should not intentionally spend that entire budget because iOS still needs to prepare and composite WebGPU, glass, text, and the keyboard.

### Profiling plan

Build and profile a release configuration on physical iPhones. Development builds and the simulator are useful for correctness but do not represent WebGPU, shader compilation, memory, or Liquid Glass composition cost.

Record the settled map as the baseline, then profile these flows separately: open check-in cold and warm; show, resize, and interactively dismiss the keyboard; type while an AI answer streams; scroll a 100-message transcript; advance questionnaire answers; run the completion reveal; open and close Lagoon ten times; background and resume; enable Reduce Transparency, Increased Contrast, Reduce Motion, and large Dynamic Type.

Use Xcode Instruments' Animation Hitches and Game Performance Overview templates to correlate main-thread work, render-server hitches, GPU time, FPS, and memory. Use Metal Performance HUD for a fast GPU read and capture one bad frame in the Metal debugger when GPU time exceeds the budget. Use React Native DevTools or Perf Monitor to separate JS stalls from native scroll and compositor stalls. Keep a small table of release-build results by device, flow, render mode, pixel ratio, hitch ratio, GPU time, and memory delta. Choose 15 versus 30 fps ambient rendering from those measurements rather than from simulator appearance.

### Main risks

The largest unknown is iOS compositing native Liquid Glass over a frequently changing full-screen Metal layer. The cost depends on real hardware and cannot be settled from code inspection. The static fallback therefore belongs in the first Lagoon implementation, not final polish.

The next risks are pipeline compilation during the opening transition, assuming a stopped Metal surface retains its last frame, full-resolution rendering behind mostly opaque content, a keyboard adjustment that relays out the WebGPU view, unbounded `ScrollView` children, and GPU resources surviving repeated screen changes or backgrounding. A memory warning should discard cached posters and nonessential island assets first; the renderer should recover cleanly if its surface or device becomes unavailable.

### Sources

[Apple: Applying Liquid Glass to custom views](https://developer.apple.com/documentation/SwiftUI/Applying-Liquid-Glass-to-custom-views) recommends grouping effects and explicitly warns that too many effects or containers can degrade performance.

[Apple: Meet Liquid Glass, WWDC25](https://developer.apple.com/videos/play/wwdc2025/219/) describes the material as a control and navigation layer, explains regular versus clear glass, and documents Reduce Transparency, Increase Contrast, and Reduce Motion behavior.

[Apple: Explore UI animation hitches and the render loop](https://developer.apple.com/videos/play/tech-talks/10855/) defines the 16.67 ms frame interval at 60 Hz, commit and render hitches, hitch-time ratio, and Apple's under-5 ms/s target.

[Apple: Find and fix performance issues in your Metal games, WWDC26](https://developer.apple.com/videos/play/wwdc2026/388/) explains Metal Performance HUD, Game Performance Overview in Instruments, and correlating CPU, GPU, FPS, and memory over longer sessions.

[Apple: Optimizing GPU performance](https://developer.apple.com/documentation/xcode/optimizing-gpu-performance/) covers Metal frame capture and profiling GPU passes and shader hot spots.

[Expo SDK 57: GlassEffect](https://docs.expo.dev/versions/v57.0.0/sdk/glass-effect/) documents `GlassView`, `GlassContainer`, native effect animation, runtime API checks, and the separate Reduce Transparency check.

[React Native: Performance Overview](https://reactnative.dev/docs/performance) explains separate JS and UI frame rates, release-build testing, native scrolling behavior, and list bottlenecks.

[React Native: ScrollView](https://reactnative.dev/docs/scrollview) documents the cost of mounting all children, automatic keyboard insets, interactive keyboard dismissal, and maintaining visible chat content.

[React Native: Optimizing FlatList Configuration](https://reactnative.dev/docs/optimizing-flatlist-configuration) documents the rendering and responsiveness tradeoffs of batch, window, and clipped-subview settings.

[React Native 0.86 release notes](https://reactnative.dev/blog/2026/06/11/react-native-0.86) confirms the current runtime and its keyboard/TextInput height fixes.

[Three.js: WebGPURenderer](https://threejs.org/docs/pages/WebGPURenderer.html) is the renderer reference for the project's Three.js WebGPU path.

[Three.js: Responsive Design](https://threejs.org/manual/en/responsive.html) explains renderer resolution and pixel-ratio scaling.

[React Native WebGPU](https://wcandillon.github.io/react-native-webgpu/) documents the Dawn-backed native WebGPU surface used by this prototype.

## Verification

Reviewed the current renderer, scene update loop, pixel-ratio cap, water geometry, WebGPU canvas surface, check-in `ScrollView`, and keyboard layout. Cross-checked the recommendations against current official Apple performance and Liquid Glass guidance, exact Expo 57 GlassEffect documentation, React Native 0.86 documentation, Three.js WebGPU documentation, and the installed React Native WebGPU package. No code or dependency was changed.

## Commit

`5d9d0d2` — `docs: choose Lagoon and record architecture review`
