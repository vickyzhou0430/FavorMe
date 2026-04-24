import { AI_CONFIG } from "@/lib/ai-config";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type OpenAIChatChunk = {
  choices?: Array<{
    delta?: { content?: string };
    message?: { content?: string };
  }>;
};

function buildUrl(path: string) {
  const base = (AI_CONFIG.baseUrl || "https://api.openai.com/v1").replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

function ensurePositiveFallback(userText: string) {
  const safe = (userText || "").slice(0, 120);
  return [
    `1）你现在的犹豫，正在帮你筛掉不适合自己的选项。`,
    `2）先做一个低风险的小动作，心会先稳下来。`,
    `3）当你稳住节奏，机会会更清晰地靠近你。`,
    ``,
    `（你的输入：${safe || "空"}）`,
  ].join("\n");
}

export async function chatComplete(params: {
  userText: string;
  extraSystemPrompt?: string;
  model?: string;
}): Promise<string> {
  // 优先走服务端代理，避免把 key 暴露到浏览器端
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userText: params.userText,
      extraSystemPrompt: params.extraSystemPrompt,
      model: params.model,
      stream: false,
    }),
  });

  if (!res.ok) {
    return ensurePositiveFallback(params.userText);
  }

  const data = (await res.json().catch(() => ({}))) as { text?: string };
  return data.text?.trim() || ensurePositiveFallback(params.userText);
}

export async function chatStream(params: {
  userText: string;
  extraSystemPrompt?: string;
  model?: string;
  onToken: (token: string) => void;
  signal?: AbortSignal;
}): Promise<void> {
  // 走服务端流式（服务端会根据 provider 决定真实/模拟流）
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      stream: true,
      userText: params.userText,
      extraSystemPrompt: params.extraSystemPrompt,
      model: params.model,
    }),
    signal: params.signal,
  });

  if (!res.ok || !res.body) {
    const text = ensurePositiveFallback(params.userText);
    for (const ch of text) params.onToken(ch);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    buffer += chunk;
    // 这里服务端返回的是纯文本流，直接逐块输出即可
    params.onToken(chunk);
  }
}

