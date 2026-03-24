import { createHrServiceClient } from "@/lib/supabase/server";
import { jsonError, jsonOk } from "@/lib/api/http";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const db = createHrServiceClient();

    const { data: template, error: tErr } = await db
      .from("screening_templates")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (tErr) throw tErr;
    if (!template) return jsonError("Template not found", 404);

    const { data: questions, error: qErr } = await db
      .from("screening_questions")
      .select("*")
      .eq("template_id", id)
      .order("order_index");
    if (qErr) throw qErr;

    return jsonOk({ template, questions: questions || [] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to load template";
    return jsonError(msg, 500);
  }
}
