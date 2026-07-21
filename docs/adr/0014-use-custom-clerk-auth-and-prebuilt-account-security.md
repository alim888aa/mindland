# ADR 0014: Use custom Clerk auth and prebuilt account security

Status: accepted

Date: 2026-07-21

## Context

Clerk's prebuilt native authentication and profile surfaces preserve important security behavior but expose only coarse visual theming. Mindland needs sign-in and sign-up to feel like the same Liquid Glass lagoon as the rest of the app without taking ownership of every profile, verification, session, and security feature.

## Decision

Build custom Mindland Liquid Glass sign-in and sign-up screens on Clerk's supported Expo hooks. Support Apple and email/password through those screens.

Retain Clerk's prebuilt native profile and security surface for account management. Apply Clerk's available theme tokens and present that surface inside a Mindland-owned glass composition.

Hand uncommon incomplete sign-up, sign-in, and pending-session security requirements to Clerk's maintained native `AuthView` rather than duplicating every security task in the custom shell.

## Reason

This gives the first-use experience a distinctive Mindland identity while keeping Clerk responsible for the large, security-sensitive account-management surface.

## Consequences

The custom auth flow must explicitly handle sign-in, sign-up, email verification, supported second factors, errors, loading, CAPTCHA, session finalization, restart persistence, and Apple authentication. Account management may remain less visually flexible inside its themed container, but profile editing, connected accounts, sessions, security, deletion, and sign-out retain Clerk's maintained behavior.
