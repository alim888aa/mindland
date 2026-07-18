# Verify the private Convex foundation

Status: completed

Owner: convex-foundation-agent

## Outcome

Link the existing `mindland` Convex development deployment and build the smallest server-side proof that Clerk identity scopes every read and write to the current user.

## Boundaries

Own `convex/` backend files only. Do not change the Expo provider, map, check-in UI, package versions, or the wider life-map schema. Use a temporary private proof record rather than deciding the final domain model.

## Done when

The cloud functions deploy, unauthenticated access is rejected, authenticated records are filtered by the server-derived Clerk identity, and the OpenAI key can be exercised from a protected server action without entering the app bundle.

## Result

The existing `adventurous-zebra-515` development deployment is now configured
to validate Clerk tokens through the configured issuer and the `convex`
application ID.

A temporary `privateProofRecords` table proves the privacy boundary without
deciding the future life-map schema. Both its query and mutation derive the
owner from Convex's verified `ctx.auth` identity. The client cannot provide or
choose an owner ID. Queries use the owner index and omit that internal owner ID
from their response.

The internal OpenAI health action checks authentication first and then calls
OpenAI's models endpoint with the server-owned Convex environment key. It
returns only `{ ok: true }` and never returns the key or the model list. The
action is internal after verification so a signed-in client cannot repeatedly
consume Convex action capacity or OpenAI rate limits.

## Verification

`npx convex dev --once` deployed the auth configuration, schema, owner index,
queries, mutation, and action successfully to the existing development
deployment.

The deployment exposes exactly the expected server environment names:
`CLERK_JWT_ISSUER_DOMAIN` and `OPENAI_API_KEY`. Their values were never printed.

Unauthenticated calls to `privateProofRecords:listMine`,
`privateProofRecords:saveMine`, and `openaiHealth:check` each failed with the
server's `UNAUTHENTICATED` error. The OpenAI action rejected the anonymous call
before reading or using the key.

A synthetic authenticated identity A inserted one harmless proof record.
Identity B received `[]` from `listMine`, while identity A received exactly its
own record. This verifies the server-side ownership query independently of the
mobile UI.

An authenticated call to `openaiHealth:check` returned `{ "ok": true }`, which
verifies the rotated Convex-only OpenAI key can authenticate from the server.
The action was then changed to an internal function before handoff.
After redeployment, a direct CLI call could no longer resolve it as a public
function, while the generated API exposes it only through `internal` rather
than the client-facing `api` object.

The real Clerk-token-to-Convex mobile path remains part of task 00b and the
primary foundation task. This task deployed the official Clerk issuer config
that path requires and verified the backend authorization behavior without
claiming an end-to-end Clerk sign-in.

## Commit

`13a982a` (`feat: connect Clerk to private Convex data`)
