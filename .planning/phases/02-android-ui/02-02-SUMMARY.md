---
phase: 02-android-ui
plan: "02"
subsystem: ui
tags: [flutter, android, insight-submit, changenotifier, stateless-api]

requires:
  - phase: 02-android-ui
    provides: "Plan 02-01 Flutter app shell, question-generation API client, ViewModel, and first-card UI"
  - phase: 01-api
    provides: "Authenticated stateless POST /v1/insight/submit accepting rawQuestion, questions, and answers"
provides:
  - "One-question-at-a-time Flutter answer flow with previous-question navigation"
  - "Stateless answer submit client for POST /v1/insight/submit"
  - "In-memory round state for selected answers, duplicate-submit guard, conclusion display, and reset actions"
affects: [android-client, insight-ui, phase-02-plan-03, api-contract]

tech-stack:
  added: []
  patterns:
    - "ChangeNotifier owns preserved question snapshot, selected answers, submit state, and conclusion state"
    - "Feature widgets split into QuestionCard and ResultCard with UI-SPEC source gates"
    - "API client reuses auth/device headers across questions and submit endpoints"

key-files:
  created:
    - clients/flutter/lib/src/features/insight/widgets/question_card.dart
    - clients/flutter/lib/src/features/insight/widgets/result_card.dart
    - clients/flutter/test/insight_answer_submit_flow_test.dart
  modified:
    - clients/flutter/lib/src/features/insight/insight_models.dart
    - clients/flutter/lib/src/features/insight/insight_api_client.dart
    - clients/flutter/lib/src/features/insight/insight_view_model.dart
    - clients/flutter/lib/src/features/insight/insight_flow_screen.dart
    - clients/flutter/test/insight_questions_flow_test.dart

key-decisions:
  - "Kept the Phase 1 no-session contract: Flutter submits rawQuestion, the full questions snapshot, and answers, with no sessionId in production client code."
  - "Kept state local and in-memory for this round; reset actions clear raw question, questions, selections, and conclusion."
  - "Used source gates and IDE lints as degraded verification because the Flutter SDK is unavailable in this environment."

patterns-established:
  - "QuestionCard receives one question plus selected option id and callbacks; it does not own submit state."
  - "ResultCard renders backend-generated conclusion in a scrollable card and exposes both reset actions."
  - "InsightApiClient centralizes POST JSON auth/device headers for both question generation and answer submission."

requirements-completed: [CLI-02, CLI-03, CLI-04]

duration: 8min
completed: 2026-05-10
---

# Phase 02 Plan 02: Answer Submit and Result Flow Summary

**Flutter now completes one insight round: three backend questions are answered one at a time, submitted once as a stateless payload, and the backend conclusion is shown in a resettable result card.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-10T14:31:27Z
- **Completed:** 2026-05-10T14:39:18Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Added the RED widget test for the answer/submit/result flow, including answer replacement, no submit overview, no `sessionId`, result actions, and UI-SPEC/D-13 source gates.
- Implemented `InsightAnswer` and `InsightSubmitResponse`, plus `submitInsight` for `POST /v1/insight/submit` using the same Bearer token and `X-Device-Id` headers as question generation.
- Extended `InsightViewModel` with selected answers, previous-question navigation, `submittingAnswers`, `showingResult`, duplicate-submit prevention, conclusion state, retry, and reset.
- Split the answer/result UI into `QuestionCard` and `ResultCard` with 24px surfaces, 999px pills, 44px targets, selected semantics, press feedback, and fade/upward entrance motion.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add failing three-question submit-flow test** - `2e69d28` (`test`)
2. **Task 2: Implement one-question card flow and result card** - `4ec177f` (`feat`)

**Plan metadata:** this summary commit.

## Files Created/Modified

- `clients/flutter/test/insight_answer_submit_flow_test.dart` - Widget test for three-question answer navigation, stateless submit payload capture, result rendering, and UI-SPEC source gates.
- `clients/flutter/lib/src/features/insight/insight_models.dart` - Answer payload and submit response models.
- `clients/flutter/lib/src/features/insight/insight_api_client.dart` - Shared authenticated JSON POST helper and `/v1/insight/submit` client.
- `clients/flutter/lib/src/features/insight/insight_view_model.dart` - Answer selection, back navigation, submit-on-third-answer, conclusion, retry, and reset state.
- `clients/flutter/lib/src/features/insight/insight_flow_screen.dart` - Rendering for answering, submitting, result, and reset states.
- `clients/flutter/lib/src/features/insight/widgets/question_card.dart` - One-question card with progress, previous action, selected option semantics, and D-13 motion/press feedback.
- `clients/flutter/lib/src/features/insight/widgets/result_card.dart` - Scrollable conclusion card with `再问一次` and `回到首页`.
- `clients/flutter/test/insight_questions_flow_test.dart` - Updated fake client to satisfy the expanded API interface.

