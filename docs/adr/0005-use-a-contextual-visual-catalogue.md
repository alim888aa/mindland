# ADR 0005: Use a contextual visual catalogue

Status: accepted

Date: 2026-07-16

## Context

Positive nodes should add trees, hills, paths, buildings, and other details that make sense for the activity and island. The 3D renderer needs predictable assets it can place reliably on an iPhone.

## Decision

Prepare a catalogue of supported visual details. Let the AI choose a fitting semantic detail using the daily activity summary and island purpose. Store that choice with the node so the renderer can reproduce it.

## Reason

This gives the AI contextual influence while keeping the visual system stable, testable, and performant.

## Consequences

V1 needs a small visual catalogue, rules for which details fit each island theme and growth stage, and safe fallback details when the AI’s preferred choice is unavailable.
