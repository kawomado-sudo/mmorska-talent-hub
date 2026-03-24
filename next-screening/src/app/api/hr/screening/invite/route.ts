import { randomUUID } from "crypto";
import { getServerEnv } from "@/lib/env";
import { createHrServiceClient } from "@/lib/supabase/server";
import { jsonError, jsonOk, readJson } from "@/lib/api/http";

export async function POST(req: Request) {
  try {
    const body = await readJson<{ application_id?: string; template_id?: string }>(req);
    if (!body?.application_id || !body?.template_id) {
      return jsonError("application_id and template_id are required", 400);
    }

    const db = createHrServiceClient();

    const { data: app, error: appErr } = await db
      .from("applications")
      .select("id")
      .eq("id", body.application_id)
      .maybeSingle();
    if (appErr) throw appErr;
    if (!app) return jsonError("Application not found", 404);

    const { data: tpl, error: tplErr } = await db
      .from("screening_templates")
      .select("id")
      .eq("id", body.template_id)
      .maybeSingle();
    if (tplErr) throw tplErr;
    if (!tpl) return jsonError("Template not found", 404);

    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data: row, error: insErr } = await db
      .from("screening_invitations")
      .insert({
        application_id: body.application_id,
        template_id: body.template_id,
        token,
        status: "pending",
        expires_at: expiresAt.toISOString(),
        sent_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insErr) throw insErr;

    const { appUrl } = getServerEnv();
    const path = `/screening/${token}`;
    return jsonOk({
      invitation_id: row.id,
      token,
      invitation_path: path,
      invitation_url: `${appUrl}${path}`,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Invite failed";
    return jsonError(msg, 500);
  }
}
