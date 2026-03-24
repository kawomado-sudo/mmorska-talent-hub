import { NextRequest } from "next/server";
import { getSupabaseAnonClient } from "@/lib/supabase/server";

export type ApiCaller =
  | { kind: "service" }
  | { kind: "user"; userId: string };

/**
 * Allows either shared secret (n8n / automation) or Supabase user JWT (dashboard).
 */
export async function resolveApiCaller(req: NextRequest): Promise<ApiCaller | null> {
  const shared = process.env.HR_API_SECRET;
  const headerSecret = req.headers.get("x-hr-api-secret");
  if (shared && headerSecret === shared) {
    return { kind: "service" };
  }

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice("Bearer ".length).trim();
  if (!token) return null;

  const supabase = getSupabaseAnonClient(token);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return { kind: "user", userId: user.id };
}

export function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
