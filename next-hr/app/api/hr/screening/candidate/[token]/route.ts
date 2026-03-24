import { NextRequest } from "next/server";
import { getCandidateSession } from "@/lib/services/screeningOrchestration";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  if (!token) return Response.json({ error: "Missing token" }, { status: 400 });

  try {
    const data = await getCandidateSession(token);
    if ("error" in data) {
      return Response.json({ error: data.error }, { status: data.error === "expired" ? 410 : 404 });
    }
    const { invitation, completed, template, questions } = data;
    return Response.json({
      invitation: {
        id: invitation.id,
        status: invitation.status,
        expires_at: invitation.expires_at,
      },
      completed,
      template,
      questions,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load";
    return Response.json({ error: msg }, { status: 500 });
  }
}
