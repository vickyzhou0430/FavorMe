# 设计（Figma 与设计交付）

本目录是**设计在仓库内**的入口：所有**对外/对内**的 Figma 与交付约定都从这里找，不依赖口播或单条消息。

> **UI/视觉 真源在 Figma**；代码实现以**设计稿 + PRD 验收**为准。若冲突：**先对齐**再改 PRD 或设计稿，避免「无记录地改实现」。

## 1. 设计角色在本仓库的固定动作

1. 在 **Figma** 维护**唯一主文件/分支**（或明确「开发只跟哪个文件」）—— 写在 [`figma-sources.md`](figma-sources.md)。  
2. 有**结构性变更**（导航、新页面、大改版）时，在 [`CHANGELOG.md`](CHANGELOG.md) 增加一条。  
3. 建议：在 Figma 的页面/框架名上标注 **`PRD-0NN`**，与 [`../prd/README.md`](../prd/README.md) 对齐。  
4. 对开发交接：大页面可用 [交付模板](_template-handoff.md) 复制后填（可选，按团队习惯采用）。

## 2. 文件

| 文件 | 作用 |
|------|------|
| [`figma-sources.md`](figma-sources.md) | 所有 Figma 链接、说明、**当前开发跟随的版本** |
| [`CHANGELOG.md`](CHANGELOG.md) | 设计侧重大变更，便于产品和开发追溯 |
| [`_template-handoff.md`](_template-handoff.md) | 单页/单模块交付（标注、断点、状态，可选） |

## 3. 与产品、开发的衔接

- **产品**：在 PRD 中引用 Figma 章节或链接键（不复制整树 URL 也可，以 `figma-sources` 的锚点为准）。  
- **开发**：在任务/PR 中写 **Figma 节点/页面** + 对应 **PRD-0NN**；切图/导出**策略**在团队内定一种（Figma export / 代码内资源 / 对象存储）并可在本 README 增一节。

## 4. 工具链（若团队采用）

- 若使用 **Figma Code Connect** 等「设计 ↔ 代码」映射，可在子目录中增加与仓库约定，并在 [`../decisions/`](../decisions/) 里留一条短 ADR。

## 5. 模板

- 单页/模块设计交付见 [`_template-handoff.md`](_template-handoff.md)。
