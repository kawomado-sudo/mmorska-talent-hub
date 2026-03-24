import Link from "next/link";
import { Suspense } from "react";

export default function ScreeningHomePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Recruiter dashboard</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Manage AI-generated screening templates, invitations, and applications. API routes are
          available for n8n under{" "}
          <code className="rounded bg-zinc-200 px-1 text-xs dark:bg-zinc-800">
            /api/webhooks/n8n/screening/*
          </code>
          .
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/screening/templates"
          className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
        >
          <h2 className="font-medium">Templates</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            List templates, view questions, create invitations, regenerate tests.
          </p>
        </Link>
        <Link
          href="/screening/invitations"
          className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
        >
          <h2 className="font-medium">Invitations</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Status, candidate links, and invitation details.
          </p>
        </Link>
        <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="font-medium">Applications</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Overview lives on the dashboard below (requires Supabase env).
          </p>
        </section>
      </div>
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading applications…</p>}>
        <ApplicationsPreview />
      </Suspense>
    </div>
  );
}

async function ApplicationsPreview() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
        Set <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to load applications (hr
        schema, RLS applies).
      </div>
    );
  }

  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(url, key, { db: { schema: "hr" } });
  const { data: applications, error } = await db
    .from("applications")
    .select("id, first_name, last_name, status, job_id, created_at")
    .order("created_at", { ascending: false })
    .limit(15);

  if (error) {
    return (
      <p className="text-sm text-red-600">
        Could not load applications: {error.message}
      </p>
    );
  }

  const jobIds = [...new Set((applications || []).map((a) => a.job_id).filter(Boolean))];
  let jobTitles: Record<string, string> = {};
  if (jobIds.length > 0) {
    const { data: jobs } = await db.from("jobs").select("id, title").in("id", jobIds);
    jobTitles = Object.fromEntries((jobs || []).map((j) => [j.id, j.title]));
  }

  return (
    <section>
      <h2 className="text-lg font-medium">Recent applications</h2>
      <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-100 dark:bg-zinc-900">
            <tr>
              <th className="px-3 py-2 font-medium">Candidate</th>
              <th className="px-3 py-2 font-medium">Job</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Application ID</th>
            </tr>
          </thead>
          <tbody>
            {(applications || []).map((a) => (
              <tr key={a.id} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="px-3 py-2">
                  {[a.first_name, a.last_name].filter(Boolean).join(" ") || "—"}
                </td>
                <td className="px-3 py-2">{jobTitles[a.job_id] || a.job_id}</td>
                <td className="px-3 py-2">{a.status}</td>
                <td className="px-3 py-2 font-mono text-xs">{a.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
