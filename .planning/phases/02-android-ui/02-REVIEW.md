---
phase: 02-android-ui
reviewed: 2026-05-10T15:02:00Z
depth: standard
files_reviewed: 23
files_reviewed_list:
  - clients/flutter/pubspec.yaml
  - clients/flutter/analysis_options.yaml
  - clients/flutter/lib/main.dart
  - clients/flutter/lib/src/app/favorme_app.dart
  - clients/flutter/lib/src/theme/app_theme.dart
  - clients/flutter/lib/src/features/insight/insight_models.dart
  - clients/flutter/lib/src/features/insight/insight_api_client.dart
  - clients/flutter/lib/src/features/insight/device_id_store.dart
  - clients/flutter/lib/src/features/insight/insight_view_model.dart
  - clients/flutter/lib/src/features/insight/insight_flow_screen.dart
  - clients/flutter/lib/src/features/insight/widgets/question_card.dart
  - clients/flutter/lib/src/features/insight/widgets/result_card.dart
  - clients/flutter/lib/src/features/insight/widgets/loading_error_card.dart
  - clients/flutter/lib/src/features/insight/widgets/bottom_question_input.dart
  - clients/flutter/test/insight_questions_flow_test.dart
  - clients/flutter/test/insight_answer_submit_flow_test.dart
  - clients/flutter/test/insight_error_retry_flow_test.dart
  - clients/flutter/android/app/src/main/AndroidManifest.xml
  - clients/flutter/android/app/src/main/res/xml/network_security_config.xml
  - clients/flutter/README.md
  - clients/android/README.md
  - docs/tech-stack.md
  - docs/architecture.md
findings:
  critical: 2
  warning: 1
  info: 0
  total: 3
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-05-10T15:02:00Z
**Depth:** standard
**Files Reviewed:** 23
**Status:** issues_found

## Summary

Reviewed the Phase 2 Flutter Android UI implementation, Android network config, widget tests, and alignment docs. No hardcoded production secrets, raw-question logging, direct AI/vendor calls, or broad Android cleartext permission were found. Flutter runtime verification remains a residual risk because `flutter test` / `flutter analyze` were unavailable.

The main defects are in the answer state machine: it can dead-end on malformed question counts, and rapid repeated option taps can skip cards or leave the user stuck.

## Critical Issues

### CR-01: Rapid Option Taps Can Skip Questions And Dead-End Submission

**Severity:** BLOCKER
**File:** `clients/flutter/lib/src/features/insight/insight_view_model.dart:134-154`
**Issue:** `selectOption` accepts multiple taps while the 160ms selection delay is pending. Two quick taps on question 1 can schedule two continuations: the first advances from q1 to q2, the second then advances from q2 to q3 without q2 being answered. If the user answers q3, `_submitAnswers` silently returns because q2 is missing, leaving the UI in `answeringQuestion` with no error or submit path.
**Fix:**
```dart
bool _selectionInFlight = false;

Future<void> selectOption(InsightQuestion question, InsightOption option) async {
  if (isBusy ||
      _selectionInFlight ||
      _state != InsightFlowState.answeringQuestion ||
      currentQuestion?.id != question.id) {
    return;
  }

  _selectionInFlight = true;
  _selectedAnswers[question.id] = option.id;
  notifyListeners();
  await Future<void>.delayed(AppMotion.selectionDuration);
  _selectionInFlight = false;

  if (_state != InsightFlowState.answeringQuestion ||
      currentQuestion?.id != question.id) {
    notifyListeners();
    return;
  }

  // Existing advance-or-submit logic follows.
}
```
Also reset `_selectionInFlight` in `resetToIdle` and when request sequence changes.

### CR-02: Non-Three-Question Responses Produce A Stuck Flow

**Severity:** BLOCKER
**File:** `clients/flutter/lib/src/features/insight/insight_models.dart:121-134`, `clients/flutter/lib/src/features/insight/insight_view_model.dart:98-101`, `clients/flutter/lib/src/features/insight/insight_view_model.dart:184-186`
**Issue:** `InsightQuestionsResponse.fromJson` accepts any non-empty question list, while the ViewModel and UI assume exactly three questions (`progressText` hard-codes `/ 3`, `_submitAnswers` requires `_questions.length == 3`). If the backend returns one or two valid questions, the user can answer through the available cards and then `_submitAnswers` returns silently, leaving the app on the last card with no result and no error. If it returns more than three, the UI contradicts the data and sends an unexpected answer set.
**Fix:**
```dart
factory InsightQuestionsResponse.fromJson(Map<String, Object?> json) {
  final questionsJson = json['questions'];
  if (questionsJson is! List || questionsJson.length != 3) {
    throw const FormatException('Questions response must contain exactly 3 questions');
  }
  return InsightQuestionsResponse(
    questions: questionsJson
        .map(
          (question) => InsightQuestion.fromJson(
            Map<String, Object?>.from(question as Map),
          ),
        )
        .toList(growable: false),
  );
}
```
If the product later supports variable counts, replace the hard-coded `3` in `progressText` and submit guards with `_questions.length`, and surface an explicit error instead of returning silently.

## Warnings

### WR-01: Physical-Device HTTP Run Instructions Conflict With Android Network Security Config

**Severity:** WARNING
**File:** `clients/flutter/README.md:18`, `clients/flutter/android/app/src/main/res/xml/network_security_config.xml:3-7`
**Issue:** The README tells developers to use a LAN cleartext URL such as `http://192.168.1.23:3000` for physical Android devices, but the network security config permits cleartext only for `10.0.2.2`, `localhost`, and `127.0.0.1`. On Android 9+, the documented physical-device path will fail with cleartext traffic blocked unless the API is HTTPS or the debug network config explicitly allows that LAN host.
**Fix:** Change the README to require HTTPS/tunnel for physical devices, or add a debug-only network security config path for the specific LAN host used during local testing. Do not add broad production cleartext allowances.

---

_Reviewed: 2026-05-10T15:02:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
