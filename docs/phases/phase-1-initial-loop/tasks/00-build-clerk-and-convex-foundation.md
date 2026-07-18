# Build the Clerk and Convex foundation

Status: in-progress

Owner: primary agent

## Outcome

Give each V1 user a Clerk account through Apple or email/password and a persistent Convex-backed home for their profile, conversations, islands, activities, nodes, and rocks.

## Done when

Both approved sign-in flows work on iPhone, Clerk identity maps reliably to Convex data, one user cannot access another user’s records, and the minimum Phase 1 data can be created, loaded, and updated reliably.

## Result

Clerk CLI initialization is linked to the Mindland development application. The Expo SDK, secure token storage, development client, Convex client, Convex Agent component, and OpenAI provider packages are installed locally.

The app now has a native Clerk gate. While Clerk restores a session it shows the ocean loading state, signed-out users receive Clerk's native sign-in-or-sign-up view, and only an active session enters the island world. Clerk session tokens use the Expo SecureStore-backed token cache.

The existing `mindland` Convex development deployment under team `alim888aa` is linked. Its temporary proof table and functions derive ownership from Convex's verified Clerk identity, reject anonymous callers, and never accept an owner ID from the client. Clerk's development instance has email/password enabled, Native API access enabled, and a `convex` JWT template with the expected audience. Apple is enabled, while its Team ID, native bundle registration, and local signing team are still blank.

The exposed server keys were rotated. The replacement OpenAI key and Clerk issuer live in Convex's server environment, while Expo loads only public Clerk and Convex values. A development-only memory-cache flag lets the ad-hoc simulator app exercise Clerk without the unavailable signing entitlement; ordinary builds keep Clerk's secure token cache.

## Verification

`clerk doctor --json` passed host execution, authentication, repository linking, application reachability, and environment checks. Read-only Clerk configuration confirmed email/password, Native API access, Apple, and the `convex` JWT template.

Expo prebuild applied the Clerk, SecureStore, WebGPU, and Apple-sign-in native configuration. CocoaPods installed 111 pods, including ClerkExpo and ClerkKit. A clean unsigned iPhone Simulator build compiled successfully with Xcode, installed into the dedicated Mindland simulator, and opened Clerk's native sign-in screen. The development memory-cache flag removed the JavaScript SecureStore failure. Submitting the first test user's real email/password then ended with Clerk's “You are signed out” state instead of an active session. The cause of that final session failure is not proven, so native A/B isolation remains unverified and a properly signed build is the next test path. Apple sign-in separately waits on the Apple Developer Team configuration.

The clean Metro bundle completed successfully with 1,501 modules in 132.7 seconds after the dependency folder was restored from the lockfile; a cached rebuild completed in 2.8 seconds. Anonymous Convex reads and writes fail, synthetic identities cannot see one another's records, and the internal OpenAI check authenticated with the rotated server key. A final independent review found no code-level auth, privacy, action-exposure, or banned-hook issue.

## Commit

Pending.
