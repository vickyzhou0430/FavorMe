---
phase: 02-android-ui
plan: "03"
subsystem: ui
tags: [flutter, android, insight-errors, retry, changenotifier]

requires:
  - phase: 02-android-ui
    provides: "Plan 02-02 answer submission flow, result card, and stateless submit client"
  - phase: 01-api
    provides: "Typed 4xx/5xx error body with code, message, and requestId plus required auth/device headers"
provides:
  - "Typed Flutter API errors with statusCode, code, message, and requestId"
  - "Card-level loading, error, and retry UI for question generation and conclusion submission"
  - "Invalid-question recovery that preserves editable input text"
  - "Scoped retry and duplicate-action guards for generation and submit failures"
  - "Android back behavior for question navigation"
affects: [android-client, insight-ui, api-contract, phase-02-verification]

tech-stack:
  added: []
  patterns:
    - "InsightApiException carries backend error metadata while UI renders safe local recovery copy"
    - "InsightViewModel stores an explicit retry target for failed generation versus failed submit"
    - "Reusable Flutter widgets own loading/error and bottom input surfaces"

key-files:
  created:
    - clients/flutter/lib/src/features/insight/widgets/loading_error_card.dart
    - clients/flutter/lib/src/features/insight/widgets/bottom_question_input.dart
    - clients/flutter/test/insight_error_retry_flow_test.dart
  modified:
    - clients/flutter/lib/src/features/insight/insight_api_client.dart
    - clients/flutter/lib/src/features/insight/insight_view_model.dart
    - clients/flutter/lib/src/features/insight/insight_flow_screen.dart

key-decisions:
  - "Render safe local error copy instead of trusting backend error messages directly."
  - "Keep network/server failures at the failed card, while only INVALID_QUESTION_INPUT re-enables editing the original input."
  - "Do not run Flutter SDK verification in this environment per runtime instruction; use source gates and IDE lints instead."

patterns-established:
  - "Use _RetryTarget in InsightViewModel for scoped retry routing."
  - "Use LoadingErrorCard for both loading copy variants and card-level retry errors."
  - "Use BottomQuestionInput for the no-voice capsule input with 44px send target and press feedback."

requirements-completed: [CLI-01, CLI-03, CLI-05]

duration: 6min
completed: 2026-05-10
---

# Phase 02 Plan 03: Resilient Error and Retry Flow Summary

**Flutter insight flow now recovers from generation, submit, invalid-input, and back-navigation failures with typed errors, scoped retry, preserved state, and card-level UI.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-05-10T14:41:56Z
- **Completed:** 2026-05-10T14:47:34Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added the RED widget regression suite for generation retry, submit retry, invalid-question recovery, duplicate send prevention, Android back navigation, and UI-SPEC source gates.
- Extended `InsightApiException` with `statusCode`, `code`, `message`, and `requestId`, plus safe malformed-error fallback parsing and timeout/network error mapping.
- Added explicit ViewModel retry targeting so generation retry calls questions again, while submit retry reuses the preserved questions and selected answers.
- Extracted `LoadingErrorCard` and `BottomQuestionInput` with loading semantics, retry action, 24px cards, Shadow soft, 44px targets, 0.98 press feedback, and no voice affordance.
- Wrapped the screen in Android back handling so question 2/3 return to the previous question and question 1 returns to editable input with original text preserved.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add failing error, retry, and back-navigation tests** - `0eddad4` (`test`)
2. **Task 2: Implement card-level loading, typed errors, scoped retry, and input polish** - `04cf0a0` (`feat`)
3. **Auto-fix: Keep input editable only for invalid questions** - `d782d21` (`fix`)

**Plan metadata:** this summary commit.

## Files Created/Modified

- `clients/flutter/test/insight_error_retry_flow_test.dart` - Regression tests for retry call counts, duplicate sends, invalid input, Android back, and source gates.
- `clients/flutter/lib/src/features/insight/insight_api_client.dart` - Typed API exceptions, status/request id parsing, timeout/network mapping, and safe malformed error handling.
- `clients/flutter/lib/src/features/insight/insight_view_model.dart` - Retry target state, duplicate guards, invalid-input edit recovery, and preserved state for submit retry.
- `clients/flutter/lib/src/features/insight/insight_flow_screen.dart` - Reusable widgets wired into the flow and Android back interception.
- `clients/flutter/lib/src/features/insight/widgets/loading_error_card.dart` - Loading/error/retry card with UI-SPEC styling and semantic loading labels.
- `clients/flutter/lib/src/features/insight/widgets/bottom_question_input.dart` - Bottom capsule input with disabled state, send action, touch target, and press feedback.

## Verification Commands

