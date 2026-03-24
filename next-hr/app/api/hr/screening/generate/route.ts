import { NextRequest } from "next/server";
import { resolveApiCaller, unauthorized } from "@/lib/api/auth";
import { generateScreeningForApplication } from "@/lib/services/screeningGenerator";

export async function POST(req: NextRequest) {
  const caller = await resolveApiCaller(req);
  if (!caller) return unauthorized();

  let body: { application_id?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const application_id = body.application_id?.trim();
  if (!application_id) {
    return Response.json({ error: "application_id is required" }, { status: 400 });
  }

  const createdBy = caller.kind === "user" ? caller.userId : null;

  try {
    const result = await generateScreeningForApplication(application_id, createdBy);
    return Response.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Generation failed";
    return Response.json({ error: msg }, { status: 400 });
  }
}
