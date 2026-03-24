import { NextRequest } from "next/server";
import { resolveApiCaller, unauthorized } from "@/lib/api/auth";
import { fetchTemplateWithQuestions } from "@/lib/services/screeningOrchestration";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const caller = await resolveApiCaller(req);
  if (!caller) return unauthorized();

  const { id } = await ctx.params;
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  try {
    const data = await fetchTemplateWithQuestions(id);
    return Response.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Not found";
    return Response.json({ error: msg }, { status: 404 });
  }
}
