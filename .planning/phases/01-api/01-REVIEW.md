---
phase: 01-api
reviewed: 2026-05-09T11:36:00Z
depth: standard
files_reviewed: 23
files_reviewed_list:
  - backend/prisma/schema.prisma
  - backend/src/common/filters/api-exception.filter.ts
  - backend/src/common/filters/http-exception.filter.ts
  - backend/src/common/guards/api-token.guard.ts
  - backend/src/common/middleware/request-id.middleware.ts
  - backend/src/common/request-context.ts
  - backend/src/users/users.module.ts
  - backend/src/users/users.controller.ts
  - backend/src/users/users.service.ts
  - backend/src/insight/insight.module.ts
  - backend/src/insight/insight.controller.ts
  - backend/src/insight/insight.service.ts
  - backend/src/insight/dto/generate-questions.dto.ts
  - backend/src/insight/dto/submit-insight.dto.ts
  - backend/src/insight/dto/question.dto.ts
  - backend/src/insight/prompts/questions.prompt.ts
  - backend/src/insight/prompts/conclusion.prompt.ts
  - backend/src/insight/validators/question-input.validator.ts
  - backend/src/llm/llm.module.ts
  - backend/src/llm/llm.service.ts
  - backend/src/app.module.ts
  - backend/src/main.ts
  - backend/package.json
findings:
  critical: 1
  warning: 3
  info: 0
  total: 4
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-05-09T11:36:00Z
**Depth:** standard
**Files Reviewed:** 23
**Status:** issues_found

## Summary

Reviewed the configured backend API scope at standard depth. The configured paths `backend/src/insight/dto/questions-request.dto.ts` and `backend/src/insight/dto/submit-request.dto.ts` do not exist; the actual DTOs used by the controllers were reviewed instead. The main ship-blocking issue is that the submit endpoint trusts client-provided question and answer snapshots too broadly, so clients can produce conclusions from incomplete or tampered data. No backend test files were found.

## Critical Issues

### CR-01: Submit accepts incomplete or tampered insight payloads

**File:** `backend/src/insight/insight.service.ts:203-221`
**Issue:** `assertAnswerShape` only checks that each submitted answer points to some provided question and option. It does not require exactly the three expected questions, the required dimension order, one answer per question, or unique answer `questionId`s. Because `SubmitInsightDto` only requires `questions` and `answers` to have at least one item, a client can submit a single answered question, omit two dimensions, duplicate one question, or rewrite question titles/options before the LLM conclusion is generated. That breaks the intended "three generated questions -> three selected answers -> conclusion" contract and lets clients bypass the core validation boundary.
**Fix:**
```typescript
private assertAnswerShape(
  questions: QuestionSnapshotDto[],
  answers: Array<{ questionId: string; optionId: string }>,
): void {
  const invalid = () =>
    new UnprocessableEntityException({
      code: 'INVALID_INSIGHT_ANSWER',
      message: 'answers must contain exactly one valid answer for each generated question',
    });

  if (
    questions.length !== QUESTION_DIMENSIONS.length ||
    !questions.every((question, index) => question.dimension === QUESTION_DIMENSIONS[index])
  ) {
    throw invalid();
  }

  const questionById = new Map(questions.map((question) => [question.id, question]));
  const answeredQuestionIds = new Set<string>();

  for (const answer of answers) {
    if (answeredQuestionIds.has(answer.questionId)) {
      throw invalid();
    }

    const question = questionById.get(answer.questionId);
    const optionExists = question?.options.some((option) => option.id === answer.optionId);
    if (!question || !optionExists) {
      throw invalid();
    }

    answeredQuestionIds.add(answer.questionId);
  }

  if (answeredQuestionIds.size !== questions.length) {
    throw invalid();
  }
}
```

## Warnings

### WR-01: LLM requests can hang indefinitely

**File:** `backend/src/llm/llm.service.ts:42-56`
**Issue:** The upstream `fetch` call has no timeout or abort signal. If the provider accepts the connection but never completes the response, the Nest request can remain pending indefinitely and tie up server resources; the current `catch` only handles immediate network failures.
**Fix:** Add an `AbortController` timeout around `fetch`, make the timeout configurable, and map aborts to `LLM_UPSTREAM_UNAVAILABLE`.

### WR-02: Backend API behavior has no automated test coverage

**File:** `backend/package.json:6-16`
**Issue:** There is no `test` script, and no `*.spec.ts` or `*.test.ts` files were found under `backend`. The changed code includes request validation, auth, LLM parsing, and persistence boundaries; without tests, regressions in the critical cases above will not be caught by CI.
**Fix:** Add a backend test runner script and focused tests for `normalizeAndValidateRawQuestion`, `InsightService.assertAnswerShape` behavior through `submitInsight`, LLM invalid JSON handling, and API token/device header rejection.

### WR-03: Client request IDs are reflected and logged without validation

**File:** `backend/src/common/middleware/request-id.middleware.ts:16-20`
**Issue:** Any non-empty `X-Request-Id` header is accepted, echoed in the response, and later included in structured logs. This allows oversized or malformed client-controlled identifiers to pollute logs and response headers. Request IDs are operational metadata and should have a small, predictable format.
**Fix:** Normalize request IDs with a maximum length and an allowlist such as `/^[A-Za-z0-9._:-]{1,128}$/`; generate a server UUID when the client value does not match.

---

_Reviewed: 2026-05-09T11:36:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
