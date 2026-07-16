# ADR 0004: Score island change in five-point milestones

Status: accepted

Date: 2026-07-16

## Context

Daily activities need to produce visible progress without making land growth or rocks appear too quickly. The visuals should also reflect what the user actually did.

## Decision

Give each positive activity one node and one lifetime positive point on every affected island. Add a small contextual visual detail for each positive node. Every five positive points expands land or adds a larger contextual feature.

Accumulate negative points separately. Every five negative points creates one visible rock. Preserve the original activity entry, retain corrections in history, and allow accidental submissions to be undone for five minutes.

## Reason

Five-point milestones keep larger visual changes gradual while every completed action still leaves a visible trace. Preserving corrections protects the map from AI misunderstandings without hiding the history.

## Consequences

The AI must describe the meaning of an activity well enough for the visual system to select a fitting detail. The domain model must keep lifetime positive points, pending negative points, visible rocks, correction history, and undo timing separate.
