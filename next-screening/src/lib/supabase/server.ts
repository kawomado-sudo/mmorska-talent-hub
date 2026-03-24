import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";

export function createHrServiceClient() {
  const { supabaseUrl, supabaseServiceKey } = getServerEnv();
  return createClient(
    supabaseUrl,
    supabaseServiceKey,
    {
      db: { schema: "hr" },
      auth: { persistSession: false, autoRefreshToken: false },
    } as unknown as Parameters<typeof createClient>[2]
  );
}
