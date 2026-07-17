# Research the iOS visual direction

Status: completed

Owner: ios-design-research-agent

Parent: Prototype the native check-in shell

## Outcome

Research current iOS interface direction, including Liquid Glass, and recommend how Mindland can feel distinctive while preserving readability, warmth, and the miniature-island world.

## Boundaries

This is a source-grounded design recommendation. It does not change app code before the user chooses a visual direction.

## Done when

The research compares current Apple guidance and strong contemporary native patterns, identifies where glass helps or harms this app, and proposes three concrete directions for the check-in experience.

## Result

Apple's current direction, including the refreshed 2027 releases, treats Liquid Glass as a floating functional layer for navigation and controls. The app's own identity belongs in the content beneath it. For Mindland, the miniature world, water, terrain, growth, and conversational voice should carry the brand. Glass can make that world feel immersive when it is kept around the edges of the experience.

Apple specifically advises against using Liquid Glass throughout the content layer or stacking glass on glass. Clear glass belongs over visually rich media; regular glass is safer for text-heavy controls. This matters here because the bright ocean and detailed terrain can look beautiful through a compact control while making long chat text difficult to read. Apple's 2026 guidance also emphasizes familiar native controls, edge-to-edge branded content, meaningful color, Dynamic Type, and motion that connects an action to its result.

### 1. Shoreline Glass

Keep the 3D map edge to edge. Use clear native glass for the compact map controls and the Check in capsule because they float over rich scenery. When Check in opens, let the selected island and its colors remain visible in a small living header, then place the transcript or questionnaire on a calm warm-sand content surface. Use regular glass only for the close control, island selector, and bottom composer. Assistant messages remain open on the surface; user messages use a warm solid bubble. Coral tint marks one primary action or a newly recorded change.

This gives the map and check-in one visual family without compromising long-form readability. Two restrained glass regions can be grouped in one native glass container, which keeps rendering cost more predictable beside the existing 3D world. Reduced Transparency can replace them with an opaque cream surface, Increased Contrast can add a stronger outline, and Reduced Motion can remove morphing while leaving the hierarchy intact. The result should feel warm, alive, and recognizably iOS.

### 2. Lagoon Immersion

Let the selected island remain full-screen behind the entire check-in. Defocus or slow the world while the conversation appears above it. Use clear glass for the compact navigation and composer, with a dark dimming veil behind them when the ocean is bright. Put message text and questionnaire prompts on one thick standard-material mist panel rather than individual glass bubbles. Completing a check-in dissolves that panel and reveals the new island detail underneath.

This has the strongest emotional connection to the map and the biggest demo moment. It also has the highest readability and performance risk because live 3D, blur, refraction, keyboard movement, and chat scrolling all compete for rendering time. It requires testing against every island color, large text, Reduce Transparency, Increase Contrast, and Reduce Motion. A static or gently animated island snapshot would be a safer fallback on weaker devices.

### 3. Warm Native Studio

Use a mostly opaque cream-and-sand check-in screen with native iOS navigation, a regular-glass composer, large system typography, and sparse coral accents. Bring in Mindland through a small animated island portrait, organic dividers, terrain thumbnails, and the words the AI uses. Questionnaires use large native choices on the solid surface and show a tiny island preview growing between questions.

This is the clearest, warmest, and lowest-cost direction. It supports long conversations, Dynamic Type, high contrast, and predictable keyboard behavior especially well. Its relationship to the map depends on excellent island imagery and transitions, so weak artwork could leave it feeling like a generic wellness app. Glass supplies modern iOS framing while content and motion carry the personality.

## Recommendation

Choose **Shoreline Glass**. It gives Mindland the current iOS feel the user is asking for while keeping the 3D islands as the memorable part. It also leaves room to borrow Lagoon Immersion's completion transition for a single high-impact moment: the content surface recedes and the newly changed island comes back into focus.

For implementation, use Expo 57's native `GlassView` and `GlassContainer`, or the SwiftUI `glassEffect` modifier where a native view is warranted. Check API availability at runtime and respect Reduce Transparency before rendering the effect. Prefer semantic native glass over a handcrafted fixed blur because iOS 27 updates its appearance and lets people adjust its tint. Keep no more than a few glass regions onscreen, group nearby effects, use at least 44-by-44-point targets, and preserve opaque fallbacks.

## Sources

[Apple Human Interface Guidelines: Materials](https://developer.apple.com/design/human-interface-guidelines/materials) defines Liquid Glass as a control and navigation layer, reserves clear glass for rich backgrounds, recommends regular glass for text-heavy elements, and gives dimming and accessibility guidance.

[Meet Liquid Glass, WWDC25](https://developer.apple.com/videos/play/wwdc2025/219/) explains the material's adaptive behavior, touch response, variants, hierarchy, and support for Reduce Transparency, Increase Contrast, and Reduce Motion.

[Communicate your brand identity on iOS, WWDC26](https://developer.apple.com/videos/play/wwdc2026/251/) places platform-familiar controls in the UI layer and brand expression, color, typography, imagery, and motion in the content layer.

[What's new in SwiftUI, WWDC26](https://developer.apple.com/videos/play/wwdc2026/269/) confirms that the 2027 releases refine Liquid Glass and allow people to adjust its tint while native apps inherit the updated appearance.

[Principles of great design, WWDC26](https://developer.apple.com/videos/play/wwdc2026/250/) emphasizes purpose, agency, familiarity, flexibility, simplicity, craft, and human delight instead of visual decoration alone.

[Applying Liquid Glass to custom views](https://developer.apple.com/documentation/SwiftUI/Applying-Liquid-Glass-to-custom-views) recommends grouping related effects in `GlassEffectContainer` and warns that too many glass effects or containers can degrade performance.

[Apple Design Awards 2026](https://developer.apple.com/design/awards/) highlights Moonlitt for native Liquid Glass and easy onboarding, and Tide Guide for connecting Liquid Glass and custom animation to an aquatic content theme while keeping dense information clear.

[Expo SDK 57: GlassEffect](https://docs.expo.dev/versions/v57.0.0/sdk/glass-effect/) provides native `GlassView` and `GlassContainer`, runtime availability checks, and the Reduce Transparency check needed for a safe React Native implementation.

[Expo SDK 57: SwiftUI modifiers](https://docs.expo.dev/versions/v57.0.0/sdk/ui/swift-ui/modifiers/) exposes native `glassEffect` configuration for SwiftUI-backed views.

[MacRumors' iOS 26 Liquid Glass overview](https://www.macrumors.com/guide/ios-26-liquid-glass/) records Apple's early increases in opacity after readability feedback, supporting a restrained approach over bright or busy backgrounds.

## Commit

`658cb2d` — `docs: research iOS visual direction`
