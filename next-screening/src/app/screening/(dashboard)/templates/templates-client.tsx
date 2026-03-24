"use client";

import { useCallback, useEffect, useState } from "react";
import { getHrBrowserClient } from "@/lib/supabase/browser";

type Template = {
  id: string;
  name: string;
  description: string | null;
  job_id: string | null;
  is_global: boolean;
  created_at: string;
};

type Question = {
  id: string;
  template_id: string;
  question: string;
  type: string;
  order_index: number;
  options: unknown;
  scale_min: number | null;
  scale_max: number | null;
};

type Job = { id: string; title: string };

export function TemplatesClient() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [questionsByTpl, setQuestionsByTpl] = useState<Record<string, Question[]>>({});
  const [loadingQ, setLoadingQ] = useState<string | null>(null);
  const [genJobId, setGenJobId] = useState("");
  const [genBusy, setGenBusy] = useState(false);
  const [inviteAppId, setInviteAppId] = useState("");
  const [inviteTplId, setInviteTplId] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteResult, setInviteResult] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const supabase = getHrBrowserClient();
      const { data: t, error: te } = await supabase
        .from("screening_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (te) throw te;
      setTemplates((t || []) as Template[]);

      const { data: j, error: je } = await supabase.from("jobs").select("id, title").order("title");
      if (je) throw je;
      setJobs((j || []) as Job[]);
      setReady(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const toggleQuestions = async (tplId: string) => {
    if (expanded === tplId) {
      setExpanded(null);
      return;
    }
    setExpanded(tplId);
    if (questionsByTpl[tplId]) return;
    setLoadingQ(tplId);
    try {
      const supabase = getHrBrowserClient();
      const { data, error: qe } = await supabase
        .from("screening_questions")
        .select("*")
        .eq("template_id", tplId)
        .order("order_index");
      if (qe) throw qe;
      setQuestionsByTpl((prev) => ({ ...prev, [tplId]: (data || []) as Question[] }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load questions");
    } finally {
      setLoadingQ(null);
    }
  };

  const regenerate = async () => {
    if (!genJobId) {
      setError("Select a job to regenerate");
      return;
    }
    setGenBusy(true);
    setError(null);
    setInviteResult(null);
    try {
      const res = await fetch("/api/hr/screening/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: genJobId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Generate failed");
      await load();
      setInviteResult(`Created template ${body.template_id} (${body.question_count} questions)`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Generate failed");
    } finally {
      setGenBusy(false);
    }
  };

  const createInvite = async () => {
    if (!inviteAppId || !inviteTplId) {
      setError("Application ID and template required");
      return;
    }
    setInviteBusy(true);
    setError(null);
    setInviteResult(null);
    try {
      const res = await fetch("/api/hr/screening/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_id: inviteAppId, template_id: inviteTplId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Invite failed");
      setInviteResult(body.invitation_url || body.invitation_path);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Invite failed");
    } finally {
      setInviteBusy(false);
    }
  };

  if (!ready && !error) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  if (error && !ready) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
        {error}
        <p className="mt-2 text-xs">
          Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, and sign in if your
          RLS requires auth.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}
      {inviteResult && (
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          {inviteResult}
        </div>
      )}

      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="font-medium">Regenerate test (AI)</h2>
        <p className="mt-1 text-xs text-zinc-500">
          POST /api/hr/screening/generate — uses service role on the server (OPENAI + service key).
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-xs text-zinc-500">Job</label>
            <select
              className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
              value={genJobId}
              onChange={(e) => setGenJobId(e.target.value)}
            >
              <option value="">Select job…</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => regenerate()}
            disabled={genBusy}
            className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {genBusy ? "Generating…" : "Generate template"}
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="font-medium">Create invitation</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs text-zinc-500">Application ID (uuid)</label>
            <input
              className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 font-mono text-xs dark:border-zinc-600 dark:bg-zinc-950"
              value={inviteAppId}
              onChange={(e) => setInviteAppId(e.target.value)}
              placeholder="uuid"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500">Template</label>
            <select
              className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
              value={inviteTplId}
              onChange={(e) => setInviteTplId(e.target.value)}
            >
              <option value="">Select…</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="button"
          onClick={() => createInvite()}
          disabled={inviteBusy}
          className="mt-3 rounded bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {inviteBusy ? "Creating…" : "Create invitation"}
        </button>
      </section>

      <ul className="space-y-3">
        {templates.map((t) => (
          <li
            key={t.id}
            className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <div>
                <p className="font-medium">{t.name}</p>
                <p className="text-xs text-zinc-500">
                  {t.is_global ? "Global" : "Job-specific"}
                  {t.job_id ? ` · job ${t.job_id}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleQuestions(t.id)}
                className="text-sm text-zinc-700 underline dark:text-zinc-300"
              >
                {expanded === t.id ? "Hide questions" : "View questions"}
              </button>
            </div>
            {expanded === t.id && (
              <div className="border-t border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800">
                {loadingQ === t.id ? (
                  <p className="text-zinc-500">Loading questions…</p>
                ) : (
                  <ol className="list-decimal space-y-2 pl-4">
                    {(questionsByTpl[t.id] || []).map((q) => (
                      <li key={q.id}>
                        <span className="font-medium">[{q.type}]</span> {q.question}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
