# ADR 0002: Use Convex for accounts and persistence

Status: accepted

Date: 2026-07-16

## Context

V1 needs user accounts and persistent storage for interviews, AI conversations, islands, activities, nodes, and rocks. The main loop should continue to work across app sessions.

## Decision

Use Convex as the V1 backend and persistence system. Build an account flow on top of it. Choose the exact sign-in method after a separate product decision.

## Reason

The user selected Convex so the hackathon demo can include real accounts and persistent personal maps while keeping the backend within one system.

## Consequences

Phase 1 includes Convex setup, authentication, data ownership rules, schema design, and an online connection for synced features. AI conversations will be stored for future revisit even though conversation-history browsing is outside V1.
