---
phase: 02-android-ui
verified: 2026-05-10T15:08:20Z
status: human_needed
score: 19/19 must-haves verified by source inspection
overrides_applied: 0
human_verification:
  - test: "Run focused Flutter widget tests"
    expected: "`cd clients/flutter && flutter test test/insight_questions_flow_test.dart test/insight_answer_submit_flow_test.dart test/insight_error_retry_flow_test.dart` exits 0"
    why_human: "Runtime context explicitly proceeded without Flutter SDK verification, so widget behavior was source-verified but not executed."
  - test: "Run Flutter analyzer"
    expected: "`cd clients/flutter && flutter analyze` exits 0"
    why_human: "Flutter analyzer was not used as an automated gate in this verification pass."
  - test: "Manual Android MVP golden path"
    expected: "On Android emulator or device, user enters a question, sees loading, answers exactly three cards one at a time, can go back from question 2/3, submits once, sees the backend conclusion, and reset returns to idle."
    why_human: "Visual/runtime behavior, Android back integration, and real backend handoff need device or emulator execution."
  - test: "Manual Android error and retry paths"
    expected: "Question generation and conclusion submission failures show card-level error with retry; 422 invalid question preserves editable input; duplicate taps do not create duplicate requests."
    why_human: "Failure behavior depends on runtime interaction and backend/network conditions."
---

# Phase 02: Android UI Verification Report

**Phase Goal:** Android Flutter MVP flow for question input, three guided questions, stateless answer submit, conclusion display, resilient card-level retry/error handling, and Flutter-first Android docs/config.
**Verified:** 2026-05-10T15:08:20Z
**Status:** human_needed
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | 用户可输入问题并看到加载态，成功后看到三问与选项 | VERIFIED | `BottomQuestionInput` renders editable text + `发送问题`; `InsightViewModel.submitQuestion` calls `generateQuestions`; `InsightQuestionsResponse` requires exactly 3 questions; `QuestionCard` renders progress and options one card at a time. |
| 2 | 用户可选完三题并提交，看到结论文案 | VERIFIED | `selectOption` advances through questions and calls `_submitAnswers` after question 3; `submitInsight` posts `rawQuestion`, `questions`, `answers`; `ResultCard` renders conclusion and reset actions. |
| 3 | 网络/服务端错误时有明确提示 | VERIFIED | `InsightApiException` covers non-2xx, timeout, and network errors; `LoadingErrorCard.error` renders card-level message and `重试`; ViewModel scopes retry to generation or submit. |
| 4 | Android Flutter app opens to a soft single-screen question input flow | VERIFIED | `main.dart` runs `FavorMeApp`; `FavorMeApp` hosts one `InsightFlowScreen`; idle state renders `你今天想问什么？` plus bottom input. |
| 5 | User can type a natural-language question and submit it to Phase 1 API | VERIFIED | `submitQuestion` trims input and calls `generateQuestions`; `InsightApiClient` posts to `/v1/insight/questions` with `rawQuestion` and `inputMode: text`. |
| 6 | Successful question generation shows exactly one of the three returned question cards | VERIFIED | Response parser rejects non-3 question arrays; screen renders only `currentQuestion`; progress is `第 {current} / 3 问`. |
| 7 | The request includes Authorization and a non-empty X-Device-Id header | VERIFIED | `_postJson` rejects empty token/device id and sends `Authorization: Bearer $token`, `X-Device-Id`, and JSON content type. |
| 8 | User sees one backend question at a time with progress 第 1 / 3 问 through 第 3 / 3 问 | VERIFIED | `currentQuestionIndex`, `progressText`, and `QuestionCard` implement one-card progress; tests cover first, second, and third cards. |
| 9 | User can select one option per question and go back to modify previous answers | VERIFIED | `_selectedAnswers` maps question id to option id; `goBack` decrements index and preserves selection; source/test cover `上一题` and replacement. |
| 10 | Completing question 3 submits all answers once without a submit overview | VERIFIED | `_submitAnswers` runs only after final selection, guards `_submitInFlight`, and no overview route/state exists. |
| 11 | Successful submit shows the backend conclusion in a result card | VERIFIED | `InsightSubmitResponse.fromJson` requires non-empty `conclusion`; `ResultCard` displays it in a scrollable card. |
| 12 | Question generation and conclusion submission both show card-level loading and disable duplicate actions | VERIFIED | `generatingQuestions` and `submittingAnswers` render `LoadingErrorCard.loading`; `isBusy`, `_submitInFlight`, and `_selectionInFlight` block duplicate actions. |
| 13 | Network, timeout, 4xx, and 5xx failures render card-level errors with scoped retry | VERIFIED | Non-2xx responses decode typed metadata; timeout/client errors map to typed exceptions; `_retryTarget` selects `submitQuestion` or `_submitAnswers`. |
| 14 | Invalid question 422 returns to editable input and preserves original text | VERIFIED | `INVALID_QUESTION_INPUT` sets `_invalidQuestionError`; `canEditQuestionInput` allows editing only for idle/invalid error; controller preserves submitted text. |
| 15 | Android back navigation from question 2 or 3 returns to previous question | VERIFIED | `WillPopScope` calls `goBack`; tests use `handlePopRoute` and verify selection remains. |
| 16 | Android delivery path is documented as Flutter-first in clients/flutter | VERIFIED | `clients/flutter/README.md`, `.planning/PROJECT.md`, `docs/tech-stack.md`, and `docs/architecture.md` all name `clients/flutter` as Phase 2 Android implementation. |
| 17 | clients/android is documented as handoff entry, not implementation home | VERIFIED | `clients/android/README.md` states it does not carry Phase 2 feature code and points to `../flutter`. |
| 18 | Flutter Android dev config supports local backend integration without weakening production HTTPS expectations | VERIFIED | Manifest has Internet permission and scoped network config; README documents emulator local HTTP and production HTTPS expectations. |
| 19 | Docs no longer contradict Flutter-first decisions D-01 through D-05 | VERIFIED | Stale guidance search found no matches in project/stack/architecture/client READMEs for old WebView/native/Flutter-later direction. |

