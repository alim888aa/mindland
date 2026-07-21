# Mindland context

## Mission

Mindland is a mobile self-management app that turns a person’s goals and daily actions into an evolving map of islands. The map should help the user see where their life is growing, where it is being neglected, and whether their actions align with what matters to them.

## Core experience

V1 is an iPhone-focused hackathon demo of the complete main loop. Clerk provides accounts through Apple and email/password sign-in. Convex stores persistent app data.

After sign-in, a neutral, calm-friend AI explains Mindland in one sentence and immediately opens with a broad question such as “What parts of your life would you like to grow?” The interview continues as an adaptive streaming conversation, with roughly five to twelve messages as a soft target and a numberless Liquid Glass progress bar. The AI decides how far the bar advances as its understanding improves, and progress never moves backward. It creates only the meaningful islands it actually discovers, typically three to five but sometimes fewer. Candidate islands quietly form as blurred colorful shapes behind a shared mist surface, while their normal topic names remain hidden until the final reveal.

The AI normally asks one question per message. Every assistant message streams into view with a restrained magical glow and progressive letter reveal. Every user and assistant message is stored in Convex so an interrupted interview resumes from the same conversation. Onboarding establishes islands and their purposes but does not create activity nodes, positive points, negative points, or rocks. When it has enough context, it summarizes what it understood so the user can correct it through the same chat. A final Create my map button begins the reveal: the glass controls and mist dissolve like clearing clouds, exposing the formed islands and their names beneath them.

Broad interests are split into the specific islands that the user actually cares about. For example, Health can create Fitness, Nutrition, and Sleep islands, which may later form a Health archipelago. V1 displays the specific islands without a visible Health umbrella. The user then sees a guided reveal that highlights each island, briefly explains why it was created, and advances automatically without a Next button. A Skip control can end the guide. They may rename or remove an island, but at least one must remain and they cannot add one during the reveal. Later conversations may discover more islands, but the app asks permission before creating them.

After the reveal, the user lands on the map and can explore before choosing Check in.

Every activity belongs to its most specific island or islands. An activity such as running with a friend contributes to that day’s summarized node on Fitness and that day’s summarized node on Relationships. Those nodes stay inside their own territories and appear near the shared border.

The check-in screen follows the original wireframe: island names appear as questionnaire entry points while a text field remains available at the bottom. The user can start typing immediately to enter a normal AI chat, or tap an island to complete its AI-generated structured questionnaire. Both paths create the same underlying activity records and map changes. Follow-ups on the same local day continue that day's saved chat. A new local day starts a fresh visible chat while older transcripts remain stored; the new agent receives the most recent earlier completed check-in privately as context, including across skipped days.

Each island questionnaire contains three to seven full-screen questions. The AI chooses the most suitable input for each question, answers advance automatically, and every question can be skipped. One private Luna request generates every new island's questionnaire while the creation mist remains visible. Questionnaires remain stable in V1; regeneration after later purpose changes is deferred. Finishing applies the check-in immediately, returns to the island, and animates the new detail.

AI conversations are saved so they can eventually be revisited. A conversation-history screen is useful later but is not required for V1.

New islands begin as small pieces of land with no completed-activity nodes. Positive activity grows both their land area and their visible contents, such as trees, hills, paths, and buildings. Repeated harmful activity accumulates negative points and eventually creates a visible rock. Rocks weigh an island down slowly, remain as reminders, and may eventually sink it. A sunken island can resurface through renewed activity.

Each island has a zoomed terrain view plus a summary and history. Related islands may later form archipelagos, but archipelago behavior is outside the first version.

## World and territory behavior

The map is a bounded open world that the user can move through horizontally and vertically. Its outer perimeter expands before an island or territory approaches the available edge. That perimeter remains invisible in the UI so the lagoon has no harsh outer border.

Every island owns a territory. Related new islands appear near one another, and adding them can shift existing islands and territory boundaries. Cross-island activity creates separate nodes inside each affected island, placed toward their shared boundary. Repeated overlap may eventually create a sandbar, while one-off overlap does not.

Territories form equal-sized shared polygon cells with softened visual corners. The claimed cluster leaves roughly one starting-island width of neutral ocean before the larger world perimeter. Islands settle near the center of their cells. Their starter shoreline occupies roughly 30% of the enlarged territory and grows to at most 80%, while territory size remains stable. Home framing keeps the smallest visible territory at least 30% of screen width and allows outer territories to extend beyond the viewport.

