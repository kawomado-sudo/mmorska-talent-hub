"use client";

import { createClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";

let browserClient: ReturnType<typeof createClient> | null = null;

export function getHrBrowserClient() {
  const { supabaseUrl, supabaseAnonKey } = getPublicEnv();
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set for the dashboard"
    );
  }
  if (!browserClient) {
    // Supabase JS typings default to public schema; runtime supports hr via PostgREST.
    browserClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { db: { schema: "hr" } } as unknown as Parameters<typeof createClient>[2]
    );
  }
  return browserClient;
}
