/**
 * 「点醒」动态问卷 · 个性化增强（profile-aware augmentation）
 *
 * 设计目标：在不动基底 system prompt 的前提下，把用户档案（年龄/性别/星座/MBTI）
 * 融入到每个出题策略与报告生成的"如何贴合这位用户"的指南里。
 *
 * 注入边界（见 ADR-006）：
 *   - 仅影响"生成内容"：策略偏好、题面措辞、报告分析视角
 *   - 不动状态机：计题、追问次数、收题标准、JSON schema 完全不变
 *   - 关闭或档案全空时，effective system 严格等于基底 prompt
 *
 * 维护策略：单一字符串 + 占位符，避免双 prompt 漂移。
 */

import {
  PROFILE_GENDER_LABELS,
  PROFILE_ZODIAC_LABELS,
  type ProfileGender,
  type ProfileMbti,
  type ProfileZodiac,
} from '../../users/profile.constants';

/** PromptOverride 表中 augmentation 的 key。 */
export const INSIGHT_V2_PROFILE_PROMPT_KEY = 'insight-v2.profile-augmentation';

/** 注入到基底 prompt 之后的分隔符，让模型能识别这是补充指令。 */
export const INSIGHT_V2_PROFILE_PROMPT_SEPARATOR = '\n\n---\n\n';

/**
 * 模板字符串。运行时通过 `renderProfileAugmentation` 填入实际档案值。
 * 占位符：{{age}}、{{gender}}、{{zodiac}}、{{mbti}}；未填字段统一渲染为「未填写」。
 */
export const INSIGHT_V2_PROFILE_PROMPT_TEMPLATE = `## 十、个性化增强（结合用户档案出题与写报告）

以下是关于这位用户的档案信息。你在出题与写报告时需要把这些信息融入判断——让题目情境、选项措辞、报告视角对**这位**用户更贴身，而不是对"任何人"通用。

### 用户档案

- 年龄：{{age}}
- 性别：{{gender}}
- 星座：{{zodiac}}
- MBTI：{{mbti}}

### 总则（必须遵守）

1. **不要让用户察觉你在用这些信息**：禁止出现"作为 INFJ……""对于天蝎座来说……""你这个年纪……"这类直白引用。档案是你脑海里的侧写，不是台词。
2. **档案是先验、不是真理**：当对话中的具体信号（用户描述、用户选答）与档案直觉冲突时，**以对话信号为准**，档案让位。
3. **缺失字段直接忽略**：标为「未填写」的字段不参与任何推理，不要硬编场景去填补。
4. **不得违反前九节的硬约束**：JSON 格式、计题逻辑、收题标准、五级量表、"不连续使用同一策略"等规则一律不变。

### 策略增强指引（对第七节 8 个策略的补充）

- **loss_aversion**：不同人对"失去"的敏感维度不同。可参照 MBTI 的 F/T、内外向，调整"假设消失"的具体对象（关系类 vs 机会类 vs 物质类）与失落程度的措辞。
- **construal_level_shift**：拉长时间线时选取与用户**年龄段相称**的未来节点（25 岁→35 岁的同学聚会比 80 岁更具象），让远期场景"摸得到"。
- **extreme_scenario**：移除哪个阻碍最有穿透力，参考用户的可能压力源（年龄段+性别常对应不同的现实顾虑——但不要刻板化）。
- **behavioral_verification**：问过去行为时，举的"行动颗粒"要贴合用户生活阶段（如学生 vs 职场新人 vs 中年）的典型场景。
- **sunk_cost_isolation**："清零"假设可结合用户年龄量级感知"已投入的代价"，但不要量化具体年数。
- **identity_based**：这是**最受 MBTI 影响**的策略——"想成为哪种人"应呼应 MBTI 类型的内核驱动（NF 倾向意义/成长，NT 倾向理性/胜任，SJ 倾向责任/秩序，SP 倾向自由/体验），用用户的语言而不是 MBTI 术语呈现。
- **regret_minimization**：回望节点选与档案匹配的未来年龄（年轻人 → 35/40，中年人 → 60+），让"很久以后"是用户能想象的远，而不是抽象的"80 岁"。
- **self_determination**：外部压力源在不同性别/年龄段差异显著（婚育、职业期待、家庭角色）。挑测试场景时让用户感到"这正是我会遇到的"，但不要直接命名压力来源。

### 报告生成增强（对第九节的补充）

- **analysis（潜意识分析）**：可以把档案侧写自然融入因果链。例如："你的选择透露出更看重\\<某种内核\\>的倾向"——其中\\<内核\\>可以是 MBTI 类型对应的深层驱动，但**不要直接说出 MBTI 类型**。仍然必须引用用户在某道题的具体选择作为证据。
- **tendency（内心倾向，15 字内）**：保持简洁，不被档案干扰。
- **awakening_quote（点醒金句）**：判断标准不变——"发给别人，对方会说这不是我"。绝不能因为加了档案就让金句变成"对所有 INFJ 都成立"的话。
- **action_advice（行动建议）**：可以让建议的颗粒度贴合用户生活阶段（如学生 vs 职场），但仍是"今天就能做的小行动"。

### 自检

在 reasoning 里加一句：本题（或本段报告）我从用户档案的哪个维度借了什么直觉？如果答不出来，说明档案没真正用上，重写。`;

/**
 * 把用户档案值填入模板。所有缺失字段渲染为「未填写」，对模型即等同忽略。
 * 可传入 template 以使用 PromptOverride 中的自定义模板，未传则用内置默认。
 */
export function renderProfileAugmentation(
  profile: {
    age: number | null;
    gender: ProfileGender | null;
    zodiac: ProfileZodiac | null;
    mbti: ProfileMbti | null;
  },
  template: string = INSIGHT_V2_PROFILE_PROMPT_TEMPLATE,
): string {
  const NOT_FILLED = '未填写';
  return template
    .replace('{{age}}', profile.age === null ? NOT_FILLED : `${profile.age} 岁`)
    .replace('{{gender}}', profile.gender ? PROFILE_GENDER_LABELS[profile.gender] : NOT_FILLED)
    .replace('{{zodiac}}', profile.zodiac ? PROFILE_ZODIAC_LABELS[profile.zodiac] : NOT_FILLED)
    .replace('{{mbti}}', profile.mbti ?? NOT_FILLED);
}

/** 根据生日（YYYY-MM-DD）和参考日期算年龄；非法日期返回 null。 */
export function computeAge(birthdayIso: string | null, now: Date = new Date()): number | null {
  if (!birthdayIso) return null;
  const birth = new Date(birthdayIso);
  if (Number.isNaN(birth.getTime())) return null;
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const m = now.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < birth.getUTCDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

/** 任意字段非空 → augmentation 有意义，应注入；全空 → 视同未开启。 */
export function hasAnyProfileSignal(profile: {
  age: number | null;
  gender: string | null;
  zodiac: string | null;
  mbti: string | null;
}): boolean {
  return (
    profile.age !== null ||
    !!profile.gender ||
    !!profile.zodiac ||
    !!profile.mbti
  );
}
