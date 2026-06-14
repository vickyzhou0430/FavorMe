# 任务 005：用户档案 + 个性化 prompt 注入（A/B 实验性）

- **状态**：实现完成（后端 + Flutter + docs；待真机/真实 LLM 联调与 A/B 评测）
- **负责人**：Jimmy Sun
- **创建日期**：2026-06-14
- **目标完成**：TBD
- **依据**：[ADR-006](../decisions/006-user-profile-prompt-injection.md)；扩展 [ADR-005](../decisions/005-dynamic-questionnaire-state-machine.md) 与任务 [004](004-dianxing-dynamic-questionnaire.md)；PRD [001-dianxing-dynamic-questionnaire](../prd/001-dianxing-dynamic-questionnaire.md)（第八节"决策风格档案"商业化路径的 MVP）

## 目标

为 `User` 增加基础档案（生日 / 性别 / 星座 / MBTI），允许用户在档案页统一开关"是否结合个人信息出题"。开启后，后端在每次 insight-v2 会话首轮和后续轮调用 LLM 时，把渲染好的"个性化增强 prompt"叠加到基底 system prompt 之后，让 8 个出题策略与报告生成可以引用档案视角。**关闭或档案全空时，effective system 严格等同基底，保证 A/B 对照可靠**（见 ADR-006）。

## 不在此任务范围内

- 真正的账号体系 / 登录态（继续匿名 + deviceId）
- 自动化 A/B 评测框架（指标采集与人工评测分流）
- 二维细化（冲突类型 × 档案）
- 客户端档案教育/引导文案的完整设计
- prompt augmentation 违规的自动检测（如金句出现 "INFJ" 等直白词时告警）

## 前置条件

- [x] 确认 ADR-006 的注入位置与边界
- [x] 确认枚举值（gender 4 项 / zodiac 12 项 / MBTI 16 项）
- [x] 确认开关粒度为 per-user（账户级，档案页一个开关）
- [x] 确认 UI 沿用现有 `app_theme`（非 PRD 的深夜诊室风格）

## 实现要点

### 1. DB（migration `20260614120000_add_user_profile`）

```sql
ALTER TABLE "User"
  ADD COLUMN "birthday" DATE,
  ADD COLUMN "gender" TEXT,
  ADD COLUMN "zodiac" TEXT,
  ADD COLUMN "mbti" TEXT,
  ADD COLUMN "useProfileInPrompt" BOOLEAN NOT NULL DEFAULT false;
```

### 2. 后端

- **常量**：`backend/src/users/profile.constants.ts` 集中 GENDERS / ZODIACS / MBTI 与中文 label
- **DTO**：`UpdateProfileDto`（PATCH 语义：缺省 = 不变；显式 null = 清空；有值 = 写入）
- **接口**：
  - `GET /v1/users/me` — 返回当前 profile（不存在则 upsert 空记录）
  - `PATCH /v1/users/me` — 局部更新
- **个性化 prompt**：`backend/src/insight-v2/prompts/insight-v2-profile.prompt.ts`
  - 包含 8 策略 + 报告生成的"如何结合 profile"指南
  - 占位符渲染：`renderProfileAugmentation(profile, template?)`
  - `computeAge` / `hasAnyProfileSignal` 辅助函数
- **注入逻辑**：`InsightV2Service.loadProfileAugmentation(userId)`
  - 返回 `string | null`；null 时 callModel 走原路径
  - 触发条件三选一为假即不注入（见 ADR-006 §4）
  - 每次注入打日志 `insightV2.profile.applied`
- **运行时调参**：新增 `PromptOverride` key `insight-v2.profile-augmentation`，与基底独立

### 3. Flutter

- **模型**：`features/profile/profile_models.dart`（`UserProfile`、`UpdateProfileRequest`、枚举）
- **API client**：`features/profile/profile_api_client.dart`（复用 `InsightApiException`，HTTP _send 模式）
- **档案页**：`features/profile/profile_screen.dart`
  - 顶部 `SwitchListTile`：结合个人信息出题
  - 表单：生日（`showDatePicker`）+ 性别/星座/MBTI（Dropdown，支持选"未填写"清空）
  - 保存按钮 PATCH 差异字段
- **入口**：`InsightV2Screen` AppBar 加 👤 按钮 `_openProfile` → `ProfileScreen`
- **应用装配**：`FavorMeApp` 同时初始化 `ProfileApiClient`，注入到 `InsightV2Screen`

## 验收标准

