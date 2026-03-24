import { NextRequest } from "next/server";
import { resolveApiCaller, unauthorized } from "@/lib/api/auth";
import { analyzeInvitationById } from "@/lib/services/screeningOrchestration";

export async function POST(req: NextRequest) {
  const caller = await resolveApiCaller(req);
  if (!caller) return unauthorized();

  let body: { invitation_id?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const invitation_id = body.invitation_id?.trim();
  if (!invitation_id) return Response.json({ error: "invitation_id is required" }, { status: 400 });

  try {
    const analysis = await analyzeInvitationById(invitation_id);
    return Response.json({ ok: true, analysis });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Analysis failed";
    return Response.json({ error: msg }, { status: 400 });
  }
}
