# Mindland architecture review

Date: 2026-07-18

This is the durable version of the earlier temporary report. Here, a **module** means one part of the code that owns one job. A **deep module** keeps the complicated details inside and gives the rest of the app a small, clear way to use them. A **seam** is the handoff between two modules. An **adapter** is a small translator at that handoff; for example, it can turn map state into instructions for the WebGPU renderer. That creates **locality**: when a rule changes, one place changes. It also creates **leverage**: the AI, database, and map can all reuse the same rule.

No refactor has been chosen. The strength labels summarize the current urgency, and the user still chooses which candidate to explore.

## 1. Life-map world model

Recommendation strength: **Strong — top recommendation from the earlier scan**

### The current shape

The prototype has hard-coded island definitions in `src/data/islands.ts`. The check-in sample lives in `src/components/check-in-modal.tsx`. Land and visual details are created in `src/lib/island-scene-builder.ts`. The future rules for activities, daily nodes, growth, negative points, rocks, sinking, and resurfacing do not yet have one home.

Example: after “I ran for 30 minutes,” the AI will identify Fitness, Convex will save the activity, and the 3D map will show growth. Without one world-model module, each area could calculate a slightly different result.

### What would move

The island, activity, daily-node, growth, and rock rules would live together in one life-map module. AI interpretation would supply structured activity information. The life-map module would decide the map change. Convex would save that result, and the renderer would display it.

```text
Before
AI decision ─┬─> Convex guesses growth
             └─> 3D map guesses growth

After
AI decision ─> Life-map module ─> saved map state ─> 3D renderer
```

This seam has high leverage because onboarding, daily check-ins, history, growth, rocks, and future archipelagos all depend on it. Tests can cover the real product rules through one interface. The implementation can absorb the scoring details while keeping that interface small.

## 2. Map exploration

Recommendation strength: **Worth exploring**

### The current shape

`src/components/direct-island-world.tsx` currently owns many jobs: WebGPU startup, the frame loop, dragging, inertia, camera movement, island selection, territory lines, the perimeter, and label positions. `src/lib/map-camera-policy.ts`, `src/lib/world-layout.ts`, and `src/lib/world-view-store.ts` hold related pieces.

Example: changing how a new island shifts territories may require reading layout code, camera limits, the renderer, and the screen-label store together.

### What would move

Camera movement, selection, zoom, map limits, and territory navigation would move behind one map-exploration module. The WebGPU renderer and screen overlay would use its state instead of coordinating those rules themselves.

```text
Before
drag + camera + territories + labels + rendering
                all meet in one large screen module

After
touch input ─> Map-exploration module ─> camera and label state
                                      └> WebGPU adapter
```

This improves locality for navigation bugs and gives tests one interface for dragging, zooming, and limits. The seam gains more value when a second adapter exists, such as a lightweight fallback renderer. Until then, this has less leverage than the life-map model.

## 3. Daily check-in flow

Recommendation strength: **Worth exploring**

### The current shape

`src/components/check-in-modal.tsx` contains the screen, sample chat messages, questionnaire definitions, answer progress, and completion behavior. The chat and questionnaire currently end in separate local UI actions and do not yet produce a shared activity result.

Example: “I ran with a friend” entered in chat and the same answer entered through questionnaires should create the same Fitness and Relationships activity records.

### What would move

Conversation progress, questionnaire progress, validation, and the shared check-in result would move into one daily-check-in module. The chat screen and questionnaire screen would become two adapters that feed the same flow.

```text
Before
chat path ─────────────> local chat result
questionnaire path ────> local questionnaire result

After
chat adapter ──────────┐
                      ├─> Daily check-in module ─> activity result
questionnaire adapter ─┘
```

This gives the two experiences one tested seam. The module has useful leverage once real AI streaming, retries, saved conversations, and questionnaire generation arrive.

## 4. Authenticated life-map persistence

Recommendation strength: **Strong foundation**

### The current shape

`index.ts` provides Clerk and `App.tsx` protects the local screen. Convex persistence is being added. Every future Convex query and write must derive the current Clerk user and keep that user’s islands, activities, conversations, nodes, and rocks private.

Example: if Alice and Bob both have a Fitness island, Alice’s history query must never be able to return Bob’s activities, even if a client sends Bob’s record ID.

### What would move

Clerk identity lookup, ownership checks, and user-scoped Convex access would live behind one persistence module. Each Convex operation would enter through that seam before reading or changing life-map data.

```text
Before
Convex operation A ─> its own ownership check
Convex operation B ─> its own ownership check
Convex operation C ─> its own ownership check

After
Clerk identity ─> Private persistence module ─> user-owned records
```

This creates locality for privacy rules and gives security tests one interface to exercise with two users. ADR 0002 already chooses Clerk and Convex. This candidate concerns the internal shape of their seam; it does not reopen that decision.

## Earlier top recommendation

The earlier scan recommended exploring the **life-map world model first**. The reason is dependency order: Convex needs to know what map state to save, AI needs to know what structured result to request, and the renderer needs to know what growth or rock state to draw.

A simple analogy is a board game. The life-map module would hold the game rules. Clerk identifies the player, Convex stores the game, AI translates the player’s story into a move, and the 3D world draws the board.

That recommendation remains a proposal. The next step is a product and architecture conversation before code moves.