- [x] migration 应用后 `User` 表新增 5 列
- [x] `GET /v1/users/me` / `PATCH /v1/users/me` 通过；非法 MBTI / gender / zodiac / 生日范围拒绝
- [x] 关闭开关或档案全空时，effective system 字节等同基底（新增 3 个 unit test 覆盖）
- [x] 开启 + 任意字段非空时，system 包含 augmentation 头与渲染后的档案值
- [x] 现有 12 个 insight-v2 测试全通过；新增 3 个 profile 注入测试全通过
- [x] Flutter analyze 不引入新 warning / error
- [x] Flutter 11 个测试全通过
- [ ] 真机 / 真实 LLM 联调：开关切换后效果有可感差异（人工评测）
- [ ] A/B 对照：开启与关闭两组在金句独特性、动作建议可执行性、再来一次率等维度对比

## 进度

- 2026-06-14：完成 DB / Backend API / Augmentation prompt / Flutter UI / ADR-006 / 本任务文档

## 已修改/新增文件（便于 code review）

**后端**
- 新：`backend/prisma/migrations/20260614120000_add_user_profile/migration.sql`
- 改：`backend/prisma/schema.prisma`（User 加 5 列）
- 新：`backend/src/users/profile.constants.ts`
- 新：`backend/src/users/dto/update-profile.dto.ts`
- 改：`backend/src/users/users.service.ts`（加 get / update profile）
- 改：`backend/src/users/users.controller.ts`（加 GET / PATCH /me）
- 改：`backend/src/users/users.module.ts`（exports UsersService）
- 新：`backend/src/insight-v2/prompts/insight-v2-profile.prompt.ts`
- 改：`backend/src/insight-v2/insight-v2.service.ts`（loadProfileAugmentation + 注入）
- 改：`backend/src/insight-v2/insight-v2.module.ts`（imports UsersModule）
- 改：`backend/src/insight-v2/insight-v2.service.test.ts`（mock findUnique + 3 个新 test case）

**Flutter**
- 新：`clients/flutter/lib/src/features/profile/profile_models.dart`
- 新：`clients/flutter/lib/src/features/profile/profile_api_client.dart`
- 新：`clients/flutter/lib/src/features/profile/profile_screen.dart`
- 改：`clients/flutter/lib/src/app/favorme_app.dart`（装配 ProfileApiClient）
- 改：`clients/flutter/lib/src/features/insight_v2/insight_v2_screen.dart`（AppBar 加档案按钮）

**文档**
- 新：`docs/decisions/006-user-profile-prompt-injection.md`
- 新：`docs/tasks/005-user-profile-personalization.md`（本文件）
- 改：`docs/prd/001-dianxing-dynamic-questionnaire.md`（修订记录 + 第七节加一行 + 第八节链接）
- 改：`docs/decisions/README.md`、`docs/tasks/README.md`（索引补行）

## 阻塞与风险

- prompt 长度增加约 50 行 → 每次 LLM 调用多 ~500–800 tokens。需观察接口成本。
- augmentation 模板要求模型不直白引用档案（不说"作为 INFJ"），目前仅靠 prompt 约束；若实测违规率高，需要加输出后处理。
- 用户填错档案（MBTI 网测随便选）反而让题面变歪，是产品教育问题，需要后续在档案页加引导文案。

## 交接给下一会话

下一步动作（按优先级）：

1. **真实 LLM 联调验证**：本地启动 backend 与 Flutter，开启开关，开几个不同议题的会话，肉眼对比"开/关 profile"两组的题面与报告差异。重点看：
   - 模型有没有违反"不要直白引用档案"约束（出现"作为 INFJ……"即违规）
   - 第七节策略 hints 是否真的影响到了出题（如 identity_based 是否真的换了 MBTI 类型语言）
   - 第九节报告 analysis 是否引用了档案视角
2. 如果观察到效果不显著或被忽略，第一步先加强 augmentation 模板（增加示例 / 调整语气 / 加强自检）
3. 真实数据上跑小样本 A/B（10–20 人），收集主观反馈
4. 视效果再决定是否把 augmentation 细化到二维（冲突类型 × 档案），见 ADR-006 "待办"

PromptOverride 的两个 key：
- `insight-v2.system`（已有）
- `insight-v2.profile-augmentation`（新增）

可在 Flutter "Prompt 调参" 页（需 `INSIGHT_V2_PROMPT_OVERRIDE_ENABLED=true`）独立调参——但当前 Prompt 调参页只面向 `insight-v2.system`，若要调 augmentation 需后续在 debug 页加 key 切换或单开一页。
