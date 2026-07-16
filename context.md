# Mindland context

## Mission

Mindland is a mobile self-management app that turns a person’s goals and daily actions into an evolving map of islands. The map should help the user see where their life is growing, where it is being neglected, and whether their actions align with what matters to them.

## Core experience

The first AI interview learns what matters to the user and automatically creates roughly three to five initial islands. Later conversations may discover more islands, but the app asks permission before creating them.

Every activity belongs to its most specific island or islands. An activity such as running with a friend creates one node on Health and one on Relationships. Those nodes stay inside their own territories and appear near the shared border.

The user can check in through an AI conversation or a structured questionnaire generated from each island’s core questions and personal adaptations. Both paths create the same underlying activity records and map changes.

Positive activity grows an island through nodes. Repeated harmful activity accumulates negative points and eventually creates a visible rock. Rocks weigh an island down slowly, remain as reminders, and may eventually sink it. A sunken island can resurface through renewed activity.

Each island has a zoomed terrain view plus a summary and history. Related islands may later form archipelagos, but archipelago behavior is outside the first version.

## Open product questions

The exact negative-points threshold that creates one rock still needs a decision. The detailed sinking and resurfacing formulas also need to be written and tested against examples.

The exact AI interview, structured questionnaire, island-history experience, persistence system, and backend architecture remain to be designed.

## Current status

The repository contains an Expo 57 prototype with a procedural 3D map, four distinct islands, territory lines, island zooming, and a visual check-in entry point. The complete user loop and persistent data model are still unbuilt.

The current phase is [Phase 1: Initial loop](docs/phases/phase-1-initial-loop/README.md).
