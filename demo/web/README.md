## 利我（FavorMe）Web App Demo

基于需求文档实现的 Demo（Next.js App Router + Tailwind + Framer Motion + Lucide）。

### 功能概览

- **模块一：用户信息**：`/login` 填写资料；`/profile` 支持编辑管理（本地存储）。
- **模块二：今日运势**：`/fortune` 生成“今日关键词/宜做/妙招/幸运小事件”（全程正向归因）。
- **模块三：生命灵数决策器**：`/decision` 调用 `/api/calculate` 计算灵数与能量值，再生成正向推荐。
- **模块四：AI 正向解算（核心看板）**：`/board` 输入事件，输出 3 个利好维度（支持流式打字效果）。

### 环境变量

在 `demo/web/.env.local` 填写（本目录为 Next 应用根目录）：

- `NEXT_PUBLIC_AI_API_KEY`: 你的 API Key（OpenAI 兼容）
- `NEXT_PUBLIC_AI_ENDPOINT`: 默认 `https://api.openai.com/v1`

不填 Key 也能跑：会使用内置的**正向示例输出**，方便先体验流程与 UI。

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
