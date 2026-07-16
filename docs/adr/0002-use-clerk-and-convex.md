# ADR 0002: Use Clerk and Convex

Status: accepted

Date: 2026-07-16

## Context

V1 needs user accounts and persistent storage for interviews, AI conversations, islands, activities, nodes, and rocks. The main loop should continue to work across app sessions.

## Decision

Use Clerk for V1 accounts with Apple and email/password sign-in. Use Convex as the backend and persistence system for app data.

## Reason

The user selected Clerk and Convex so the hackathon demo can include real accounts and persistent personal maps.

## Consequences

Phase 1 includes Clerk integration, Convex setup, identity mapping, data ownership rules, schema design, and an online connection for synced features. AI conversations will be stored for future revisit even though conversation-history browsing is outside V1.
