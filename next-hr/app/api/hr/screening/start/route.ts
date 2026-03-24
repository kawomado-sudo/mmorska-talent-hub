import { NextRequest } from "next/server";
import { getInvitationByToken, markInvitationStarted } from "@/lib/services/screeningOrchestration";

export async function POST(req: NextRequest) {
  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const token = body.token?.trim();
  if (!token) return Response.json({ error: "token is required" }, { status: 400 });

  const res = await getInvitationByToken(token);
  if ("error" in res && res.error) {
    return Response.json({ error: res.error === "expired" ? "expired" : "invalid_token" }, { status: 400 });
  }
  if (!("invitation" in res)) return Response.json({ error: "invalid_token" }, { status: 400 });
  if (res.completed) return Response.json({ ok: true, already_completed: true });

  await markInvitationStarted(res.invitation.id);
  return Response.json({ ok: true });
}
