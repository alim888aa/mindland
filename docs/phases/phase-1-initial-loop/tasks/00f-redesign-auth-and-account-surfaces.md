# Redesign auth and account surfaces

Status: completed

Owner: primary

Parent: Build the Clerk and Convex foundation

## Outcome

Make sign-in, sign-up, and account management feel like Mindland's Liquid Glass lagoon experience while preserving Clerk authentication, security, and account controls.

## Requested direction

Replace the visually disconnected default presentation with a warm native glass treatment that matches the rest of Mindland. Keep every existing account capability, including sign-in, sign-up, profile editing, security, and sign-out.

Build custom Mindland Liquid Glass sign-in and sign-up screens on Clerk's authentication hooks. Keep Clerk's prebuilt native profile and security surface, but place it inside a Mindland-owned themed glass presentation. Apple and email/password remain required authentication paths.

## Open decisions

Choose the coarse Clerk theme tokens and the surrounding account-sheet composition during implementation.

## Done when

The complete Clerk flow remains functional and private, the important account controls remain reachable, and the iPhone simulator shows one coherent Mindland visual language across authentication and account management.

## Result

Implemented Mindland-owned lagoon auth screens for Apple and email/password, including email verification, password reset, supported second factors, CAPTCHA, and maintained Clerk handoff for uncommon or pending security requirements. The map avatar now opens a water-backed custom Liquid Glass account landing sheet with avatar, name, email, Manage account, and Sign out. Manage account hands off to Clerk's maintained profile and security experience, with a clear return to the Mindland sheet.

## Verification

Targeted code review passed after repairing incomplete sign-up handoff, silent Apple cancellation, and factor-specific verification wording. `npx tsc --noEmit` and `git diff --check` pass. The iOS simulator verified opening and closing the custom sheet, entering Clerk's maintained account/security controls, and returning without losing the signed-in session.

## Commit

Pending.
