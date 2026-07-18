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

The repository is linked to Clerk application `mindland` and its development instance. Native API requests are enabled. Email/password and email-code sign-in are configured. A later native test completed email/password sign-in, real JWT exchange with Convex, two-user data isolation, and session persistence.

Apple appears as an enabled sign-in option. The local iOS configuration now uses Apple Team ID `WRRAJYP22V`, bundle `com.alimaa555.mindland`, and the Apple sign-in entitlement. The native button reaches Apple's system account prompt. A complete provider test still needs an Apple Account on the simulator or a real device, and production credentials need Apple Developer Program membership.

The development instance has a `convex` JWT template with audience `convex`. Real Clerk token issuance and Convex acceptance passed through two authenticated native sessions.

Two development-only Clerk test users were created after this read-only audit. They are reserved for the native two-user privacy pass and should be removed when the development proof is no longer useful.

## Verification

`clerk doctor --json` passed host execution, CLI version, authentication, repository linking, application reachability, and environment checks. It resolved application `mindland` and the development instance; no production instance exists yet.

`GET /environment?_is_native=true` returned a successful native environment response. Clerk documents that the same request returns `native_api_disabled` with HTTP 400 when Native API is off, so this confirms Native API is enabled. The response listed `password`, `email_code`, `oauth_apple`, and `oauth_token_apple` among the available first factors and preferred password sign-in.

The pulled development config reported password authentication enabled and required, email enabled for sign-up/sign-in, and Apple enabled. At the time of the audit, Apple's `team_id`, `bundle_id`, `client_id`, and `key_id` fields were empty. The later local native build configured `DEVELOPMENT_TEAM = WRRAJYP22V` and generated the matching Apple entitlement. Clerk's shared development Apple setup is sufficient to open the native system prompt; production credentials remain pending.

`GET /jwt_templates` returned one template named `convex` with claim `aud: convex`, a 3,600-second lifetime, and five seconds of allowed clock skew.

`GET /users/count` returned zero. Direct local variable-name inspection found only `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` in `.env`; no Clerk server secret is currently stored in `.env` or `.env.local`.

Official Native API behavior reference: https://clerk.com/docs/guides/development/errors/frontend-api#native-api-disabled

## Commit

`13a982a` (`feat: connect Clerk to private Convex data`)