Small worlds favor circular clusters centered in the portrait viewport. Three islands use a centered triangle with two above and one below rather than a single horizontal row. Larger island counts continue expanding outward around the center.

The map supports continuous focal-point pinch zoom from the full perimeter to an island close-up. Each visible piece of island land has a direct circular touch target that scales with its rendered land and keeps a comfortable minimum size; island names remain tappable too. Empty territory water remains navigation space. Daily check-in remains available in the focused view. Beginning a drag cancels any in-flight camera transition and preserves the exact visible zoom. The invisible navigation boundary includes the centered home camera footprint, so the first pan movement cannot clamp the camera back to the older high-screen framing. Once a pan activates, it also cancels double-tap home. Returning from island focus to the overview takes roughly 200 milliseconds longer than the current prototype. Double-tapping returns to a home frame of up to five central islands, with nearby islands allowed to peek at the edges. Island names use floating text with a soft glow and disappear when the view becomes crowded.

## Activity records and emerging islands

Every recorded activity preserves its original user message alongside structured metadata such as activity, duration, time, affected islands, sentiment, and tags.

Repeated activity may suggest a more specific island. For example, Guitar can emerge from Hobbies when guitar-related tags appear in at least ten nodes within the last month and are also supported by frequency, recency, and total time. The app asks permission before creating this later island. If accepted, relevant historical nodes migrate to it.

## Growth and decline rules

Each island keeps one summarized positive node per calendar day. For the hackathon demo, distinct supportive activities may add up to twelve lifetime positive points to that island on the same day so judges can see land and props evolve in one session. The underlying activity records still preserve each source while history keeps the day summarized.

The first five lifetime positive points grow land by ten percentage points each, taking it from 30% to its 80% cap. The sixth and every later positive point adds one visible prop chosen from the prepared visual catalogue using the activity context and island purpose.

Each island receives at most one negative point per calendar day that contains harmful activity for that topic. Every five accumulated negative points creates one visible rock.

An island may receive both one positive point and one negative point on the same day. Additional check-ins on that day update the existing daily summaries instead of creating extra nodes or points. V1 accepts activity for the current user-local calendar day only and does not backdate logs.

An island’s long-term survival favors lifetime progress. One visible rock counts the same as one lifetime positive point when evaluating sinking. For example, an island with twenty lifetime positive points remains above water until it reaches twenty rocks, even though creating those rocks requires one hundred negative points.

A submerged island remains visible as a reminder and resurfaces as soon as its lifetime positive-point count becomes greater than its visible rock count.

The system preserves the original activity entry. Corrections remain visible in history, and an accidental submission can be undone for five minutes.

## Open product questions

Physical-device gesture feel, the long-term map expansion limit, and production Apple sign-in still need later validation.

## Current status

The signed-in Expo 57 app now renders the exact islands materialized from onboarding rather than a fixed prototype set. The current simulator account owns five generated islands, and those same rows drive the map and guided check-in choices. Equal connected radial territories, a neutral-ocean reserve, adaptive fog, bare 30% starter land, softly glowing labels, bounded pan, continuous focal pinch, whole-territory focus, and double-tap home all run in the native iPhone simulator without runtime errors. Home framing now favors a readable minimum territory footprint and deliberately crops outer cells instead of squeezing every island into the viewport. Check in remains available after focusing an island.

Daily check-in now uses the same misted native Liquid Glass presentation as onboarding. The pale shared veil keeps dark text readable while leaving blurred islands visible beneath it. The opening question appears immediately, later AI replies stream normally, island shortcuts smoothly focus their real territory, questionnaire choices advance automatically, and the top-right close control slides the flow away cleanly. Conversational check-in is private and persistent in Convex, asks the separate “anything else?” confirmation, then keeps calculation mist visible until scoring is actually applied. Reopening the same day restores both chat and guided questionnaire entry. Structured questionnaires persist through the same daily activity ledger.

Island-specific questionnaires are now generated and stored with the islands. Luna uses each island's onboarding conversation, name, purpose, and source context to choose three to seven prompts, answer choices, and input kinds. Existing accounts backfill missing questionnaires privately when opened, grouped by their original onboarding conversation. A complete theme-aware fallback keeps creation usable if AI generation fails.

