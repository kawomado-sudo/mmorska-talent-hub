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

  // Public schema client (for team_members_public)
  const dbPublic = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { db: { schema: "public" } }
  );

  const body = await req.json();
  const { action, ...params } = body;

  try {
    switch (action) {
      // ─── JOBS ───────────────────────────────────────────
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

      // ─── APPLICATIONS ──────────────────────────────────
      case "list_applications": {
        let query = db
          .from("applications")
          .select("*")
          .eq("job_id", params.job_id)
          .order("created_at", { ascending: false });
        if (params.status && params.status !== "all") {
          query = query.eq("status", params.status);
        }
        // If reviewer_only flag is set, filter by assigned_reviewer_id (auth_user_id OR team_member_id)
        if (params.reviewer_only) {
          // First find team_member_id for this user
          const { data: tm } = await dbPublic
            .from("team_members_public")
            .select("id")
            .eq("auth_user_id", userId)
            .maybeSingle();
          
          if (tm) {
            // Match either auth_user_id or team_member_id
            query = query.or(`assigned_reviewer_id.eq.${userId},assigned_reviewer_id.eq.${tm.id}`);
          } else {
            query = query.eq("assigned_reviewer_id", userId);
          }
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

      // ─── STATUS LOG ─────────────────────────────────────
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

      // ─── REVIEWERS ──────────────────────────────────────
      case "list_reviewers": {
        const { data, error } = await db
          .from("hr_reviewers")
          .select("*")
          .eq("active", true)
          .order("full_name");
        if (error) throw error;
        return json(data);
      }

      case "add_reviewer": {
        // params: auth_user_id, full_name, email
        const { error } = await db.from("hr_reviewers").insert({
          auth_user_id: params.auth_user_id,
          full_name: params.full_name,
          email: params.email,
        });
        if (error) throw error;
        return json({ ok: true });
      }

      case "remove_reviewer": {
        // Soft-delete: set active = false
        const { error } = await db
          .from("hr_reviewers")
          .update({ active: false })
          .eq("id", params.id);
        if (error) throw error;
        return json({ ok: true });
      }

      case "assign_reviewer": {
        // params: application_id, reviewer_id (id from team_members_public)
        const { application_id, reviewer_id } = params;

        // Get current application status
        const { data: app, error: appErr } = await db
          .from("applications")
          .select("status, first_name, last_name, job_id")
          .eq("id", application_id)
          .single();
        if (appErr) throw appErr;

        const oldStatus = app.status;

        // Get team member info from team_members_public by id
        const { data: member, error: memErr } = await dbPublic
          .from("team_members_public")
          .select("id, auth_user_id, full_name, email")
          .eq("id", reviewer_id)
          .single();
        if (memErr) throw memErr;

        // Use auth_user_id if available, otherwise use team_member_id
        const assigneeId = member.auth_user_id || member.id;

        // Auto-add to hr_reviewers (upsert by email since auth_user_id may be null)
        const { error: upsertErr } = await db
          .from("hr_reviewers")
          .upsert(
            {
              auth_user_id: member.auth_user_id || null,
              full_name: member.full_name,
              email: member.email,
              active: true,
            },
            { onConflict: member.auth_user_id ? "auth_user_id" : "email" }
          );
        if (upsertErr) {
          console.error("hr_reviewers upsert error:", upsertErr);
          // Try insert if upsert fails
          const { error: insertErr } = await db
            .from("hr_reviewers")
            .insert({
              auth_user_id: member.auth_user_id || null,
              full_name: member.full_name,
              email: member.email,
              active: true,
            });
          if (insertErr) console.error("hr_reviewers insert fallback error:", insertErr);
        }

        // Update application: set status to reviewing + assign reviewer
        const { error: updErr } = await db
          .from("applications")
          .update({
            status: "reviewing",
            assigned_reviewer_id: assigneeId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", application_id);
        if (updErr) throw updErr;

        // Insert status log
        const { error: logErr } = await db
          .from("application_status_log")
          .insert({
            application_id,
            old_status: oldStatus,
            new_status: "reviewing",
            changed_by: userId,
          });
        if (logErr) throw logErr;

        // Get job title for email
        const { data: job } = await db
          .from("jobs")
          .select("title")
          .eq("id", app.job_id)
          .single();

        // Send email notification to reviewer via Maileroo
        const mailerooKey = Deno.env.get("MAILEROO_API_KEY");
        if (mailerooKey && member.email) {
          try {
            const firstName = app.first_name || '';
            const lastName = app.last_name || '';
            // Mask half of each name with dots for privacy
            const maskHalf = (s: string) => {
              if (!s) return '';
              const half = Math.ceil(s.length / 2);
              return s.slice(0, half) + '•'.repeat(s.length - half);
            };
            const maskedName = `${maskHalf(firstName)} ${maskHalf(lastName)}`.trim();
            const jobTitle = job?.title || 'Nieznane stanowisko';
            await fetch("https://smtp.maileroo.com/api/v2/emails", {
              method: "POST",
              headers: {
                "X-API-Key": mailerooKey,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: { address: "app.assistant@mmorska.eu", display_name: "MMorska Rekrutacja" },
                to: [{ address: member.email, display_name: member.full_name || "" }],
                subject: `Nowe zadanie: ocena kandydata — ${maskedName}`,
                html: `
                   <h2>Zostałeś przypisany jako recenzent</h2>
                   <p><strong>Kandydat:</strong> ${maskedName}</p>
                   <p><strong>Stanowisko:</strong> ${jobTitle}</p>
                   <p>Zaloguj się do panelu rekrutacyjnego, aby przejrzeć kandydaturę i podjąć decyzję.</p>
                   <br/>
                   <p style="color:#888;font-size:12px;">MMorska — Panel Rekrutacyjny</p>
                 `,
              }),
            });
          } catch (emailErr) {
            console.error("Failed to send reviewer notification email:", emailErr);
          }
        }

        return json({ ok: true });
      }

      case "check_is_reviewer": {
        const { data, error } = await db
          .from("hr_reviewers")
          .select("id")
          .eq("auth_user_id", userId)
          .eq("active", true)
          .maybeSingle();
        if (error) throw error;
        return json({ is_reviewer: !!data });
      }

      case "list_team_members": {
        // Return team members from public schema for reviewer selection
        const { data, error } = await dbPublic
          .from("team_members_public")
          .select("id, auth_user_id, full_name, email, active")
          .eq("active", true)
          .order("full_name");
        if (error) throw error;
        return json(data);
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err: any) {
    console.error("hr-api error:", err);
    return json({ error: err.message }, 500);
  }
});
