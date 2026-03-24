import OpenAI from "openai";
import { requireEnv } from "@/lib/env";

let _client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!_client) {
    _client = new OpenAI({ apiKey: requireEnv("OPENAI_API_KEY") });
  }
  return _client;
}

export function getOpenAIModel(): string {
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

const JSON_INSTRUCTION =
  "Respond with a single valid JSON object only. No markdown, no code fences, no commentary.";

/**
 * Chat completion that requests JSON-only output. Parses and returns object.
 */
export async function completeJson<T = unknown>(params: {
  system: string;
  user: string;
  temperature?: number;
}): Promise<T> {
  const client = getOpenAI();
  const model = getOpenAIModel();
  const res = await client.chat.completions.create({
    model,
    temperature: params.temperature ?? 0.4,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: `${params.system}\n\n${JSON_INSTRUCTION}` },
      { role: "user", content: params.user },
    ],
  });
  const text = res.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("Empty LLM response");
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`LLM returned invalid JSON: ${text.slice(0, 200)}`);
  }
}
