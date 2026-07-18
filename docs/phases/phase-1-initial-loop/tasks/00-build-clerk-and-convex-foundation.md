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

Cloud deployment creation is paused because the Convex account belongs to five teams and the user must choose which one owns Mindland. Clerk's development instance has email and password enabled. Apple is enabled but its Team ID and native bundle registration are still blank, and the Clerk Convex integration has not yet created its JWT template.

## Verification

`clerk doctor --json` passed host execution, authentication, repository linking, application reachability, and environment checks. Read-only Clerk configuration confirmed email/password and Apple are enabled. The linked instance currently has no Convex JWT template.

Expo prebuild applied the Clerk, SecureStore, WebGPU, and Apple-sign-in native configuration. CocoaPods installed 111 pods, including ClerkExpo and ClerkKit. A clean unsigned iPhone Simulator build compiled successfully with Xcode, installed into the dedicated Mindland simulator, and opened its native development launcher. Two independent Clerk reviews found no actionable code issues. A complete sign-in remains blocked on the Clerk dashboard's Native API and Apple Team configuration.

## Commit

Pending.
