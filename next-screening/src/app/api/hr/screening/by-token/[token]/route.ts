import { createHrServiceClient } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/api/http";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await ctx.params;
    const db = createHrServiceClient();

    const { data: invitation, error: invErr } = await db
      .from("screening_invitations")
      .select("*")
      .eq("token", token)
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

    if (invitation.status === "expired") {
      return jsonError("Invitation expired", 410);
    }

    if (invitation.status === "pending") {
      await db
        .from("screening_invitations")
        .update({ status: "started" })
        .eq("id", invitation.id);
      invitation.status = "started";
    }

    const { data: template, error: tErr } = await db
      .from("screening_templates")
      .select("*")
      .eq("id", invitation.template_id)
      .maybeSingle();
    if (tErr) throw tErr;

    const { data: questions, error: qErr } = await db
      .from("screening_questions")
      .select("*")
      .eq("template_id", invitation.template_id)
      .order("order_index");
    if (qErr) throw qErr;

    let candidateName: string | null = null;
    const { data: application } = await db
      .from("applications")
      .select("first_name, last_name")
      .eq("id", invitation.application_id)
      .maybeSingle();
    if (application) {
      candidateName = [application.first_name, application.last_name]
        .filter(Boolean)
        .join(" ")
        .trim() || null;
    }

    return jsonOk({
      invitation,
      candidate_name: candidateName,
      template,
      questions: questions || [],
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to load screening";
    return jsonError(msg, 500);
  }
}