- `cd clients/flutter && flutter test test/insight_error_retry_flow_test.dart` — **SKIPPED** per runtime context: Flutter SDK verification was explicitly not to be run in this environment.
- `cd clients/flutter && flutter test test/insight_questions_flow_test.dart test/insight_answer_submit_flow_test.dart test/insight_error_retry_flow_test.dart && flutter analyze` — **SKIPPED** per runtime context.
- `git diff --check` passed for all changed implementation and test files before task commits.
- Source gate passed with `rg`: `INVALID_QUESTION_INPUT`, `InsightApiException`, `X-Device-Id`, `Authorization`, `statusCode`, and `requestId` are present in the insight feature.
- Source gate passed with `rg`: no `print(`, `debugPrint(`, or `developer.log` calls exist in `clients/flutter/lib/src/features/insight`.
- Source gate passed with `rg`: UI-SPEC loading/input markers for 24px/44px/0.98, Shadow, Semantics, breathing/typing, and loading copy are present.
- Source gate passed with `rg`: no `mic` or `microphone` identifier exists in `bottom_question_input.dart`.
- IDE lint diagnostics via `ReadLints` reported no linter errors for the changed insight implementation and test files.

## Decisions Made

- Followed Phase 1 error-body contract but rendered fixed local copy for user-facing errors to avoid trusting arbitrary backend text.
- Kept retry state inside `InsightViewModel` rather than inferring retry behavior only from selected-answer counts.
- Preserved the original question text in memory only for retry/editing, with no raw-question logging added.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Proceeded with degraded Flutter verification**
- **Found during:** Task 1 and Task 2 verification
- **Issue:** Runtime context instructed that `flutter`, `dart`, and `fvm` are unavailable and Flutter commands must not be run.
- **Fix:** Implemented manually, committed the RED test before production code, skipped Flutter-dependent commands, and ran source gates plus IDE lint checks.
- **Files modified:** All implementation and test files listed above.
- **Verification:** Source gates, `git diff --check`, and IDE lints passed; Flutter commands are explicitly recorded as skipped.
- **Committed in:** `0eddad4`, `04cf0a0`, `d782d21`

**2. [Rule 1 - Bug] Restricted editable input to invalid-question errors**
- **Found during:** Plan-level self-check after Task 2
- **Issue:** The first implementation made the input editable for all error states, which would let network/server failures drift from the failed card instead of remaining scoped to retry.
- **Fix:** Added `_invalidQuestionError` and `canEditQuestionInput`, so only `INVALID_QUESTION_INPUT` re-enables editing while network/timeout/submit failures stay at the retry card.
- **Files modified:** `insight_view_model.dart`, `insight_flow_screen.dart`
- **Verification:** Source gates and IDE lints passed.
- **Committed in:** `d782d21`

---

**Total deviations:** 2 auto-handled issues (1 blocking verification constraint, 1 correctness bug).
**Impact on plan:** Behavior remains within scope and closer to D-16/D-17; runtime/widget confidence still depends on Flutter SDK verification later.

## Issues Encountered

- Flutter-dependent tests and `flutter analyze` were skipped by instruction, so RED/GREEN runtime proof remains pending.
- A transient shell `fork: Resource temporarily unavailable` occurred during self-check; retry succeeded without changing implementation scope.

## Known Stubs

None. Empty/null ViewModel fields are reset invariants, and `Device id is not available.` is a typed client configuration error, not UI placeholder content.

## Threat Flags

None. The changed network surface remains the planned `/v1/insight/questions` and `/v1/insight/submit` trust boundary; no new endpoints, auth paths, file access patterns, schema changes, raw-question logs, or client-side AI keys were introduced.

## User Setup Required

Flutter SDK verification is still required on a machine where the toolchain is available and allowed to run:

- `cd clients/flutter && flutter test test/insight_questions_flow_test.dart test/insight_answer_submit_flow_test.dart test/insight_error_retry_flow_test.dart`
- `cd clients/flutter && flutter analyze`

## Next Phase Readiness

Ready for Plan 04 to complete Android/platform documentation and any remaining Phase 2 polish. The core client flow now has source-verified recovery behavior, but runtime/widget verification remains the main pending confidence gap.

## TDD Gate Compliance

- **RED:** `0eddad4` added the error/retry/back-navigation widget test before implementation.
- **GREEN:** `04cf0a0` implemented the production behavior expected by the RED test.
- **REFACTOR/FIX:** `d782d21` tightened invalid-input edit behavior after self-check.
- **Runtime caveat:** Flutter test execution was skipped by runtime instruction, so gate compliance is source/commit-order verified rather than runtime-verified.

## Self-Check: PASSED

- Verified task commits exist in recent git history: `0eddad4`, `04cf0a0`, `d782d21`.
- Verified created files exist: `insight_error_retry_flow_test.dart`, `loading_error_card.dart`, and `bottom_question_input.dart`.
- Verified source-level acceptance gates passed for typed errors, scoped retry, no raw-question logging, no voice affordance, and UI-SPEC loading/input markers.
- Verified `STATE.md` and `ROADMAP.md` were not intentionally updated or staged by this executor.

---
*Phase: 02-android-ui*
*Completed: 2026-05-10*
