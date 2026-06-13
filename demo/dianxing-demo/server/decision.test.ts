import { describe, expect, it, vi } from "vitest";

// Mock invokeLLM
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            status: "questioning",
            question: {
              question: "如果字节的offer今天被撤回了，你第一反应是？",
              option_a: "松了口气，不用纠结了",
              option_b: "有点失落，感觉少了什么",
              strategy: "损失厌恶测试",
              reasoning: "测试用户对字节offer的真实感受",
            },
          }),
        },
      },
    ],
  }),
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("decision.chat", () => {
  it("should return a questioning response for a valid dilemma", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.decision.chat({
      messages: [
        {
          role: "user",
          content: "我现在有个纠结：字节30k稳定但岗位边缘，AI创业公司22k但感兴趣",
        },
      ],
    });

    expect(result).toBeDefined();
    expect(result.status).toBe("questioning");
    expect(result.question).toBeDefined();
    expect(result.question.option_a).toBeTruthy();
    expect(result.question.option_b).toBeTruthy();
    expect(result.question.strategy).toBeTruthy();
  });

  it("should accept assistant messages in conversation history", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.decision.chat({
      messages: [
        { role: "user", content: "我在纠结要不要辞职" },
        {
          role: "assistant",
          content: JSON.stringify({ status: "questioning", question: { question: "测试题", option_a: "A", option_b: "B", strategy: "损失厌恶测试" } }),
        },
        { role: "user", content: "我选择A：松了口气" },
      ],
    });

    expect(result).toBeDefined();
    expect(["questioning", "finished", "need_info"]).toContain(result.status);
  });
});
