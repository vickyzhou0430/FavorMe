---
phase: 02-android-ui
plan: "03"
subsystem: ui
tags: [flutter, android, error-retry, typed-errors, changenotifier]

requires:
  - phase: 02-android-ui
    provides: "Plan 02-01 and 02-02 Flutter question generation, answer flow, stateless submit client, and result card"
  - phase: 01-api
    provides: "Phase 1 typed error bodies with code, message, requestId, plus Authorization and X-Device-Id headers"
provides:
  - "Typed Flutter API errors with statusCode, code, message, and requestId"
  - "Card-level loading, error, and retry UI for question generation and conclusion submission"
  - "Invalid-question recovery that keeps the original input editable"
  - "Scoped retry and duplicate-submit guards for generation and submit requests"
  - "Android back behavior from question 2/3 to the previous question"
affects: [android-client, insight-ui, api-contract, phase-02-plan-04]

tech-stack:
  added: []
  patterns:
    - "InsightApiException carries safe typed server/client error metadata"
    - "InsightViewModel owns retry target and invalid-question editability"
    - "LoadingErrorCard and BottomQuestionInput isolate reusable recovery/input surfaces"

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
  - "Rendered backend and network failures through safe local copy rather than trusting arbitrary server messages in the UI."
  - "Kept invalid-question errors editable, while network/server/submit errors remain scoped to the retry card."
  - "Skipped Flutter runtime verification per selected execution context and used source gates plus IDE lints instead."

patterns-established:
  - "Use retry target state for generation vs submit failures instead of inferring retry from selected answer count."
  - "Use reusable card-level loading/error widgets for D-15 through D-18 flows."
  - "Use ViewModel-backed Android back handling to preserve selected answers when returning to previous questions."

requirements-completed: [CLI-01, CLI-03, CLI-05]

duration: 6min
completed: 2026-05-10
---

# Phase 02 Plan 03: Error Retry and Input Resilience Summary

**Flutter now keeps the insight flow recoverable under invalid input, network/server failures, duplicate taps, and Android back navigation without losing the user's current round state.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-05-10T14:41:56Z
- **Completed:** 2026-05-10T14:47:54Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Added the RED widget regression suite for generation retry, submit retry, invalid question recovery, duplicate-send prevention, Android back behavior, and UI-SPEC source gates.
- Extended `InsightApiClient` with `InsightApiException.statusCode`, safe non-2xx error parsing, malformed error fallback, network timeout handling, and client exception mapping.
- Added scoped retry state in `InsightViewModel` so question generation and conclusion submission retry only the failed request while preserving raw question, questions, and selected answers.
- Extracted `LoadingErrorCard` and `BottomQuestionInput` for 24px card surfaces, soft shadow, semantic loading labels, retry/send 44px targets, 0.98 press feedback, and D-13 loading motion hooks.
- Added Android back handling in `InsightFlowScreen` so question 2/3 returns to the previous question and question 1 can return to editable input with preserved text.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add failing error, retry, and back-navigation tests** - `0eddad4` (`test`)
2. **Task 2: Implement card-level loading, typed errors, scoped retry, and input polish** - `04cf0a0` (`feat`)
3. **Task 2 follow-up: Keep input editable only for invalid questions** - `d782d21` (`fix`)

**Plan metadata:** `1da61d4`, plus the final summary correction commit.

## Files Created/Modified

- `clients/flutter/test/insight_error_retry_flow_test.dart` - Regression tests and source gates for retry, invalid input, duplicate-send, Android back, loading/error cards, and bottom input.
- `clients/flutter/lib/src/features/insight/insight_api_client.dart` - Typed API exception metadata, non-2xx JSON parsing, timeout/network errors, and safe malformed-error handling.
- `clients/flutter/lib/src/features/insight/insight_view_model.dart` - Retry target tracking, invalid-question editability, duplicate request guards, preserved round state, and scoped retry.
- `clients/flutter/lib/src/features/insight/insight_flow_screen.dart` - Uses reusable loading/error/input widgets and intercepts Android back within the question flow.
- `clients/flutter/lib/src/features/insight/widgets/loading_error_card.dart` - Reusable card-level loading/error/retry surface.
- `clients/flutter/lib/src/features/insight/widgets/bottom_question_input.dart` - Reusable rounded capsule input with no voice affordance and disabled/send press states.

## Verification Commands

