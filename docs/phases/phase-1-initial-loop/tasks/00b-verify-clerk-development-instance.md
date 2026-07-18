# Verify the Clerk development instance

Status: completed

Owner: clerk-verification-agent

## Outcome

Verify the linked Clerk development application has the native mobile and Convex JWT settings required by the Expo app.

## Boundaries

Perform read-only inspection first. Record exact missing configuration and safe verification steps. Do not change source files or dashboard settings.

## Done when

Native API availability, email/password, Apple, the Convex JWT template or integration, and a safe two-user privacy test path are all reported with evidence.

## Result

The repository is linked to Clerk application `mindland` and its development instance. Native API requests are enabled. Email/password and email-code sign-in are configured; a real native sign-in still needs end-to-end verification.

Apple appears as an enabled sign-in option, and the iOS build has the Apple sign-in entitlement for bundle `com.alimaa555.mindland`. Clerk has no registered iOS application, and the local Xcode project has no Development Team. Add the iOS application under Clerk's Native applications page using the Apple Developer Team ID and `com.alimaa555.mindland`, configure Xcode signing, then verify a real Apple sign-in.

The development instance has a `convex` JWT template with audience `convex`. Its shape matches the expected integration, while real token issuance and Convex acceptance remain to be verified through an authenticated session.

Two development-only Clerk test users were created after this read-only audit. They are reserved for the native two-user privacy pass and should be removed when the development proof is no longer useful.

## Verification

`clerk doctor --json` passed host execution, CLI version, authentication, repository linking, application reachability, and environment checks. It resolved application `mindland` and the development instance; no production instance exists yet.

`GET /environment?_is_native=true` returned a successful native environment response. Clerk documents that the same request returns `native_api_disabled` with HTTP 400 when Native API is off, so this confirms Native API is enabled. The response listed `password`, `email_code`, `oauth_apple`, and `oauth_token_apple` among the available first factors and preferred password sign-in.

The pulled development config reported password authentication enabled and required, email enabled for sign-up/sign-in, and Apple enabled. Apple's `team_id`, `bundle_id`, `client_id`, and `key_id` fields were empty. Read-only dashboard inspection found no registered iOS application. Local inspection found the matching Apple entitlement in `ios/mindland/mindland.entitlements`, while the Xcode project has no `DEVELOPMENT_TEAM` configured.

`GET /jwt_templates` returned one template named `convex` with claim `aud: convex`, a 3,600-second lifetime, and five seconds of allowed clock skew.

`GET /users/count` returned zero. Direct local variable-name inspection found only `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` in `.env`; no Clerk server secret is currently stored in `.env` or `.env.local`.

Official Native API behavior reference: https://clerk.com/docs/guides/development/errors/frontend-api#native-api-disabled

## Commit

Not committed; this verification belongs to the primary agent's foundation slice.
