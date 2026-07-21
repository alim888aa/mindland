# Add account management entry

Status: completed

Owner: clerk-profile-agent

Depends on: Verify native Clerk end to end

## Outcome

Give every signed-in user an obvious map-level entry to Clerk's native account management, including sign out.

## Done when

The obsolete compass control is gone. A small native Clerk profile button appears in the top-right map chrome, opens Clerk's account management UI, and allows the current user to sign out. The signed-out app returns to the existing authentication flow.

## Result

The reusable `AccountButton` is a real 48-point top-right control using the signed-in Clerk user's avatar. It presents Clerk's native `UserProfileView` in a form sheet, so the whole visible control owns its touch and accessibility frame.

The map overlay is integrated and the configured development instance exposes Edit profile, Manage account, Security, and Sign out. The current signed-in test session was deliberately preserved so the app remains ready for the user.

## Verification

The implementation was checked against installed `@clerk/expo` 3.7.8 types and source. A clean native iOS build loaded the Clerk plugins, and the signed-in simulator opened both the profile landing page and Manage account page with the current private email and connected-account controls.

Accessibility inspection exposes the complete 48-point avatar as one button named `Open account settings`. The Sign out control is present; it was not activated so the prepared simulator session stays usable.

## Commit

Blocked by the same iCloud-offloaded Git metadata recorded in task 03d.
