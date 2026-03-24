import { NextRequest } from "next/server";
import { resolveApiCaller, unauthorized } from "@/lib/api/auth";
import { createInvitation } from "@/lib/services/screeningOrchestration";

export async function POST(req: NextRequest) {
  const caller = await resolveApiCaller(req);
  if (!caller || caller.kind !== "service") return unauthorized();

  let body: { application_id?: string; template_id?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const application_id = body.application_id?.trim();
  const template_id = body.template_id?.trim();
  if (!application_id || !template_id) {
    return Response.json(
      { ok: false, error: "application_id and template_id are required" },
      { status: 400 }
    );
  }

  try {
    const result = await createInvitation({ application_id, template_id });
    return Response.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invite failed";
    return Response.json({ ok: false, error: msg }, { status: 400 });
  }
}
