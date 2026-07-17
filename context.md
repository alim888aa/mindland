# Mindland context

## Mission

Mindland is a mobile self-management app that turns a person’s goals and daily actions into an evolving map of islands. The map should help the user see where their life is growing, where it is being neglected, and whether their actions align with what matters to them.

## Core experience

V1 is an iPhone-focused hackathon demo of the complete main loop. Clerk provides accounts through Apple and email/password sign-in. Convex stores persistent app data.

The first AI interview opens with a broad question such as “What parts of your life would you like to grow?” It continues as an adaptive conversation, with roughly five to twelve messages as a soft target. It creates only the meaningful islands it actually discovers, typically three to five but sometimes fewer.

The AI normally asks one question per message. Onboarding establishes islands and their purposes but does not create activity nodes, positive points, negative points, or rocks.

Broad interests are split into the specific islands that the user actually cares about. For example, Health can create Fitness, Nutrition, and Sleep islands, which may later form a Health archipelago. V1 displays the specific islands without a visible Health umbrella. The user then sees a guided reveal that highlights each island and briefly explains why it was created. They may rename or remove an island, but cannot add one during the reveal. Later conversations may discover more islands, but the app asks permission before creating them.

Every activity belongs to its most specific island or islands. An activity such as running with a friend contributes to that day’s summarized node on Fitness and that day’s summarized node on Relationships. Those nodes stay inside their own territories and appear near the shared border.

The check-in screen follows the original wireframe: island names appear as questionnaire entry points while a text field remains available at the bottom. The user can start typing immediately to talk with the AI, or tap an island to complete its AI-generated structured questionnaire. Both paths create the same underlying activity records and map changes.

AI conversations are saved so they can eventually be revisited. A conversation-history screen is useful later but is not required for V1.

New islands begin as small pieces of land with no completed-activity nodes. Positive activity grows both their land area and their visible contents, such as trees, hills, paths, and buildings. Repeated harmful activity accumulates negative points and eventually creates a visible rock. Rocks weigh an island down slowly, remain as reminders, and may eventually sink it. A sunken island can resurface through renewed activity.

Each island has a zoomed terrain view plus a summary and history. Related islands may later form archipelagos, but archipelago behavior is outside the first version.

## World and territory behavior

The map is a bounded open world that the user can move through horizontally and vertically. Its outer perimeter expands before an island or territory approaches the available edge.

Every island owns a territory. Related new islands appear near one another, and adding them can shift existing islands and territory boundaries. Cross-island activity creates separate nodes inside each affected island, placed toward their shared boundary. Repeated overlap may eventually create a sandbar, while one-off overlap does not.

## Activity records and emerging islands

Every recorded activity preserves its original user message alongside structured metadata such as activity, duration, time, affected islands, sentiment, and tags.

Repeated activity may suggest a more specific island. For example, Guitar can emerge from Hobbies when guitar-related tags appear in at least ten nodes within the last month and are also supported by frequency, recency, and total time. The app asks permission before creating this later island. If accepted, relevant historical nodes migrate to it.

## Growth and decline rules

Each island receives at most one summarized positive node and one lifetime positive point per calendar day. That node combines every supportive activity recorded for that island on that day. Duration and frequency remain in the underlying activity records but do not multiply growth points.

Each daily positive node adds a small visible detail chosen from a prepared visual catalogue using the activity context and island purpose. Every five positive points also expands the land or adds a larger feature.

Each island receives at most one negative point per calendar day that contains harmful activity for that topic. Every five accumulated negative points creates one visible rock.

An island may receive both one positive point and one negative point on the same day. Additional check-ins on that day update the existing daily summaries instead of creating extra nodes or points. V1 accepts activity for the current user-local calendar day only and does not backdate logs.

An island’s long-term survival favors lifetime progress. One visible rock counts the same as one lifetime positive point when evaluating sinking. For example, an island with twenty lifetime positive points remains above water until it reaches twenty rocks, even though creating those rocks requires one hundred negative points.

A submerged island remains visible as a reminder and resurfaces as soon as its lifetime positive-point count becomes greater than its visible rock count.

The system preserves the original activity entry. Corrections remain visible in history, and an accidental submission can be undone for five minutes.

## Open product questions

The detailed sinking and resurfacing formulas still need to be written and tested against examples.

The dedicated pre-interview explanation, exact interview prompts, GPT-5.6 Luna reasoning strategy, structured questionnaire, island-history experience, Convex schema, AI architecture, and map expansion limits remain to be designed.

## Current status

The repository contains an Expo 57 prototype with a procedural 3D map, four distinct islands, territory lines, island zooming, and a visual check-in entry point. The complete user loop and persistent data model are still unbuilt.

The current phase is [Phase 1: Initial loop](docs/phases/phase-1-initial-loop/README.md).
