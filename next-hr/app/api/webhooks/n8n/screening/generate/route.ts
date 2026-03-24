import { NextRequest } from "next/server";
import { generateScreeningForApplication } from "@/lib/services/screeningGenerator";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.HR_API_SECRET;
  if (!secret) return true;
  const header = req.headers.get("x-hr-api-secret")?.trim();
  return Boolean(header && header === secret);
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { application_id?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const application_id = body.application_id?.trim();
  if (!application_id) {
    return Response.json({ ok: false, error: "application_id is required" }, { status: 400 });
  }

  try {
    const result = await generateScreeningForApplication(application_id, null);
    return Response.json({ ok: true, ...result, application_id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Generation failed";
    return Response.json({ ok: false, error: msg }, { status: 400 });
  }
}
