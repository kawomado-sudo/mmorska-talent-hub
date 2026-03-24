import { z } from "zod";
import { getHrServiceClient } from "@/lib/supabase/server";
import { completeJson } from "@/lib/ai/client";

const analysisSchema = z.object({
  ai_summary: z.string().min(1),
  ai_skill_scores: z.record(z.string(), z.number().min(0).max(100)),
  ai_overall: z.number().min(0).max(100),
  ai_flags: z.array(z.string()).optional().default([]),
});

export type ScreeningAnalysisResult = z.infer<typeof analysisSchema>;

export async function runScreeningAnalysis(invitationId: string): Promise<ScreeningAnalysisResult> {
  const db = getHrServiceClient();

  const { data: inv, error: invErr } = await db
    .from("screening_invitations")
    .select("id, application_id, template_id")
    .eq("id", invitationId)
    .single();
  if (invErr || !inv) throw new Error(invErr?.message || "Invitation not found");

  const { data: app } = await db
    .from("applications")
    .select("first_name, last_name, job_id")
    .eq("id", inv.application_id)
    .single();

  const { data: job } = await db.from("jobs").select("title, description").eq("id", app?.job_id).maybeSingle();

  const { data: questions, error: qErr } = await db
    .from("screening_questions")
    .select("id, question, type, options, scale_min, scale_max, skill_id")
    .eq("template_id", inv.template_id)
    .order("order_index");
  if (qErr) throw new Error(qErr.message);

  const { data: responses, error: rErr } = await db
    .from("screening_responses")
    .select("question_id, answer_text, answer_values")
    .eq("invitation_id", invitationId);
  if (rErr) throw new Error(rErr.message);

  const payload = {
    candidate: app
      ? { first_name: app.first_name, last_name: app.last_name }
      : null,
    job: job || null,
    qa: (questions || []).map((q: Record<string, unknown>) => {
      const resp = (responses || []).find((r: { question_id: string }) => r.question_id === q.id);
      return { question: q, response: resp || null };
    }),
  };

  const system =
    "You are a hiring analyst. Given structured Q&A, score fit. Output JSON only with keys: ai_summary (string), ai_skill_scores (object skillName->0-100 number), ai_overall (0-100), ai_flags (string array of concerns or strengths). Use concise professional language.";

  const user = JSON.stringify(payload);

  const raw = await completeJson<unknown>({ system, user, temperature: 0.2 });
  const parsed = analysisSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Analysis validation failed: ${parsed.error.message}`);
  }
  return parsed.data;
}

export async function upsertAnalysisRow(invitationId: string, result: ScreeningAnalysisResult) {
  const db = getHrServiceClient();
  const { data: existing } = await db.from("screening_ai_analysis").select("id").eq("invitation_id", invitationId).maybeSingle();

  const row = {
    invitation_id: invitationId,
    ai_summary: result.ai_summary,
    ai_skill_scores: result.ai_skill_scores,
    ai_overall: result.ai_overall,
    ai_flags: result.ai_flags,
    status: "pending" as const,
  };

  if (existing?.id) {
    const { error } = await db.from("screening_ai_analysis").update(row).eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await db.from("screening_ai_analysis").insert(row);
    if (error) throw new Error(error.message);
  }
}
