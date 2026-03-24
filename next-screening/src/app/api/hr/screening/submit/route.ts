import { createHrServiceClient } from "@/lib/supabase/server";
import { persistScreeningSubmission } from "@/lib/services/screeningSubmit";
import { runScreeningAnalysis } from "@/lib/services/screeningAnalyzer";
import { jsonError, jsonOk, readJson } from "@/lib/api/http";

type Body = {
  token?: string;
  answers?: {
    question_id: string;
    answer_text?: string;
    answer_values?: unknown;
  }[];
};

export async function POST(req: Request) {
  try {
    const body = await readJson<Body>(req);
    if (!body?.token || !Array.isArray(body.answers)) {
      return jsonError("token and answers[] are required", 400);
    }

    const db = createHrServiceClient();

    const { data: invitation, error: invErr } = await db
      .from("screening_invitations")
      .select("*")
      .eq("token", body.token)
      .maybeSingle();
    if (invErr) throw invErr;
    if (!invitation) return jsonError("Invalid token", 404);

    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      await db
        .from("screening_invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id);
      return jsonError("Invitation expired", 410);
    }

    if (invitation.status === "completed") {
      return jsonError("Already submitted", 409);
    }

    await persistScreeningSubmission(db, {
      invitationId: invitation.id,
      templateId: invitation.template_id,
      answers: body.answers,
    });

    await db
      .from("screening_invitations")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", invitation.id);

    let analysis_error: string | null = null;
    try {
      await runScreeningAnalysis(db, invitation.id);
    } catch (ae: unknown) {
      analysis_error = ae instanceof Error ? ae.message : "Analysis failed";
    }

    return jsonOk({
      ok: true,
      invitation_id: invitation.id,
      analysis_triggered: !analysis_error,
      analysis_error,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Submit failed";
    const isClient =
      msg.startsWith("Invalid") ||
      msg.startsWith("Unknown question") ||
      msg.startsWith("Select at least");
    return jsonError(msg, isClient ? 400 : 500);
  }
}