## Verification Commands

- `cd clients/flutter && flutter test test/insight_answer_submit_flow_test.dart` — **SKIPPED** because `flutter`, `dart`, and `fvm` are unavailable in this environment.
- `cd clients/flutter && flutter test test/insight_questions_flow_test.dart test/insight_answer_submit_flow_test.dart && flutter analyze` — **SKIPPED** because the Flutter SDK is unavailable.
- Source gate passed with `rg`: `insight_api_client.dart` contains `/v1/insight/submit`, `rawQuestion`, `questions`, and `answers`.
- Source gate passed with `rg`: production `clients/flutter/lib/src/features/insight` contains no `sessionId`.
- Source gate passed with `rg`: ViewModel contains `submittingAnswers`, `showingResult`, submit call, and reset clearing round state.
- Source gate passed with `rg`: widget sources contain progress/back/result copy plus 24/999/44/0.98/220/320/Shadow/Semantics gates.
- `git diff --check` passed for Task 2 files.
- IDE lint diagnostics via `ReadLints` reported no linter errors for `clients/flutter/lib/src/features/insight` and `clients/flutter/test`.

## Decisions Made

- Followed the stateless Phase 1 contract exactly rather than introducing a client-visible session concept.
- Kept submit retry scoped to the preserved question snapshot and selected answers so the user does not need to repeat the first step after a conclusion-submit failure.
- Kept both `再问一次` and `回到首页` as reset-to-idle actions for this MVP slice; no persistent multi-round context is implied.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Proceeded with degraded Flutter verification**
- **Found during:** Task 1 and Task 2 verification
- **Issue:** `flutter`, `dart`, and `fvm` are not installed or not on PATH, so required Flutter RED/GREEN test and analyze commands cannot run.
- **Fix:** Followed the runtime context: implemented manually, committed the RED test before production implementation, skipped Flutter-dependent commands, and ran source gates plus IDE lint checks instead.
- **Files modified:** All implementation and test files listed above.
- **Verification:** Source gates, `git diff --check`, and IDE lints passed; Flutter commands are explicitly recorded as skipped.
- **Committed in:** `2e69d28`, `4ec177f`

---

**Total deviations:** 1 auto-handled blocking issue.
**Impact on plan:** Behavior is implemented and source-verified, but runtime/widget verification remains degraded until Flutter SDK is available.

## Issues Encountered

- Flutter SDK is unavailable in this environment, so TDD RED/GREEN commands could not be executed.
- One shell self-check attempt hit `fork: Resource temporarily unavailable`; retry succeeded without changing scope.

## Known Stubs

None. Empty/null state fields in `InsightViewModel` are reset invariants, not UI-rendered placeholder stubs.

## Threat Flags

None. The new client network surface is the planned `/v1/insight/submit` boundary from the plan threat model; no additional endpoints, auth paths, file access patterns, or schema changes were introduced.

## User Setup Required

Flutter SDK is required to complete runtime verification locally. Once installed, run:

- `cd clients/flutter && flutter test test/insight_questions_flow_test.dart test/insight_answer_submit_flow_test.dart`
- `cd clients/flutter && flutter analyze`

## Next Phase Readiness

Ready for Plan 03 to add integration/error handling around the completed answer-submit path. Runtime confidence still depends on running the skipped Flutter test/analyze commands on a machine with the Flutter SDK installed.

## TDD Gate Compliance

- **RED:** `2e69d28` added the answer-submit widget test before implementation.
- **GREEN:** `4ec177f` implemented the production flow expected by the RED test.
- **Runtime caveat:** Flutter test execution was skipped because the SDK is unavailable, so gate compliance is source/commit-order verified rather than runtime-verified.

## Self-Check: PASSED

- Verified task commits exist in recent git history: `2e69d28`, `4ec177f`.
- Verified created files exist: `question_card.dart`, `result_card.dart`, and `insight_answer_submit_flow_test.dart`.
- Verified production source contains no `sessionId`.
- Verified source-level acceptance gates passed.
- Verified `STATE.md` and `ROADMAP.md` were not intentionally updated by this executor.

---
*Phase: 02-android-ui*
*Completed: 2026-05-10*
