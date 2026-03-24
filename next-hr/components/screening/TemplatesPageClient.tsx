"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useHrBrowserClient } from "@/lib/supabase/use-hr-browser";
import { hrScreeningFetch } from "@/lib/hr-api-client";

type Template = {
  id: string;
  name: string;
  description: string | null;
  job_id: string | null;
  is_global: boolean;
};

type Question = {
  id: string;
  question: string;
  type: string;
  order_index: number;
};

type Job = { id: string; title: string };

export function TemplatesPageClient() {
  const { supabase, configError } = useHrBrowserClient();
  const [session, setSession] = useState<Session | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Record<string, Question[]>>({});
  const [jobId, setJobId] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [inviteTpl, setInviteTpl] = useState("");
  const [inviteApp, setInviteApp] = useState("");
  const [inviteResult, setInviteResult] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (cancelled) return;
      setSession(s);
      const { data: t } = await supabase.from("screening_templates").select("*").order("created_at", { ascending: false });
      if (cancelled) return;
      setTemplates((t || []) as Template[]);
      const { data: j } = await supabase.from("jobs").select("id, title").order("title");
      if (!cancelled) setJobs((j || []) as Job[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const reloadLists = async () => {
    if (!supabase) return;
    const { data: t } = await supabase.from("screening_templates").select("*").order("created_at", { ascending: false });
    setTemplates((t || []) as Template[]);
    const { data: j } = await supabase.from("jobs").select("id, title").order("title");
    setJobs((j || []) as Job[]);
  };

  const toggleQuestions = async (id: string) => {
    if (!supabase) return;
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    if (questions[id]) return;
    const { data } = await supabase
      .from("screening_questions")
      .select("id, question, type, order_index")
      .eq("template_id", id)
      .order("order_index");
    setQuestions((prev) => ({ ...prev, [id]: (data || []) as Question[] }));
  };

  const regenerate = async () => {
    if (!session?.access_token) {
      setMsg("Sign in first.");
      return;
    }
    if (!jobId) {
      setMsg("Select a job.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await hrScreeningFetch("/api/hr/screening/generate", {
        method: "POST",
        accessToken: session.access_token,
        body: JSON.stringify({ job_id: jobId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setMsg(`Created template ${data.template_id}`);
      await reloadLists();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  const createInvite = async () => {
    if (!session?.access_token) {
      setInviteResult("Sign in first.");
      return;
    }
    if (!inviteTpl || !inviteApp) {
      setInviteResult("Template and application ID required.");
      return;
    }
    setBusy(true);
    setInviteResult(null);
    try {
      const res = await hrScreeningFetch("/api/hr/screening/invite", {
        method: "POST",
        accessToken: session.access_token,
        body: JSON.stringify({ template_id: inviteTpl, application_id: inviteApp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setInviteResult(data.invitation_link || JSON.stringify(data));
    } catch (e) {
      setInviteResult(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  if (configError) {
    return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{configError}</div>;
  }
  if (!supabase) return <p className="text-sm text-neutral-500">Loading…</p>;

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold">Generate screening (AI)</h2>
        <p className="mt-1 text-xs text-neutral-500">Creates a new template linked to the selected job.</p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-neutral-600">Job</label>
            <select
              className="mt-1 rounded border border-neutral-300 px-2 py-1.5 text-sm"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
            >
              <option value="">Select…</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={regenerate}
            className="rounded bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            Regenerate test
          </button>
        </div>
        {msg && <p className="mt-2 text-xs text-neutral-700">{msg}</p>}
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold">Create invitation</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs text-neutral-600">Template ID</label>
            <input
              className="mt-1 w-full rounded border border-neutral-300 px-2 py-1.5 font-mono text-xs"
              value={inviteTpl}
              onChange={(e) => setInviteTpl(e.target.value)}
              placeholder="uuid"
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-600">Application ID</label>
            <input
              className="mt-1 w-full rounded border border-neutral-300 px-2 py-1.5 font-mono text-xs"
              value={inviteApp}
              onChange={(e) => setInviteApp(e.target.value)}
              placeholder="uuid"
            />
          </div>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={createInvite}
          className="mt-3 rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-50"
        >
          Create invitation
        </button>
        {inviteResult && (
          <p className="mt-2 break-all text-xs text-neutral-700">{inviteResult}</p>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-neutral-800">All templates</h2>
        <ul className="mt-3 space-y-2">
          {templates.map((t) => (
            <li key={t.id} className="rounded-lg border border-neutral-200 bg-white">
              <button
                type="button"
                onClick={() => toggleQuestions(t.id)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm"
              >
                <span className="font-medium">{t.name}</span>
                <span className="text-xs text-neutral-500">{expanded === t.id ? "▲" : "▼"}</span>
              </button>
              {t.description && <p className="px-3 pb-2 text-xs text-neutral-600">{t.description}</p>}
              {expanded === t.id && (
                <div className="border-t border-neutral-100 px-3 py-2">
                  <p className="text-xs text-neutral-500">ID: {t.id}</p>
                  <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-neutral-700">
                    {(questions[t.id] || []).map((q) => (
                      <li key={q.id}>
                        <span className="text-neutral-400">[{q.type}]</span> {q.question}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
