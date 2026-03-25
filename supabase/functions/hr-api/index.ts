import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADMIN_EMAILS = ['support@mmorska.pl', 'dobrochna.mankowska@mmorska.pl'];

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

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { db: { schema: "hr" } }
  );

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
          .select("job_id, assigned_reviewer_id");
        if (appErr) throw appErr;

        const countMap: Record<string, number> = {};
        const reviewerIdsPerJob: Record<string, Set<string>> = {};
        apps?.forEach((a: any) => {
          countMap[a.job_id] = (countMap[a.job_id] || 0) + 1;
          if (a.assigned_reviewer_id) {
            if (!reviewerIdsPerJob[a.job_id]) reviewerIdsPerJob[a.job_id] = new Set();
            reviewerIdsPerJob[a.job_id].add(a.assigned_reviewer_id);
          }
        });

        const allReviewerIds = new Set<string>();
        Object.values(reviewerIdsPerJob).forEach(s => s.forEach(id => allReviewerIds.add(id)));

        let reviewerNameMap: Record<string, string> = {};
        if (allReviewerIds.size > 0) {
          const ids = Array.from(allReviewerIds);
          const { data: members } = await dbPublic
            .from("team_members_public")
            .select("id, auth_user_id, full_name, first_name, last_name")
            .or(ids.map(id => `id.eq.${id}`).concat(ids.map(id => `auth_user_id.eq.${id}`)).join(","));
          members?.forEach((m: any) => {
            const name = m.full_name || [m.first_name, m.last_name].filter(Boolean).join(" ") || "?";
            if (m.id) reviewerNameMap[m.id] = name;
            if (m.auth_user_id) reviewerNameMap[m.auth_user_id] = name;
          });
        }

        return json(
          jobs.map((j: any) => {
            const reviewerIds = reviewerIdsPerJob[j.id] ? Array.from(reviewerIdsPerJob[j.id]) : [];
            const reviewers = [...new Set(reviewerIds.map((id: string) => reviewerNameMap[id]).filter(Boolean))];
            return { ...j, application_count: countMap[j.id] || 0, reviewers };
          })
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
        if (params.reviewer_only) {
          const { data: tm } = await dbPublic
            .from("team_members_public")
            .select("id, email")
            .eq("auth_user_id", userId)
            .maybeSingle();

          const possibleIds = [userId];
          if (tm?.id) possibleIds.push(tm.id);

          if (tm?.email) {
            const { data: reviewer } = await db
              .from("hr_reviewers")
              .select("id, auth_user_id")
              .eq("email", tm.email)
              .eq("active", true)
              .maybeSingle();
            if (reviewer?.id) possibleIds.push(reviewer.id);
          }

          const uniqueIds = [...new Set(possibleIds)];
          query = query.or(uniqueIds.map(id => `assigned_reviewer_id.eq.${id}`).join(","));
        }
        const { data, error } = await query;
        if (error) throw error;

        // Resolve reviewer names
        const reviewerIds = [...new Set((data || []).filter((a: any) => a.assigned_reviewer_id).map((a: any) => a.assigned_reviewer_id))];
        let reviewerNameMap: Record<string, string> = {};
        if (reviewerIds.length > 0) {
          const { data: members } = await dbPublic
            .from("team_members_public")
            .select("id, auth_user_id, full_name, first_name, last_name")
            .or(reviewerIds.map((id: string) => `id.eq.${id}`).concat(reviewerIds.map((id: string) => `auth_user_id.eq.${id}`)).join(","));
          members?.forEach((m: any) => {
            const name = m.full_name || [m.first_name, m.last_name].filter(Boolean).join(" ") || "?";
            if (m.id) reviewerNameMap[m.id] = name;
            if (m.auth_user_id) reviewerNameMap[m.auth_user_id] = name;
          });
        }

        const enriched = (data || []).map((a: any) => ({
          ...a,
          reviewer_name: a.assigned_reviewer_id ? (reviewerNameMap[a.assigned_reviewer_id] || null) : null,
        }));

        return json(enriched);
      }

      case "list_screening_candidates": {
        const { data: candidates, error } = await db
          .from("applications")
          .select("id, first_name, last_name, status, job_id, created_at")
          .eq("status", "screening_test")
          .order("created_at", { ascending: false });
        if (error) throw error;

        const jobIds = [...new Set((candidates || []).map((candidate: any) => candidate.job_id).filter(Boolean))];
        const appIds = (candidates || []).map((candidate: any) => candidate.id);

        let jobTitleMap: Record<string, string> = {};
        if (jobIds.length > 0) {
          const { data: jobs, error: jobsError } = await db
            .from("jobs")
            .select("id, title")
            .in("id", jobIds);
          if (jobsError) throw jobsError;
          jobTitleMap = Object.fromEntries((jobs || []).map((job: any) => [job.id, job.title || "Brak stanowiska"]));
        }

        let invitationMap: Record<string, any> = {};
        if (appIds.length > 0) {
          const { data: invitations, error: invError } = await db
            .from("screening_invitations")
            .select("id, application_id, token, status, template_id, created_at")
            .in("application_id", appIds)
            .order("created_at", { ascending: false });
          if (invError) throw invError;

          (invitations || []).forEach((invitation: any) => {
            if (!invitationMap[invitation.application_id]) {
              invitationMap[invitation.application_id] = invitation;
            }
          });
        }

        const normalized = (candidates || []).map((candidate: any) => {
          const invitation = invitationMap[candidate.id];
          return {
            application_id: candidate.id,
            candidate_name: `${candidate.first_name || ""} ${candidate.last_name || ""}`.trim() || "Nieznany kandydat",
            job_title: candidate.job_id ? (jobTitleMap[candidate.job_id] || "Brak stanowiska") : "Brak stanowiska",
            status: candidate.status || "unknown",
            invitation: invitation
              ? {
                  id: invitation.id,
                  token: invitation.token,
                  status: invitation.status,
                  template_id: invitation.template_id,
                }
              : null,
          };
        });

        return json(normalized);
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
        const { error } = await db.from("hr_reviewers").insert({
          auth_user_id: params.auth_user_id,
          full_name: params.full_name,
          email: params.email,
        });
        if (error) throw error;
        return json({ ok: true });
      }

      case "remove_reviewer": {
        const { error } = await db
          .from("hr_reviewers")
          .update({ active: false })
          .eq("id", params.id);
        if (error) throw error;
        return json({ ok: true });
      }

      case "assign_reviewer": {
        const { application_id, reviewer_id } = params;

        const { data: app, error: appErr } = await db
          .from("applications")
          .select("status, first_name, last_name, job_id")
          .eq("id", application_id)
          .single();
        if (appErr) throw appErr;

        const oldStatus = app.status;

        const { data: member, error: memErr } = await dbPublic
          .from("team_members_public")
          .select("id, auth_user_id, full_name, email")
          .eq("id", reviewer_id)
          .single();
        if (memErr) throw memErr;

        const assigneeId = member.auth_user_id || member.id;

        // Auto-add to hr_reviewers
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

        const { error: logErr } = await db
          .from("application_status_log")
          .insert({
            application_id,
            old_status: oldStatus,
            new_status: "reviewing",
            changed_by: userId,
          });
        if (logErr) throw logErr;

        const { data: job } = await db
          .from("jobs")
          .select("title")
          .eq("id", app.job_id)
          .single();

        // Send email notification to reviewer
        const mailerooKey = Deno.env.get("MAILEROO_API_KEY");
        if (mailerooKey && member.email) {
          try {
            const maskHalf = (s: string) => {
              if (!s) return '';
              const half = Math.ceil(s.length / 2);
              return s.slice(0, half) + '•'.repeat(s.length - half);
            };
            const maskedName = `${maskHalf(app.first_name || '')} ${maskHalf(app.last_name || '')}`.trim();
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
                   <p>Zaloguj się do <a href="https://praca.mmorska.eu" style="color:#2563eb;">panelu rekrutacyjnego</a>, aby przejrzeć kandydaturę i podjąć decyzję.</p>
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
        // 1. Try by auth_user_id
        const { data: byId } = await db
          .from("hr_reviewers")
          .select("id")
          .eq("auth_user_id", userId)
          .eq("active", true)
          .maybeSingle();
        
        if (byId) return json({ is_reviewer: true });

        // 2. Fallback: find user email from team_members_public, then match by email
        const { data: tm } = await dbPublic
          .from("team_members_public")
          .select("email")
          .eq("auth_user_id", userId)
          .maybeSingle();

        if (tm?.email) {
          const { data: byEmail } = await db
            .from("hr_reviewers")
            .select("id")
            .eq("email", tm.email)
            .eq("active", true)
            .maybeSingle();

          if (byEmail) {
            // Auto-link auth_user_id for future lookups
            await db
              .from("hr_reviewers")
              .update({ auth_user_id: userId })
              .eq("id", byEmail.id);
            return json({ is_reviewer: true });
          }
        }

        return json({ is_reviewer: false });
      }

      // ─── SUBMIT REVIEW (reviewer submits decision + notes atomically) ───
      case "submit_review": {
        const { application_id, status, notes } = params;
        if (!['accepted', 'rejected'].includes(status)) {
          return json({ error: "Status must be 'accepted' or 'rejected'" }, 400);
        }

        // Get current application
        const { data: app, error: appErr } = await db
          .from("applications")
          .select("status, first_name, last_name, job_id")
          .eq("id", application_id)
          .single();
        if (appErr) throw appErr;

        const oldStatus = app.status;

        // Update application atomically
        const { error: updErr } = await db
          .from("applications")
          .update({
            status,
            recruiter_notes: notes || null,
            reviewed_by: userId,
            reviewed_at: new Date().toISOString(),
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
            new_status: status,
            changed_by: userId,
          });
        if (logErr) throw logErr;

        // Get reviewer name
        const { data: reviewerTm } = await dbPublic
          .from("team_members_public")
          .select("full_name, email")
          .eq("auth_user_id", userId)
          .maybeSingle();
        const reviewerName = reviewerTm?.full_name || reviewerTm?.email || 'Nieznany recenzent';

        // Get job title
        const { data: job } = await db
          .from("jobs")
          .select("title")
          .eq("id", app.job_id)
          .single();
        const jobTitle = job?.title || 'Nieznane stanowisko';

        // Mask candidate name
        const maskHalf = (s: string) => {
          if (!s) return '';
          const half = Math.ceil(s.length / 2);
          return s.slice(0, half) + '•'.repeat(s.length - half);
        };
        const maskedName = `${maskHalf(app.first_name || '')} ${maskHalf(app.last_name || '')}`.trim();

        const decisionLabel = status === 'accepted' ? '✅ Zaakceptowany' : '❌ Odrzucony';

        // Send email to admins
        const mailerooKey = Deno.env.get("MAILEROO_API_KEY");
        if (mailerooKey) {
          for (const adminEmail of ADMIN_EMAILS) {
            try {
              await fetch("https://smtp.maileroo.com/api/v2/emails", {
                method: "POST",
                headers: {
                  "X-API-Key": mailerooKey,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  from: { address: "app.assistant@mmorska.eu", display_name: "MMorska Rekrutacja" },
                  to: [{ address: adminEmail }],
                  subject: `Recenzja: ${maskedName} — ${decisionLabel}`,
                  html: `
                    <h2>Nowa recenzja kandydata</h2>
                    <p><strong>Recenzent:</strong> ${reviewerName}</p>
                    <p><strong>Kandydat:</strong> ${maskedName}</p>
                    <p><strong>Stanowisko:</strong> ${jobTitle}</p>
                    <p><strong>Decyzja:</strong> ${decisionLabel}</p>
                    ${notes ? `<p><strong>Notatka:</strong></p><blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#555;">${notes}</blockquote>` : ''}
                    <br/>
                    <p>Przejdź do <a href="https://praca.mmorska.eu" style="color:#2563eb;">panelu rekrutacyjnego</a> aby zobaczyć szczegóły.</p>
                    <p style="color:#888;font-size:12px;">MMorska — Panel Rekrutacyjny</p>
                  `,
                }),
              });
            } catch (emailErr) {
              console.error("Failed to send admin review notification:", emailErr);
            }
          }
        }

        return json({ ok: true });
      }

      case "list_team_members": {
        const { data, error } = await dbPublic
          .from("team_members_public")
          .select("id, auth_user_id, full_name, email, active")
          .eq("active", true)
          .order("full_name");
        if (error) throw error;
        return json(data);
      }

      // ─── CV SIGNED URL ─────────────────────────────────
      case "get_cv_signed_url": {
        const appId = params.application_id;
        if (!appId) return json({ error: "Missing application_id" }, 400);

        const { data: appData, error: appErr } = await db
          .from("applications")
          .select("cv_url")
          .eq("id", appId)
          .single();
        if (appErr || !appData) return json({ error: "Application not found" }, 404);
        if (!appData.cv_url) return json({ error: "No CV file" }, 404);

        const storageClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        const { data: signedData, error: signErr } = await storageClient.storage
          .from("hr-cv")
          .createSignedUrl(appData.cv_url, 3600);
        if (signErr || !signedData?.signedUrl) {
          console.error("Signed URL error:", signErr);
          return json({ error: "Failed to generate signed URL" }, 500);
        }

        return json({ signed_url: signedData.signedUrl });
      }

      // ─── DELETE APPLICATION (RODO) ──────────────────────
      case "delete_application": {
        // Check admin access
        const { data: callerTm } = await dbPublic
          .from("team_members_public")
          .select("email")
          .eq("auth_user_id", userId)
          .maybeSingle();
        const callerEmail = callerTm?.email || '';
        if (!ADMIN_EMAILS.includes(callerEmail.toLowerCase())) {
          return json({ error: "Tylko administrator może usuwać kandydatury." }, 403);
        }

        const appId = params.application_id;
        if (!appId) return json({ error: "Missing application_id" }, 400);

        // Get application to find CV path
        const { data: appToDelete, error: getErr } = await db
          .from("applications")
          .select("id, cv_url")
          .eq("id", appId)
          .single();
        if (getErr || !appToDelete) return json({ error: "Application not found" }, 404);

        // 1. Delete status logs
        await db.from("application_status_log").delete().eq("application_id", appId);

        // 2. Delete application record
        const { error: delErr } = await db.from("applications").delete().eq("id", appId);
        if (delErr) throw delErr;

        // 3. Delete CV file from storage
        if (appToDelete.cv_url) {
          const dbStorage = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
          );
          await dbStorage.storage.from("hr-cv").remove([appToDelete.cv_url]);
        }

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
