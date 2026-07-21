# ADR 0012: Persist and stream AI conversations through Convex

Status: accepted

Date: 2026-07-19

## Context

The onboarding interview and later daily check-ins need responsive AI replies, private durable history, and reliable resume behavior after the app closes or loses its connection.

## Decision

Run model requests in authenticated Convex actions using the AI SDK and the server-side OpenAI key. Stream assistant text through Convex's reactive data path. Persist every user and assistant message in Convex, including conversation purpose and completion state, so the same user can resume an interrupted interview.

The mobile app never calls OpenAI directly. Corrections remain normal chat messages, preserving the original conversation instead of silently editing earlier messages.

## Reason

This keeps the OpenAI secret on the server, gives Clerk-authenticated ownership one enforcement point, and makes streamed text and durable history part of the same backend flow.

## Consequences

The implementation needs idempotent message submission, partial-stream recovery, private thread ownership, and a clear transition from interviewing to ready-to-create. The same conversation foundation should later support daily conversational check-ins.
