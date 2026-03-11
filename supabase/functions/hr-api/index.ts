import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth check
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }

  const anonClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return json({ error: "Unauthorized" }, 401);
  }
  const userId = claimsData.claims.sub;

  // Service role client for hr schema
  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { db: { schema: "hr" } }
  );

  const body = await req.json();
  const { action, ...params } = body;

  try {
    switch (action) {
      case "list_jobs": {
        const { data: jobs, error } = await db
          .from("jobs")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;

        const { data: apps, error: appErr } = await db
          .from("applications")
          .select("job_id");
        if (appErr) throw appErr;

        const countMap: Record<string, number> = {};
        apps?.forEach((a: any) => {
          countMap[a.job_id] = (countMap[a.job_id] || 0) + 1;
        });

        return json(
          jobs.map((j: any) => ({ ...j, application_count: countMap[j.id] || 0 }))
        );
      }

      case "get_job": {
        const { data, error } = await db
          .from("jobs")
          .select("*")
          .eq("id", params.id)
          .single();
        if (error) throw error;
        return json(data);
      }

      case "create_job": {
        const { payload } = params;
        const { error } = await db.from("jobs").insert({ ...payload, created_by: userId });
        if (error) throw error;
        return json({ ok: true });
      }

      case "update_job": {
        const { id, payload } = params;
        const { error } = await db.from("jobs").update(payload).eq("id", id);
        if (error) throw error;
        return json({ ok: true });
      }

      case "delete_job": {
        const { error } = await db.from("jobs").delete().eq("id", params.id);
        if (error) throw error;
        return json({ ok: true });
      }

      case "list_applications": {
        let query = db
          .from("applications")
          .select("*")
          .eq("job_id", params.job_id)
          .order("created_at", { ascending: false });
        if (params.status && params.status !== "all") {
          query = query.eq("status", params.status);
        }
        const { data, error } = await query;
        if (error) throw error;
        return json(data);
      }

      case "get_application": {
        const { data, error } = await db
          .from("applications")
          .select("*")
          .eq("id", params.id)
          .single();
        if (error) throw error;
        return json(data);
      }

      case "update_application": {
        const { id, ...fields } = params;
        const { error } = await db.from("applications").update(fields).eq("id", id);
        if (error) throw error;
        return json({ ok: true });
      }

      case "list_status_log": {
        const { data, error } = await db
          .from("application_status_log")
          .select("*")
          .eq("application_id", params.application_id)
          .order("changed_at", { ascending: false });
        if (error) throw error;
        return json(data);
      }

      case "insert_status_log": {
        const { error } = await db.from("application_status_log").insert({
          application_id: params.application_id,
          old_status: params.old_status,
          new_status: params.new_status,
          changed_by: userId,
        });
        if (error) throw error;
        return json({ ok: true });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err: any) {
    console.error("hr-api error:", err);
    return json({ error: err.message }, 500);
  }
});
