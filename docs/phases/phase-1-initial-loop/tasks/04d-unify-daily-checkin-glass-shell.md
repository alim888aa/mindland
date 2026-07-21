# Unify the daily check-in glass shell

Status: in-progress

Owner: primary-agent

Parent: Build daily check-ins

## Outcome

Give conversational and guided daily check-ins the same full-screen Liquid Glass and mist presentation as onboarding while keeping the live map visible underneath.

## Approved behavior

Check in opens over the full map. The opening chat shows island names as guided-questionnaire shortcuts and keeps the conversational composer available. Tapping an island smoothly focuses its territory behind the glass and opens that island's questionnaire.

Chat and questionnaires share one full-screen glass shell. Only questionnaires show a numberless progress bar. Completing either path clears the glass and mist to reveal the changed island beneath it.

## Done when

The shared shell uses Expo 57 native Liquid Glass when available and the established readable fallback otherwise. Full-map opening, island focus, questionnaire progress, automatic answer advance, chat entry, close behavior, and completion reveal work without map or gesture errors in the iPhone simulator.

## Result

Onboarding and daily check-in now consume the same reusable Expo 57 glass surfaces, full-screen veil, mist breakup, progress control, native-availability check, and Reduce Transparency fallback. Check in opens over the full overview with the map still mounted beneath it. Compact island shortcuts open the selected questionnaire and smoothly focus its territory behind the glass. Returning to chat restores the overview, and finishing the guided flow dissolves the veil before leaving the completed island focused.

The visual shell and guided completion are implemented. The conversational completion trigger remains in progress because the product still needs to decide when the AI should offer its final map-update action.

## Verification

The iOS 26.2 simulator verified full-map opening, compact island shortcuts, focused questionnaire entry, numberless progress, automatic choice advance, written-answer entry, guided back-to-chat overview, close, and the final mist/glass reveal onto Health. A conversational message was also sent and remained in the shared shell for further dialogue. Metro reported no runtime errors.

All 30 existing camera, territory, and gesture tests pass. TypeScript passed during implementation and final review.

## Commit

Pending.
