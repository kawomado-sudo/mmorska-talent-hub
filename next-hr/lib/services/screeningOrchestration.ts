import { randomUUID } from "crypto";
import { getHrServiceClient } from "@/lib/supabase/server";
import { getPublicSiteUrl } from "@/lib/env";
import { runScreeningAnalysis, upsertAnalysisRow } from "@/lib/services/screeningAnalyzer";

export type InvitationStatus = "pending" | "started" | "completed" | "expired";

export async function createInvitation(params: {
  application_id: string;
  template_id: string;
  expiresInDays?: number;
}) {
  const db = getHrServiceClient();
  const { data: app, error: appErr } = await db.from("applications").select("id, job_id").eq("id", params.application_id).single();
  if (appErr || !app) throw new Error("Application not found");

  const { data: tpl, error: tplErr } = await db.from("screening_templates").select("id, job_id, is_global").eq("id", params.template_id).single();
  if (tplErr || !tpl) throw new Error("Template not found");

  const okGlobal = tpl.is_global === true;
  const okJob = tpl.job_id === app.job_id;
  if (!okGlobal && !okJob) {
    throw new Error("Template is not available for this application's job");
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (params.expiresInDays ?? 7));

  const token = randomUUID();

  const { data: row, error } = await db
    .from("screening_invitations")
    .insert({
      application_id: params.application_id,
      template_id: params.template_id,
      token,
      status: "pending" as InvitationStatus,
      expires_at: expiresAt.toISOString(),
      sent_at: new Date().toISOString(),
    })
    .select("id, token")
    .single();

  if (error || !row) throw new Error(error?.message || "Failed to create invitation");

  const base = getPublicSiteUrl();
  const link = `${base}/screening/${row.token}`;

  return { invitation_id: row.id as string, token: row.token as string, invitation_link: link, expires_at: expiresAt.toISOString() };
}

export async function getCandidateSession(token: string) {
  const res = await getInvitationByToken(token);
  if ("error" in res && res.error === "not_found") {
    return { error: "not_found" as const };
  }
  if ("error" in res && res.error === "expired") {
    return { error: "expired" as const };
  }
  if (!("invitation" in res)) return { error: "not_found" as const };

  const { template, questions } = await fetchTemplateWithQuestions(res.invitation.template_id);
  return {
    invitation: res.invitation,
    completed: res.completed,
    template,
    questions,
  };
}

export async function getInvitationByToken(token: string) {
  const db = getHrServiceClient();
  const { data: inv, error } = await db.from("screening_invitations").select("*").eq("token", token).maybeSingle();
  if (error) throw new Error(error.message);
  if (!inv) return { error: "not_found" as const };

  if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
    if (inv.status !== "expired") {
      await db.from("screening_invitations").update({ status: "expired" }).eq("id", inv.id);
    }
    return { error: "expired" as const };
  }

  if (inv.status === "expired") return { error: "expired" as const };
  if (inv.status === "completed") return { invitation: inv, completed: true as const };

  return { invitation: inv, completed: false as const };
}

export async function markInvitationStarted(invitationId: string) {
  const db = getHrServiceClient();
  await db
    .from("screening_invitations")
    .update({ status: "started" })
    .eq("id", invitationId)
    .in("status", ["pending"]);
}

export async function fetchTemplateWithQuestions(templateId: string) {
  const db = getHrServiceClient();
  const { data: template, error: tErr } = await db.from("screening_templates").select("*").eq("id", templateId).single();
  if (tErr || !template) throw new Error("Template not found");
  const { data: questions, error: qErr } = await db
    .from("screening_questions")
    .select("*")
    .eq("template_id", templateId)
    .order("order_index");
  if (qErr) throw new Error(qErr.message);
  return { template, questions: questions || [] };
}

type AnswerInput = { question_id: string; answer_text?: string; answer_values?: unknown };

export async function submitScreeningAnswers(params: { token: string; answers: AnswerInput[] }) {
  const db = getHrServiceClient();
  const res = await getInvitationByToken(params.token);
  if ("error" in res && res.error) {
    throw new Error(res.error === "expired" ? "Invitation expired" : "Invalid token");
  }
  if (!("invitation" in res)) throw new Error("Invalid invitation");

  const inv = res.invitation;
  if (res.completed) throw new Error("Invitation already completed");

  const { questions } = await fetchTemplateWithQuestions(inv.template_id);
  const qIds = new Set(questions.map((q: { id: string }) => q.id));

  const seen = new Set<string>();
  for (const a of params.answers) {
    if (!qIds.has(a.question_id)) throw new Error(`Unknown question_id: ${a.question_id}`);
    if (seen.has(a.question_id)) throw new Error(`Duplicate answer for question_id: ${a.question_id}`);
    seen.add(a.question_id);
  }

  if (params.answers.length !== questions.length) {
    throw new Error(`Expected ${questions.length} answers, got ${params.answers.length}`);
  }

  const rows = params.answers.map((a) => ({
    invitation_id: inv.id,
    question_id: a.question_id,
    answer_text: a.answer_text ?? null,
    answer_values: a.answer_values ?? null,
  }));

  const { error: delErr } = await db.from("screening_responses").delete().eq("invitation_id", inv.id);
  if (delErr) throw new Error(delErr.message);

  const { error: insErr } = await db.from("screening_responses").insert(rows);
  if (insErr) throw new Error(insErr.message);

  const { error: updErr } = await db
    .from("screening_invitations")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", inv.id);
  if (updErr) throw new Error(updErr.message);

  let analysisError: string | null = null;
  try {
    const analysis = await runScreeningAnalysis(inv.id);
    await upsertAnalysisRow(inv.id, analysis);
  } catch (e) {
    analysisError = e instanceof Error ? e.message : "Analysis failed";
  }

  return { invitation_id: inv.id as string, analysis_error: analysisError };
}

export async function analyzeInvitationById(invitationId: string) {
  const analysis = await runScreeningAnalysis(invitationId);
  await upsertAnalysisRow(invitationId, analysis);
  return analysis;
}
