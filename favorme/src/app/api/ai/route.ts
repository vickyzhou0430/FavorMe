import { NextResponse } from "next/server";
import { AI_CONFIG, SERVER_AI_CONFIG } from "@/lib/ai-config";

type Body = {
  userText?: string;
  extraSystemPrompt?: string;
  model?: string;
  stream?: boolean;
};

function ensurePositiveFallback(userText: string) {
  const safe = (userText || "").slice(0, 120);
  return [
    `1) Smarter avoidance: this clarifies what isn’t for you—your next step gets lighter.`,
    `2) Experience compounds: your judgment is sharper, and smoother choices follow.`,
    `3) Opportunity nears: as old paths refresh, better-fit people and resources appear.`,
    ``,
    `(You wrote: ${safe || "empty"})`,
  ].join("\n");
}

function jsonTextFromArk(resp: any): string {
  // Ark /responses 返回结构可能随版本变化；这里尽量做宽松提取
  const direct =
    resp?.output_text ||
    resp?.output?.[0]?.content?.[0]?.text ||
    resp?.output?.[0]?.content?.[0]?.content ||
    resp?.choices?.[0]?.message?.content;
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  const textParts: string[] = [];
  const output = resp?.output;
  if (Array.isArray(output)) {
    for (const item of output) {
      const c = item?.content;
      if (Array.isArray(c)) {
        for (const seg of c) {
          if (typeof seg?.text === "string") textParts.push(seg.text);
        }
      }
    }
  }
  const joined = textParts.join("").trim();
  return joined;
}

async function callArkResponses(params: {
  apiKey: string;
  baseUrl: string;
  model: string;
  system: string;
  userText: string;
}): Promise<string> {
  const base = params.baseUrl.replace(/\/$/, "");
  const url = `${base}/responses`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: params.model,
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: params.system }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: params.userText }],
        },
      ],
    }),
  });

  if (!res.ok) return "";
  const json = await res.json().catch(() => ({}));
  return jsonTextFromArk(json);
}

async function callOpenAIChat(params: {
  apiKey: string;
  baseUrl: string;
  model: string;
  system: string;
  userText: string;
}): Promise<string> {
  const base = params.baseUrl.replace(/\/$/, "");
  const url = `${base}/chat/completions`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: params.model,
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.userText },
      ],
      temperature: 0.7,
    }),
  });

  if (!res.ok) return "";
  const json = await res.json().catch(() => ({}));
  const content = json?.choices?.[0]?.message?.content;
  return typeof content === "string" ? content.trim() : "";
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const userText = (body.userText || "").trim();

  const system = [AI_CONFIG.systemPrompt, body.extraSystemPrompt].filter(Boolean).join("\n");

  const apiKey = (SERVER_AI_CONFIG.apiKey || AI_CONFIG.apiKey || "").trim();
  const baseUrl = (SERVER_AI_CONFIG.baseUrl || AI_CONFIG.baseUrl || "").trim();
  const model =
    (body.model || SERVER_AI_CONFIG.model || "").trim() || "gpt-4o-mini";

  if (!userText) {
    return NextResponse.json({ text: "" });
  }

  if (!apiKey) {
    const text = ensurePositiveFallback(userText);
    return NextResponse.json({ text, provider: "fallback:no_api_key" });
  }

  let text = "";
  const isArk = /volces\.com\/api\/v3/.test(baseUrl);
  if (isArk) {
    text = await callArkResponses({
      apiKey,
      baseUrl,
      model,
      system,
      userText,
    });
  } else {
    text = await callOpenAIChat({
      apiKey,
      baseUrl,
      model,
      system,
      userText,
    });
  }

  const usedFallback = !text;
  if (!text) text = ensurePositiveFallback(userText);

  const stream = Boolean(body.stream);
  if (!stream) {
    return NextResponse.json({
      text,
      provider: isArk ? "ark" : "openai-compatible",
      usedFallback,
    });
  }

  // 以服务端模拟流式：逐字符输出，前端保持“打字机”体验
  const encoder = new TextEncoder();
  const rs = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for (const ch of text) {
          controller.enqueue(encoder.encode(ch));
          // 轻微节奏感（不过度拖慢）
          await new Promise((r) => setTimeout(r, 8));
        }
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(rs, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

