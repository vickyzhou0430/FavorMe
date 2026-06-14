## ADR-006：用户档案的 prompt 注入与 A/B 开关

- **状态**：已采纳并实现（2026-06-14）
- **日期**：2026-06-14
- **决策者**：Jimmy Sun（产品/开发）
- **关联**：扩展 [ADR-005](005-dynamic-questionnaire-state-machine.md)；任务 [005-user-profile-personalization](../tasks/005-user-profile-personalization.md)；PRD [001-dianxing-dynamic-questionnaire](../prd/001-dianxing-dynamic-questionnaire.md)（第八节"决策风格档案"商业化路径的实验雏形）

## 背景

「点醒」当前对所有用户使用同一套 system prompt 与同一套出题策略库，缺少基于用户个体特征的个性化。直觉是：把用户的基础档案（年龄、性别、星座、MBTI）作为先验注入 prompt，应能让题面情境与报告分析对个体更"贴身"，提升金句的独特感与行动建议的可执行性。

但这个直觉**未经验证**——也可能形成"标签噪音"，让模型把答题信号让位给档案刻板印象，反而降低质量。因此本特性既要"做出来"，更要"能开关、可对照"。

## 决策

### 1. 档案字段与持久化

`User` 表新增 5 列（见 migration `20260614120000_add_user_profile`）：
- `birthday DATE`、`gender TEXT`、`zodiac TEXT`、`mbti TEXT`——全部可空
- `useProfileInPrompt BOOLEAN DEFAULT false`——A/B 开关，默认关闭

枚举值与中文标签集中在 `backend/src/users/profile.constants.ts`，前后端共用 wire-name（写入 DB 始终用 key）。星座虽可由生日算出，仍单独存储——用户可主动覆盖（如出生时区/真太阳时差异）。

### 2. 注入位置：基底 + augmentation 叠加

**不维护两套完整 system prompt**，而是"基底 prompt 不变 + augmentation 块按需追加"：
- `INSIGHT_V2_SYSTEM_PROMPT`（已有，约 300 行）= 控制变量，A/B 对照时严格不动
- `INSIGHT_V2_PROFILE_PROMPT_TEMPLATE`（新增，约 50 行）= 增强块，含占位符 `{{age}}/{{gender}}/{{zodiac}}/{{mbti}}`
- effective system = `base` 或 `base + "\n\n---\n\n" + rendered(augmentation)`

两个 prompt 各有独立的 `PromptOverride` key（`insight-v2.system` / `insight-v2.profile-augmentation`），可在 `INSIGHT_V2_PROMPT_OVERRIDE_ENABLED=true` 下分别调参，互不污染。

### 3. 注入边界（最重要）

注入**只影响"生成内容"**，不动状态机：

| 维度 | 是否受档案影响 |
|------|---------------|
| JSON 格式 / `status` 三态 | ❌ |
| 计题硬性检查（已出题数、追问上限） | ❌ |
| 动态收题标准（≥2 题 + 一致性 + 深层策略） | ❌ |
| 题量上下限（MIN=2 / MAX=5） | ❌ |
| "不连续使用同一策略"等出题规则 | ❌ |
| 8 个策略的"如何贴合用户"指南 | ✅ |
| 报告 analysis 视角 / action_advice 颗粒度 | ✅ |
| 追问语气 | ✅（次要） |

augmentation 模板的"总则"明确禁止模型直白引用档案（如"作为 INFJ……"），档案应作为"侧写"融入题面情境与措辞，而非台词。

### 4. 注入触发条件（三选一为假即不注入）

1. `useProfileInPrompt = true`
2. 用户至少填写了一个 profile 字段
3. PromptOverride 中 augmentation 模板非空（默认值视为非空）

三者中任意一项不满足，effective system 严格等同基底，与未开启功能时**字节一致**——保证 A/B 对照可靠。

### 5. 客户端开关粒度：per-user（账户级）

在个人档案页放一个全局开关，不在每次会话开启时弹选择。理由：
- 实现简单（startSession 接口不变）
- A/B 对照只需用户在档案页一次切换 + 多开几次会话
- per-session 开关会引入"决策疲劳"，违背产品"减少表达压力"的初衷

未来如需更细粒度（如按议题类型选择是否启用），再另开 ADR。

### 6. 观测与回放

每次注入应用，服务端打一条日志：
```json
{ "event": "insightV2.profile.applied", "userId": "...", "fields": { "age": true, "gender": true, "zodiac": false, "mbti": true } }
```
可由日志统计 A/B 两组的金句质量差异（人工评测）或客观指标（如用户"再来一次"率）。

## 备选方案

**A. 两套完整 system prompt**：用户提出过的方案——维护 `with_profile` 和 `without_profile` 两份。**否决**：300 行 prompt 双份维护必然漂移；A/B 对照时两个变量都在变，归因困难。

**B. 仅在 system 顶部拼一段"用户是…"**：最简单。**否决**：经验上模型容易把它当作"背景信息"漂过去，不影响出题机制。用户的关键直觉是"要融入到每个策略"，augmentation 块在每个策略后挂一句"如何结合 profile"正好对应这个直觉。

**C. 在 user message 前缀注入而非 system**：每轮 user 消息前面拼一段档案。**否决**：会污染 transcript（历史回放/调试更难看清），且每轮都拼一遍冗余。

**D. 用 RAG/工具调用而非 prompt 拼接**：动态把"INFJ 用户的常见决策模式"作为知识检索。**否决**：超出当前阶段必要复杂度，且我们没有这种知识库。

## 后果

### 正面

- A/B 对照路径清晰：单一变量（`useProfileInPrompt`）、其它配置不动
- 实现成本小：1 个 migration + 1 个 prompt 文件 + service 改 ~30 行 + 前端档案页
- 是 PRD 第八节"决策风格档案"商业化路径的 MVP，演进方向自然
- augmentation 可单独 override 调参，不阻塞基底 prompt 迭代

### 负面 / 风险

- prompt 长度增加约 50 行（每次调 LLM 多消耗 token，单次决策约 +500–800 tokens × 3–7 次调用）
- 模型可能违反"不要直白引用档案"约束（如真的说出"作为 INFJ……"）——需要 prompt 加固或后处理校验
- 用户填错档案（如 MBTI 网测不准）反而让题面更"歪"——这是产品教育问题，文案侧已提示"档案可留空，AI 不直接念出"
- 缺乏自动评测能力，A/B 仍靠人工对照前期可能样本不足

### 待办

- [ ] 真实数据上跑 A/B，对比两组的"再来一次"率、平均答题数、用户主动分享意愿
- [ ] 视效果决定是否把 augmentation 进一步细化到"按冲突类型 × 档案"二维（如类型 D × MBTI=F 走更深的自我决定论问法）
- [ ] 考虑给 augmentation 加自动质量校验（如收题报告里出现 "INFJ"/"天蝎座" 等直白词时记告警）