- `cd clients/flutter && flutter test test/insight_error_retry_flow_test.dart` - **SKIPPED** per runtime context: proceed without Flutter SDK verification.
- `cd clients/flutter && flutter test test/insight_questions_flow_test.dart test/insight_answer_submit_flow_test.dart test/insight_error_retry_flow_test.dart && flutter analyze` - **SKIPPED** per runtime context.
- `git diff --check -- [Task 2 files]` - PASSED.
- Source gate passed with `rg`: no `print(`, `debugPrint(`, or `developer.log` calls in `clients/flutter/lib/src/features/insight`.
- Source gate passed with `rg`: `INVALID_QUESTION_INPUT`, `InsightApiException`, `X-Device-Id`, and `Authorization` are present in the insight implementation.
- Source gate passed with `rg`: widgets/screen contain 24/44/0.98/Shadow/Semantics/loading copy/D-13 loading hooks.
- IDE lint diagnostics via `ReadLints` reported no linter errors for the edited insight implementation and error retry test.

## Decisions Made

- Used safe local UI copy for all server/network errors, with `INVALID_QUESTION_INPUT` as the only branch that enables editing the preserved question.
- Kept retry behavior explicit through `_RetryTarget` rather than deriving behavior from current selections, because submit failures need to preserve completed answers and avoid regenerating questions.
- Kept reusable widgets inside `features/insight/widgets` without adding dependencies or changing the existing `ChangeNotifier` architecture.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Proceeded with degraded Flutter verification**
- **Found during:** Task 1 and Task 2 verification
- **Issue:** Runtime context selected execution without Flutter SDK verification, so Flutter test/analyze commands were not run.
- **Fix:** Implemented manually, kept RED/GREEN commit order by source changes, and ran source gates plus IDE lint diagnostics.
- **Files modified:** All implementation and test files listed above.
- **Verification:** Source gates, `git diff --check`, and IDE lints passed; Flutter commands are explicitly recorded as skipped.
- **Committed in:** `0eddad4`, `04cf0a0`, `d782d21`

**2. [Rule 1 - Bug] Kept non-invalid errors from reopening the input**
- **Found during:** Task 2 implementation review
- **Issue:** Treating every error as editable could let users change the input while a submit/network retry card was scoped to the failed request.
- **Fix:** Added `canEditQuestionInput` backed by an invalid-question flag; only idle and `INVALID_QUESTION_INPUT` errors enable the bottom input.
- **Files modified:** `insight_view_model.dart`, `insight_flow_screen.dart`
- **Verification:** Source gate confirms `canEditQuestionInput` and `INVALID_QUESTION_INPUT` are wired; IDE lints reported no errors.
- **Committed in:** `d782d21`

---

**Total deviations:** 2 auto-handled issues (1 blocking verification constraint, 1 implementation bug).
**Impact on plan:** Behavior remains within the plan scope; runtime/widget verification remains deferred until Flutter verification is allowed.

## Issues Encountered

- Flutter test/analyze were intentionally skipped per runtime context, so runtime confidence depends on later execution in a Flutter-enabled verification pass.
- One shell retry cycle hit `fork: Resource temporarily unavailable`; a short pause and retry succeeded without changing implementation scope.

## Known Stubs

None. Empty/reset fields in `InsightViewModel` are state invariants, and the `Device id is not available.` copy is a client configuration error, not a rendered placeholder stub.

## Threat Flags

None. This plan only implements the planned backend-error-to-UI, user-input-preservation, and retry-to-API trust boundaries. No new endpoints, auth paths, file access patterns, schema changes, logs of raw questions, or client-side AI keys were introduced.

## User Setup Required

None for implementation. Flutter runtime verification is still required when the toolchain is available/allowed:

- `cd clients/flutter && flutter test test/insight_questions_flow_test.dart test/insight_answer_submit_flow_test.dart test/insight_error_retry_flow_test.dart`
- `cd clients/flutter && flutter analyze`

## Next Phase Readiness

Ready for Plan 04 to complete remaining Android UI polish/integration work. The main residual risk is that Flutter widget/runtime behavior has only been source-verified in this environment.

## TDD Gate Compliance

- **RED:** `0eddad4` added the error/retry/back-navigation widget test before implementation.
- **GREEN:** `04cf0a0` implemented the production behavior expected by the RED test.
- **Follow-up fix:** `d782d21` tightened the invalid-question editability invariant discovered during implementation review.
- **Runtime caveat:** Flutter test execution was skipped per runtime context, so gate compliance is source/commit-order verified rather than runtime-verified.

## Self-Check: PASSED

- Verified task commits exist in recent git history: `0eddad4`, `04cf0a0`, `d782d21`.
- Verified created files exist: `loading_error_card.dart`, `bottom_question_input.dart`, and `insight_error_retry_flow_test.dart`.
- Verified source gates passed for typed errors, auth headers, retry/input UI tokens, loading/error copy, and absence of raw-question logging calls.
- Verified `STATE.md` and `ROADMAP.md` were not intentionally updated by this executor.

---
*Phase: 02-android-ui*
*Completed: 2026-05-10*
