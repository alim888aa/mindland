# Mindland context

## Mission

Mindland is a mobile self-management app that turns a person’s goals and daily actions into an evolving map of islands. The map should help the user see where their life is growing, where it is being neglected, and whether their actions align with what matters to them.

## Core experience

V1 is an iPhone-focused hackathon demo of the complete main loop. Clerk provides accounts through Apple and email/password sign-in. Convex stores persistent app data.

The first AI interview is an adaptive conversation, with roughly five to twelve messages as a soft target. It learns what matters to the user and automatically creates roughly three to five initial islands. The user then sees an island reveal where they can rename or remove them. Later conversations may discover more islands, but the app asks permission before creating them.

Every activity belongs to its most specific island or islands. An activity such as running with a friend creates one node on Health and one on Relationships. Those nodes stay inside their own territories and appear near the shared border.

The check-in screen follows the original wireframe: island names appear as questionnaire entry points while a text field remains available at the bottom. The user can start typing immediately to talk with the AI, or tap an island to complete its AI-generated structured questionnaire. Both paths create the same underlying activity records and map changes.

AI conversations are saved so they can eventually be revisited. A conversation-history screen is useful later but is not required for V1.

New islands begin as small pieces of land with no completed-activity nodes. Positive activity grows both their land area and their visible contents, such as trees, hills, paths, and buildings. Repeated harmful activity accumulates negative points and eventually creates a visible rock. Rocks weigh an island down slowly, remain as reminders, and may eventually sink it. A sunken island can resurface through renewed activity.

Each island has a zoomed terrain view plus a summary and history. Related islands may later form archipelagos, but archipelago behavior is outside the first version.

## World and territory behavior

The map is a bounded open world that the user can move through horizontally and vertically. Its outer perimeter expands when new islands require more space.

Every island owns a territory. Related new islands appear near one another, and adding them can shift existing islands and territory boundaries. Cross-island activity creates separate nodes inside each affected island, placed toward their shared boundary. Repeated overlap may eventually create a sandbar, while one-off overlap does not.

## Activity records and emerging islands

Every recorded activity preserves its original user message alongside structured metadata such as activity, duration, time, affected islands, sentiment, and tags.

Repeated activity may suggest a more specific island. For example, Guitar can emerge from Hobbies when guitar-related tags appear in at least ten nodes within the last month and are also supported by frequency, recency, and total time. The app asks permission before creating this later island. If accepted, relevant historical nodes migrate to it.

## Growth and decline rules

Each completed positive activity normally creates one positive node and one lifetime positive point on every affected island. Negative activity accumulates separately. Reaching the chosen negative threshold creates one visible rock.

An island’s long-term survival favors lifetime progress. Sinking compares its visible rock count with its lifetime positive-point count. For example, an island with twenty lifetime positive points remains above water until it reaches twenty rocks, even though each rock represents several negative points. The negative-points-per-rock threshold is still undecided.

A submerged island remains visible as a reminder and can resurface through renewed positive activity.

## Open product questions

The exact negative-points threshold that creates one rock still needs a decision. The detailed sinking and resurfacing formulas also need to be written and tested against examples.

The exact interview prompts, structured questionnaire, island-history experience, Convex schema, AI architecture, correction policy, and map expansion limits remain to be designed.

## Current status

The repository contains an Expo 57 prototype with a procedural 3D map, four distinct islands, territory lines, island zooming, and a visual check-in entry point. The complete user loop and persistent data model are still unbuilt.

The current phase is [Phase 1: Initial loop](docs/phases/phase-1-initial-loop/README.md).
