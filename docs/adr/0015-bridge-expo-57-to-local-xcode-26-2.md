# Bridge Expo 57 to local Xcode 26.2

Status: proposed

## Context

Expo SDK 57 expects Xcode 26.4 or newer, while the current development machine has Xcode 26.2. ExpoModulesJSI therefore fails to compile and sign its generated framework before Mindland code can launch in Simulator. The workspace also contains duplicate historical Xcode projects, so CocoaPods cannot safely infer the intended project.

## Proposed decision

Keep the workaround narrow and reversible. Select `Mindland.xcodeproj` explicitly from the Podfile. Use `patch-package` to make ExpoModulesJSI's Swift date arithmetic explicit for this compiler and place its generated local XCFramework cache under `/tmp`, where iCloud metadata cannot invalidate code signing.

Do not fork Expo or copy its runtime into application code. Re-run the unpatched build after upgrading Xcode, then remove this ADR, the package patch, and the Podfile compatibility note when Expo 57 builds cleanly on the supported toolchain.

## Consequences

The current machine can build and run the native prototype, and a clean dependency install reapplies the compatibility patch automatically. The patch is tied to ExpoModulesJSI 57.0.3 and must be reviewed whenever Expo or Xcode changes. Production builds should use Expo's supported Xcode version rather than relying on this bridge.
