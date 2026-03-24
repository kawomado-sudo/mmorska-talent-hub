import { NextRequest } from "next/server";
import { submitScreeningAnswers } from "@/lib/services/screeningOrchestration";

export async function POST(req: NextRequest) {
  let body: {
    token?: string;
    answers?: { question_id: string; answer_text?: string; answer_values?: unknown }[];
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const token = body.token?.trim();
  if (!token) return Response.json({ error: "token is required" }, { status: 400 });
  if (!Array.isArray(body.answers)) {
    return Response.json({ error: "answers must be an array" }, { status: 400 });
  }

  try {
    const result = await submitScreeningAnswers({ token, answers: body.answers });
    return Response.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Submit failed";
    return Response.json({ error: msg }, { status: 400 });
  }
}