**Score:** 19/19 truths verified by source inspection

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `clients/flutter/pubspec.yaml` | Flutter package metadata and lightweight deps | VERIFIED | `favorme_flutter`, `http`, `flutter_test`, `flutter_lints`; no state, WebView, voice, or AI SDK dependency. |
| `clients/flutter/lib/src/app/favorme_app.dart` | Material app shell and default client wiring | VERIFIED | Injects fake clients for tests, otherwise creates `InsightApiClient` with dart-define base URL/token. |
| `clients/flutter/lib/src/theme/app_theme.dart` | UI-SPEC tokens | VERIFIED | Color, typography, radius, touch target, shadow, and motion constants are defined. |
| `clients/flutter/lib/src/features/insight/insight_models.dart` | Typed question/answer/result models | VERIFIED | Validates dimensions, options, exactly 3 questions, and non-empty conclusion. |
| `clients/flutter/lib/src/features/insight/insight_api_client.dart` | Questions and submit API client | VERIFIED | Posts both endpoints with required headers and typed errors. |
| `clients/flutter/lib/src/features/insight/device_id_store.dart` | Stable non-empty device id provider | VERIFIED | File-backed development id and in-memory test provider both return non-empty values. |
| `clients/flutter/lib/src/features/insight/insight_view_model.dart` | Flow state machine | VERIFIED | Owns idle/loading/answering/submitting/result/error states, selected answers, retry target, reset, and duplicate guards. |
| `clients/flutter/lib/src/features/insight/insight_flow_screen.dart` | Single-screen UI wiring | VERIFIED | AnimatedBuilder listens to ViewModel, renders body states, and wires bottom input/back handling. |
| `clients/flutter/lib/src/features/insight/widgets/question_card.dart` | One-question card | VERIFIED | Renders progress, options, selected semantics, previous action, touch targets, and motion gates. |
| `clients/flutter/lib/src/features/insight/widgets/result_card.dart` | Conclusion card | VERIFIED | Scrollable conclusion plus `再问一次` and `回到首页`. |
| `clients/flutter/lib/src/features/insight/widgets/loading_error_card.dart` | Loading/error/retry card | VERIFIED | Renders question/conclusion loading copy, safe error copy, semantics, retry, and soft card styling. |
| `clients/flutter/lib/src/features/insight/widgets/bottom_question_input.dart` | Input capsule | VERIFIED | Text-only input, no microphone slot, disabled empty send, 44px send target, press scale. |
| `clients/flutter/test/*.dart` | Focused widget regression tests | VERIFIED | Tests cover question generation, answer submit/result, retry/invalid input/duplicate send/back behavior. Not executed in this pass. |
| `clients/flutter/android/app/src/main/AndroidManifest.xml` | Android Internet/network config hook | VERIFIED | Declares `android.permission.INTERNET` and references `@xml/network_security_config`. |
| `clients/flutter/android/app/src/main/res/xml/network_security_config.xml` | Scoped local cleartext allowance | VERIFIED | Allows only `10.0.2.2`, `localhost`, and `127.0.0.1`. |
| `clients/flutter/README.md` | Flutter run/config/security docs | VERIFIED | Documents dart-define base URL/token, headers, backend-only AI keys, HTTPS, and raw-question logging guidance. |
| `clients/android/README.md` | Android directory role | VERIFIED | Points to `../flutter` and says this directory does not carry Phase 2 feature implementation. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `insight_flow_screen.dart` | `insight_view_model.dart` | `AnimatedBuilder`, callbacks | VERIFIED | UI reads state and calls `submitQuestion`, `selectOption`, `goBack`, `retry`, `resetToIdle`. |
| `insight_api_client.dart` | `POST /v1/insight/questions` | JSON HTTP POST | VERIFIED | Endpoint, headers, `rawQuestion`, and `inputMode` are present. |
| `device_id_store.dart` | `X-Device-Id` | `_postJson` reads store before request | VERIFIED | Empty device id is rejected before request is sent. |
| `insight_view_model.dart` | `POST /v1/insight/submit` | `submitInsight` call | VERIFIED | Submits preserved `rawQuestion`, full question snapshot, and three answers. |
| `question_card.dart` | `insight_view_model.dart` | selection/back callbacks | VERIFIED | Screen passes option selection and previous callbacks into card. |
| `result_card.dart` | `insight_view_model.dart` | reset callbacks | VERIFIED | Both result actions call `resetToIdle`. |
| `loading_error_card.dart` | ViewModel retry target | retry callback | VERIFIED | Error card calls `viewModel.retry`, which uses `_retryTarget`. |
| `docs/tech-stack.md` | `clients/flutter/README.md` | Flutter-first decision | VERIFIED | Both describe `clients/flutter` as Phase 2 implementation. |
| `clients/flutter/README.md` | backend contract | API/header setup | VERIFIED | Documents `Authorization: Bearer`, `X-Device-Id`, `API_TOKEN`, and base URL. |
| `.planning/PROJECT.md` | `clients/flutter` | active client guidance | VERIFIED | Active Android client requirement points to `clients/flutter`. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `InsightFlowScreen` question card | `currentQuestion` | `InsightViewModel._questions` populated from `generateQuestions` response | Yes, parsed backend response, not static production data | FLOWING |
| `QuestionCard` options | `question.options` | `InsightQuestion.fromJson` parses backend option array | Yes, response parsing requires non-empty options | FLOWING |
| `InsightViewModel` submit payload | `answers` | `_selectedAnswers` created by user taps | Yes, all three selected answers are serialized | FLOWING |
| `ResultCard` conclusion | `conclusion` | `submitInsight` response parsed by `InsightSubmitResponse.fromJson` | Yes, non-empty backend conclusion required | FLOWING |
| `LoadingErrorCard` retry | `_retryTarget` | Error path in generation or submit | Yes, retry repeats the failed request path | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Flutter question/answer/error widget behavior | `cd clients/flutter && flutter test test/insight_questions_flow_test.dart test/insight_answer_submit_flow_test.dart test/insight_error_retry_flow_test.dart` | Not run per selected runtime context | SKIPPED |
| Flutter static analysis | `cd clients/flutter && flutter analyze` | Not run per selected runtime context | SKIPPED |
| Source anti-pattern scan | Cursor ripgrep over `clients/flutter/lib` | Only `return null` in nullable `currentQuestion` getter; not a stub | PASS |
| Forbidden client implementation scan | Cursor ripgrep over `clients/flutter` | Only `mic`/`microphone` appears in a test asserting absence; no production match | PASS |
| Stale guidance scan | Cursor ripgrep over project/docs/client README files | No stale WebView/native/Flutter-later guidance found | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CLI-01 | 02-01, 02-03, 02-04 | 用户可在 App 内输入一段自然语言问题并提交到后端 | SATISFIED | Bottom input, `submitQuestion`, `/v1/insight/questions`, docs/config. |
| CLI-02 | 02-01, 02-02, 02-04 | 用户可看到后端返回的三道题及每题可选答案 | SATISFIED | Exactly-three parser, current question rendering, option pills, progress through 3. |
| CLI-03 | 02-02, 02-03, 02-04 | 用户可对每道题选择一个选项并一次性提交作答 | SATISFIED | `_selectedAnswers`, final `_submitAnswers`, no `sessionId`, duplicate guards. |
| CLI-04 | 02-02, 02-04 | 提交后用户可看到服务端返回的倾向性结论 | SATISFIED | `InsightSubmitResponse.conclusion` and `ResultCard` rendering. |
| CLI-05 | 02-01, 02-03, 02-04 | 请求失败或超时时用户看到明确错误提示 | SATISFIED | Typed errors, safe local error copy, card-level retry, invalid input recovery. |

