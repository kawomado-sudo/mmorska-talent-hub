function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

export function getServerEnv() {
  return {
    supabaseUrl: required("SUPABASE_URL", process.env.SUPABASE_URL),
    supabaseServiceKey: required(
      "SUPABASE_SERVICE_ROLE_KEY",
      process.env.SUPABASE_SERVICE_ROLE_KEY
    ),
    openaiApiKey: required("OPENAI_API_KEY", process.env.OPENAI_API_KEY),
    openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
    n8nWebhookSecret: process.env.N8N_WEBHOOK_SECRET || "",
    appUrl:
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      "http://localhost:3000",
  };
}

export function getPublicEnv() {
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  };
}
