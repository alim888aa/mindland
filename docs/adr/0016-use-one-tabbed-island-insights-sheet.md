# ADR 0016: Use one tabbed island insights sheet

Status: accepted

Date: 2026-07-22

## Context

Each focused island needs a quick current summary and a detailed chronological history. Two separate entry points would add more map controls and make the relationship between current state and its evidence less clear.

## Decision

Use one draggable Liquid Glass sheet opened from a focused island. Slide it directly to near-full height and allow downward collapse. Show Summary first and History second in a segmented tab control.

Summary shows the island purpose, stored condition, lifetime positive and negative points, rocks, growth steps, and visible props. History lists newest days first and expands a selected day inline to its stored activities, original messages, and questionnaire answers.

## Reason

One compact map control keeps the focused view calm. Tabs keep the current state and its supporting record together, while the translucent sheet preserves some island context behind it.

## Consequences

The sheet reads the existing private Convex models and never recalculates scores. The map pauses navigation while the sheet is open. Longer history uses bounded pagination, and daily source details remain hidden until the user expands that day.