No additional Phase 2 CLI requirement IDs are orphaned in `.planning/REQUIREMENTS.md`.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `clients/flutter/lib/src/features/insight/insight_view_model.dart` | 61 | `return null` | INFO | Expected nullable getter when no question exists; UI guards this path. Not a stub. |
| `clients/flutter/test/insight_error_retry_flow_test.dart` | 256-257 | `mic` / `microphone` strings | INFO | Negative source gate asserting the production input widget does not contain voice affordances. |

### Human Verification Required

1. **Run focused Flutter widget tests**

**Test:** `cd clients/flutter && flutter test test/insight_questions_flow_test.dart test/insight_answer_submit_flow_test.dart test/insight_error_retry_flow_test.dart`
**Expected:** All tests pass.
**Why human:** Runtime context explicitly proceeded without Flutter SDK verification, so this pass did not execute Flutter tests.

2. **Run Flutter analyzer**

**Test:** `cd clients/flutter && flutter analyze`
**Expected:** Analyzer exits 0.
**Why human:** Analyzer was not used as an automated gate in this pass.

3. **Manual Android golden path**

**Test:** Run the Flutter app against a Phase 1 backend on Android emulator or device. Enter a natural-language question, submit, answer three cards, navigate back from question 2/3, complete question 3, and observe the conclusion.
**Expected:** The flow completes without blank screens, duplicate submits, submit overview, chat history, voice affordance, or client-visible session id.
**Why human:** Android runtime, visuals, back gesture behavior, and real backend integration require device/emulator execution.

4. **Manual Android failure paths**

**Test:** Trigger generation failure, submit failure, timeout/network failure, and 422 invalid input.
**Expected:** Card-level errors appear with scoped retry; invalid input preserves editable text; submit retry preserves selected answers; duplicate taps do not duplicate requests.
**Why human:** Network/backend failure behavior needs runtime setup or controlled backend responses.

### Gaps Summary

No codebase gaps found. Source-level evidence supports the Phase 02 goal and all CLI-01 through CLI-05 requirements. Overall status is `human_needed` because Flutter widget/analyze commands and Android runtime/UAT were not executed in this verification pass.

---

_Verified: 2026-05-10T15:08:20Z_
_Verifier: Claude (gsd-verifier)_
