import { NextRequest } from "next/server";
import { resolveApiCaller, unauthorized } from "@/lib/api/auth";
import { generateAndStoreScreening } from "@/lib/services/screeningGenerator";

export async function POST(req: NextRequest) {
  const caller = await resolveApiCaller(req);
  if (!caller) return unauthorized();

  let body: { job_id?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const job_id = body.job_id?.trim();
  if (!job_id) return Response.json({ error: "job_id is required" }, { status: 400 });

  const createdBy = caller.kind === "user" ? caller.userId : null;

  try {
    const { template_id } = await generateAndStoreScreening(job_id, createdBy);
    return Response.json({ ok: true, template_id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Generation failed";
    return Response.json({ error: msg }, { status: 400 });
  }
}
