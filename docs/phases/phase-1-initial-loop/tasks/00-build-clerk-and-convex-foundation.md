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

The existing `mindland` Convex development deployment under team `alim888aa` is linked. Its temporary proof table and functions derive ownership from Convex's verified Clerk identity, reject anonymous callers, and never accept an owner ID from the client. Clerk's development instance has email/password enabled, Native API access enabled, and a `convex` JWT template with the expected audience. Apple is enabled. The local iOS configuration now uses Apple Team ID `WRRAJYP22V`, bundle `com.alimaa555.mindland`, and the Sign in with Apple entitlement.

The exposed server keys were rotated. The replacement OpenAI key and Clerk issuer live in Convex's server environment, while Expo loads only public Clerk and Convex values. Clerk uses its Expo Secure Store token cache in development and production builds.

## Verification

`clerk doctor --json` passed host execution, authentication, repository linking, application reachability, and environment checks. Read-only Clerk configuration confirmed email/password, Native API access, Apple, and the `convex` JWT template.

Expo prebuild applied the Clerk, SecureStore, WebGPU, and Apple-sign-in native configuration. CocoaPods installed 112 pods, including ClerkExpo, ClerkKit, and ExpoAppleAuthentication. A clean iPhone Simulator build compiled successfully with Xcode and installed into the dedicated Mindland simulator.

Two real Clerk development accounts signed in through the native email/password flow. User A saved one private Convex marker. User B saw zero markers before saving its own marker, and returning to User A showed exactly one marker. User A remained signed in with the same private marker after terminating and relaunching the app. This verifies real Clerk JWT acceptance, A/B record isolation, and Secure Store session persistence.

The Apple button reaches the native Apple system prompt. The simulator has no Apple Account configured, so the provider test stops there. Production Apple credentials also require Apple Developer Program membership; the selected Xcode team is currently a Personal Team.

The clean Metro bundle completed successfully with 1,501 modules in 132.7 seconds after the dependency folder was restored from the lockfile; a cached rebuild completed in 2.8 seconds. Anonymous Convex reads and writes fail, synthetic identities cannot see one another's records, and the internal OpenAI check authenticated with the rotated server key. A final independent review found no code-level auth, privacy, action-exposure, or banned-hook issue.

## Commit

Pending.
