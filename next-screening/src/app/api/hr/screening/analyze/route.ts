import { createHrServiceClient } from "@/lib/supabase/server";
import { runScreeningAnalysis } from "@/lib/services/screeningAnalyzer";
import { jsonError, jsonOk, readJson } from "@/lib/api/http";

export async function POST(req: Request) {
  try {
    const body = await readJson<{ invitation_id?: string }>(req);
    if (!body?.invitation_id) return jsonError("invitation_id is required", 400);

    const db = createHrServiceClient();

    const { data: inv, error } = await db
      .from("screening_invitations")
      .select("id, status")
      .eq("id", body.invitation_id)
      .maybeSingle();
    if (error) throw error;
    if (!inv) return jsonError("Invitation not found", 404);
    if (inv.status !== "completed") {
      return jsonError("Invitation must be completed before analysis", 400);
    }

    await runScreeningAnalysis(db, body.invitation_id);
    return jsonOk({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Analyze failed";
    return jsonError(msg, 500);
  }
}
