# Verify native Clerk end to end

Status: completed

Owner: primary agent

## Result

Mindland now compiles Clerk, Expo Secure Store, Convex authentication, and Apple authentication into the native iOS development build.

The Apple Team ID is `WRRAJYP22V`. The iOS bundle identifier is `com.alimaa555.mindland`, and the generated native project contains the Sign in with Apple entitlement.

## Verification

The Expo iOS build completed successfully in Xcode and was installed on the iPhone 16 simulator.

Two disposable Clerk development users signed in through the native Clerk UI with email and password. Clerk requested its test device verification code, accepted it, and issued real sessions to the app.

User A saved one private Convex marker. User B then signed in and saw zero markers before saving its own marker. Returning to User A showed exactly one marker. This verifies that real Clerk JWTs reach Convex and records remain private to their owner.

After terminating and relaunching the app, User A remained signed in and still saw its one marker. This verifies Secure Store session persistence.

The Apple button opened the native Apple system prompt. The simulator stopped at “Sign in to your Apple Account” because no Apple Account is configured in that simulator. A production Apple sign-in test also requires Apple Developer Program credentials; the currently selected Xcode team is a Personal Team.

TypeScript passed after the final auth-state handoff fix. An independent review found no remaining correctness or security issues.

## Local development note

The first Metro bundle was unusually slow because the repository lives in a macOS file-provider folder. Once cached, the same native bundle completed in under a second. This is a local development storage issue and did not affect the running app’s Clerk or Convex behavior.

## Commit

Pending.
