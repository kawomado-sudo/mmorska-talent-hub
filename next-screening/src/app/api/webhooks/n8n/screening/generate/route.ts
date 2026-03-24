import { createHrServiceClient } from "@/lib/supabase/server";
import { generateScreeningForJob } from "@/lib/services/screeningGenerator";
import { assertN8nWebhook } from "@/lib/api/n8nAuth";
import { jsonError, jsonOk, readJson } from "@/lib/api/http";

export async function POST(req: Request) {
  if (!assertN8nWebhook(req)) {
    return jsonError("Unauthorized", 401);
  }
  try {
    const body = await readJson<{ job_id?: string }>(req);
    if (!body?.job_id) {
      return jsonError("job_id is required", 400);
    }
    const db = createHrServiceClient();
    const result = await generateScreeningForJob(db, body.job_id);
    return jsonOk({
      success: true,
      template_id: result.template_id,
      question_count: result.question_count,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Generate failed";
    const status = msg === "Job not found" ? 404 : 500;
    return jsonError(msg, status, { success: false });
  }
}
