# Support fresh Clerk account creation

Status: completed

Owner: primary-agent

Depends on: Verify native Clerk end to end

## Outcome

A signed-out development user can create a real Clerk account with email and password, verify the email code, receive a private Convex session, and immediately begin a fresh onboarding interview.

## Done when

The development auth screen supports sign in, create account, email-code verification, resend, and changing the email. Clerk errors are visible, bot protection has its required mount point, the session finalizes through the current Clerk Expo API, and one real simulator signup reaches onboarding.

## Result

The development auth screen now supports real Clerk email/password sign-in and account creation, including email-code verification, resend, returning to a different email, client-trust verification, visible Clerk errors, and Clerk's CAPTCHA mount point. Successful verification finalizes the Clerk session and opens the user's private Convex-backed onboarding.

## Verification

Focused TypeScript validation passed without adding auth-screen errors. The simulator completed a disposable Clerk test signup with email/password and code verification, then reached a fresh private onboarding interview. A reviewer checked the current Clerk method API, session finalization, verification states, privacy, CAPTCHA placement, error handling, and forbidden hooks and reported clean. The disposable account was signed out, and the simulator was returned to an empty signup form for the user.

## Commit

Pending.
