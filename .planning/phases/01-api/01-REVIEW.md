---
phase: 01-api
reviewed: 2026-05-10T02:22:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - backend/src/insight/insight.service.ts
  - backend/src/insight/dto/submit-insight.dto.ts
  - backend/src/insight/insight-submit.validation.test.ts
  - backend/package.json
  - backend/README.md
findings:
  critical: 1
  warning: 0
  info: 0
  total: 1
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-05-10T02:22:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

复核了 Phase 01 gap-closure 指定的 5 个文件，重点追踪 `POST /v1/insight/submit` 是否在 user upsert、LLM、持久化之前拒绝不完整、重复或被篡改的 question snapshot。

本次变更已经关闭了上一轮 Critical 的一部分：`assertAnswerShape` 现在在 `ensureUserId`、LLM 调用和 `InsightRound` 写入之前执行，并拒绝错误数量、维度错序、重复 question id、重复 option id、重复 answer、缺失 question、缺失 option、未答满三题等形状/关系错误。

但“被篡改的 question snapshot”仍未完全关闭：只要客户端提交 3 个维度顺序正确、ID 唯一、答案能匹配选项的快照，就可以任意改写题目标题、选项文案，甚至把 `q1/q2/q3` 改成其他唯一 ID 后生成结论。服务端没有存储原始生成快照，也没有校验服务端签名，因此无法区分真实生成结果和客户端伪造的合法形状 payload。

## Critical Issues

### CR-01: Submit still accepts content-tampered but shape-valid question snapshots

**Severity:** BLOCKER / Critical

**File:** `backend/src/insight/insight.service.ts:213-268`
**Issue:** 当前校验只证明 payload 是“三题、三答、维度顺序正确、ID/选项关系自洽”，但没有证明这些 `questions` 是后端刚刚生成并返回给客户端的原始快照。攻击者可以提交如下形状合法但内容伪造的 payload：`inner_preference/fear_boundary/active_vs_avoidance` 三个维度保持顺序，question id 各不相同，answers 指向存在的 option id，但 `title` 和 `options[].label` 被改写为任意内容。该 payload 会通过 `assertAnswerShape`，随后触发 user upsert、LLM 结论生成和持久化，仍然违反“submit must reject tampered question snapshots before user upsert, LLM, or persistence”的关闭条件。现有回归测试的“tampered snapshots”只覆盖错序、缺失引用、缺失选项和选项数过少，没有覆盖合法形状下的题干/选项内容篡改。
**Fix:**
```typescript
// One storage-free option: return this token from /insight/questions and require it on submit.
const snapshotPayload = {
  rawQuestion,
  questions,
};
const questionSnapshotToken = signSnapshot(snapshotPayload, env.QUESTION_SNAPSHOT_SECRET);

// In submitInsight, before ensureUserId / LLM / persistence:
this.assertAnswerShape(dto.questions, dto.answers);
this.assertSnapshotSignature({
  rawQuestion,
  questions: dto.questions,
  token: dto.questionSnapshotToken,
});
```

Concrete remediation options:

1. Add a server-issued HMAC token over the canonical `rawQuestion + questions` JSON returned by `/insight/questions`, require that token in `SubmitInsightDto`, and verify it before `ensureUserId`. Use stable canonical JSON serialization so equivalent key order does not break signatures.
2. Or store generated question snapshots server-side under a short-lived round/session id and compare the submitted snapshot exactly before any side effects.
3. Add regression tests that mutate only `questions[0].title`, `questions[0].options[0].label`, and/or a question id while preserving a self-consistent answer shape, then assert `422 INVALID_INSIGHT_ANSWER` and zero LLM/user/persistence calls.

## Residual Warnings

No residual warnings were found in the reviewed file set. The previous LLM timeout and request-id validation warnings are outside this review's configured file scope, and the previous “no backend test coverage” warning is no longer accurate for this gap-closure because `backend/src/insight/insight-submit.validation.test.ts` and `test:insight-submit` now exist.

---

_Reviewed: 2026-05-10T02:22:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
