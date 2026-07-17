# ADR 0007: Keep onboarding separate from scoring

Status: accepted

Date: 2026-07-17

## Context

The onboarding conversation may discuss goals, struggles, past behavior, and even activities from today. Treating those statements as daily logs could create accidental progress or rocks before the user has seen their map.

## Decision

Use onboarding only to discover islands, their purposes, and their initial visual themes. Create no activity nodes, positive points, negative points, or rocks from the onboarding conversation.

After sign-in, explain Mindland in one sentence and begin the interview immediately. After creation, reveal the islands through short guided highlights that advance automatically without a Next button. Keep a Skip control for ending the guide. Allow rename and remove during the reveal while requiring at least one island to remain. Do not allow adding an island there; later conversations may propose new islands through the established permission flow.

After the reveal, land on the map and let the user explore before they choose Check in.

## Reason

This gives the user a clear boundary between setting up their map and recording their life.

## Consequences

The AI system must label onboarding and daily check-ins as separate conversation purposes. A user who mentions today’s activity during onboarding must record it again through the daily check-in flow if they want it scored.