The activity backend currently allows up to twelve positive points and one negative point per island per local day for the hackathon demo. It converts five negative points into one rock, favors lifetime positive progress when sinking, and allows resurfacing. The first five positive points grow land from 30% to 80% in ten-point increments. Positive points after the cap add one deterministic context-fitting prop each. The renderer consumes the stored growth ledger, details, rocks, and sunk state with bounded mesh budgets.

Private island Summary and History are connected end to end. A glass book control appears beside Check in while an island is focused. It opens a draggable tabbed Liquid Glass sheet directly at near-full height, with Summary first and History second. The sheet can still be dragged downward. Summary shows purpose, condition, growth, points, rocks, and visible props. History pages newest-first and expands each day inline to its saved activities, original wording, and questionnaire answers.

NativeWind 5 and Tailwind CSS 4 are configured for two-dimensional product screens alongside the existing WebGPU renderer. Clerk's native session gate is connected to Convex through `ConvexProviderWithClerk`. The development deployment validates Clerk JWTs, and temporary proof functions derive ownership from the verified server identity so the client cannot choose whose data it reads or writes.

The rotated OpenAI key and Clerk issuer live in Convex's server environment. Expo receives only public Clerk and Convex values. Anonymous backend calls are rejected, the protected OpenAI server check passed, and real Clerk sessions now reach private Convex data. Two native development accounts proved A/B isolation: each user saw only their own marker. Clerk's secure token cache also preserved the active session and private record across an app restart. A disposable simulator account also proved the complete email/password signup, email-code verification, session finalization, and fresh onboarding handoff.

The map exposes a 48-point signed-in avatar that opens a custom water-backed Liquid Glass account sheet with the user's avatar, name, email, Manage account, and Sign out. Manage account opens Clerk's maintained native profile and security surface, and returning to the Mindland sheet is verified.

The Apple Team ID is `WRRAJYP22V`, the iOS bundle identifier is `com.alimaa555.mindland`, and the generated native project includes the Sign in with Apple entitlement. The Apple button reaches the native system prompt. Completing that provider test requires an Apple Account in the simulator or a real device, while production credentials require Apple Developer Program membership because the current Xcode team is a Personal Team.

The first real Luna onboarding interview is deployed and connected to the signed-in iPhone app. A five-answer simulator run proved streaming replies, private Convex history, AI-controlled forward progress, interruption resume, hidden structured discovery, dynamic island materialization, and reveal. Later native verification proved that a three-topic interview produces exactly those three owned islands across the map and check-in.

A clean native build now succeeds on the local Xcode 26.2 machine. Expo 57 officially expects a newer Xcode, so the repository carries a narrow patch-package compatibility workaround for ExpoModulesJSI and isolates its generated build cache under `/tmp`; removing that workaround after Xcode is upgraded remains the preferred path.

Map startup, render-loop, and asynchronous GPU-device failures now cleanly release the active rendering generation and offer a retry instead of leaving a blank world. AI failures are logged only as stable categories, keeping provider payloads and private conversation text out of Convex logs. Fresh daily chats now privately receive up to forty messages from the most recent completed check-in, including across skipped days; an indexed lookup keeps this bounded and a damaged old thread cannot block today. The full TypeScript check and all one hundred six repository tests pass. A clean simulator restart rendered the current three-island world as a centered two-above, one-below triangle without an error overlay.

Fresh disposable-account verification now covers email/password sign-in, email-code verification, a five-answer Luna interview, exact three-island creation, agent-generated island questions, structured activity interpretation, stored daily scoring, island growth, and return to the focused map. The first structured application exposed and fixed an internal-field mismatch at the Convex mutation boundary. During onboarding and check-in calculation, the shared mist now shows a centered loading spinner. Reveal waits for the rebuilt WebGPU world's first rendered frame, then fades its translucent veil over 0.2 seconds. Map zoom-out stops at the centered home frame instead of exposing the former distant world view.

A fresh post-repair onboarding-only reveal recording remains pending because the agreed three-run onboarding cap has been reached. Production Apple sign-in also remains unfinished.

The current phase is [Phase 1: Initial loop](docs/phases/phase-1-initial-loop/README.md).

Hackathon repository publication is in progress. The public-facing README now documents the product, judge testing path, local setup, architecture, verification, and the distinct roles of Codex and GPT-5.6. Local environment files, native build folders, large demo exports, and iCloud conflict copies are excluded from publication; the repository uses the MIT license.
