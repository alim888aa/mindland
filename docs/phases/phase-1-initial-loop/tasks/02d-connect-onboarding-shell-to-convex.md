# Connect the onboarding shell to Convex

Status: completed

Owner: onboarding-client-agent

Depends on: Build the persistent streaming interview backend; Build the liquid-glass interview shell

## Outcome

Create the client controller that starts or resumes the private onboarding thread, subscribes to saved and streaming messages, sends idempotent answers, retries failed generation, feeds the AI-controlled progress bar, and reveals candidate names only after Create my map.

## Done when

The controller uses the generated Convex API and Agent streaming subscription, maps visible text messages into the presentational shell, preserves a retry request ID, resumes after reopening, starts safely without forbidden React lifecycle hooks, and exposes a clean reveal callback for app-level navigation. It does not alter the map or root app integration.

## Result

Added a focused client controller that starts or resumes the signed-in user's interview from a guarded layout event, subscribes to saved and in-progress Agent messages over Convex, and maps only visible assistant and user text into the presentational shell.

Answers use a stable client request ID for idempotent send and retry attempts. The controller reflects queued and streaming generation, backend-controlled progress, failure recovery, and ready-to-create state. Candidate names reach app navigation only after the reveal mutation succeeds and are never passed into the mist-covered interview shell.

## Verification

A focused strict TypeScript check passed in the fast local mirror for the new controller and its presentational shell. The complete repository check continues to report older unrelated prototype diagnostics in the app entry point, duplicate island prototype, NativeWind wrappers, and WebGPU canvas cast.

A separate reviewer checked the controller after its retry and bootstrap fixes. The final review found the ownership boundary, idempotent sends, failed-generation retry, streaming subscription, and reveal privacy clean.

## Commit

Pending.
