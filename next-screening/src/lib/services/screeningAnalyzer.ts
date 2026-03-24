import { z } from "zod";
import { completeJson } from "@/lib/ai/client";
import type { SupabaseClient } from "@supabase/supabase-js";

const analysisSchema = z.object({
  ai_summary: z.string(),
  ai_skill_scores: z.record(z.string(), z.number().min(0).max(100)),
  ai_overall: z.number().min(0).max(100),
  ai_flags: z.array(z.string()),
});

export async function runScreeningAnalysis(
  db: SupabaseClient,
  invitationId: string
): Promise<void> {
  const { data: inv, error: invErr } = await db
    .from("screening_invitations")
    .select("id, template_id, application_id")
    .eq("id", invitationId)
    .maybeSingle();

  if (invErr) throw invErr;
  if (!inv) throw new Error("Invitation not found");

  const { data: responses, error: rErr } = await db
    .from("screening_responses")
    .select("question_id, answer_text, answer_values")
    .eq("invitation_id", invitationId);

  if (rErr) throw rErr;

  const { data: questions, error: qErr } = await db
    .from("screening_questions")
    .select("id, question, type, options, scale_min, scale_max")
    .eq("template_id", inv.template_id)
    .order("order_index");

  if (qErr) throw qErr;

  const qList = questions || [];
  const answerLines = qList.map((q) => {
    const r = (responses || []).find(
      (x: { question_id: string }) => x.question_id === q.id
    );
    const ans =
      q.type === "text"
        ? r?.answer_text ?? ""
        : JSON.stringify(r?.answer_values ?? null);
    return `Q (${q.type}): ${q.question}\nAnswer: ${ans}`;
  });

  const system = `You evaluate candidate screening answers. Reply ONLY JSON:
{
  "ai_summary": string (2-4 sentences),
  "ai_skill_scores": { "<skill or topic>": 0-100, ... },
  "ai_overall": 0-100,
  "ai_flags": string[] (concerns or strengths, short phrases)
}`;

  const user = `Screening Q&A:\n${answerLines.join("\n\n")}`;

  const raw = await completeJson<unknown>([
    { role: "system", content: system },
    { role: "user", content: user },
  ]);

  const out = analysisSchema.parse(raw);

  const { data: existing } = await db
    .from("screening_ai_analysis")
    .select("id")
    .eq("invitation_id", invitationId)
    .maybeSingle();

  const payload = {
    invitation_id: invitationId,
    ai_summary: out.ai_summary,
    ai_skill_scores: out.ai_skill_scores,
    ai_overall: out.ai_overall,
    ai_flags: out.ai_flags,
    status: "pending" as const,
  };

  if (existing?.id) {
    const { error } = await db
      .from("screening_ai_analysis")
      .update({
        ai_summary: payload.ai_summary,
        ai_skill_scores: payload.ai_skill_scores,
        ai_overall: payload.ai_overall,
        ai_flags: payload.ai_flags,
        status: "pending",
      })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await db.from("screening_ai_analysis").insert(payload);
    if (error) throw error;
  }
}
