"use client";

import { useEffect, useState } from "react";
import { createHrBrowserClient } from "@/lib/supabase/browser";

type HrClient = ReturnType<typeof createHrBrowserClient>;

export function useHrBrowserClient(): {
  supabase: HrClient | null;
  configError: string | null;
} {
  const [supabase, setSupabase] = useState<HrClient | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  useEffect(() => {
    try {
      setSupabase(createHrBrowserClient());
      setConfigError(null);
    } catch (e) {
      setSupabase(null);
      setConfigError(e instanceof Error ? e.message : "Supabase client init failed");
    }
  }, []);
  return { supabase, configError };
}
