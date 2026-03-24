import { getServerEnv } from "@/lib/env";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/**
 * OpenAI-compatible Chat Completions API with JSON-only responses.
 */
export async function completeJson<T>(messages: ChatMessage[]): Promise<T> {
  const { openaiApiKey, openaiModel } = getServerEnv();

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: openaiModel,
      messages,
      response_format: { type: "json_object" },
      temperature: 0.4,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${text.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string | null } }[];
  };
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error("Empty LLM response");

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error("LLM returned non-JSON content");
  }
}
