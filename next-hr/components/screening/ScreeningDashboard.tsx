"use client";

import Link from "next/link";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { hrScreeningFetch } from "@/lib/hr-api-client";
import { useHrBrowserClient } from "@/lib/supabase/use-hr-browser";

type ApplicationRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  job_id: string;
  ai_rating: number | null;
  jobs: { title: string | null } | { title: string | null }[] | null;
};

type InvitationRow = {
  id: string;
  application_id: string;
  status: string;
  token: string;
  template_id: string;
  created_at?: string | null;
  sent_at?: string | null;
};

type AnalysisRow = {
  invitation_id: string;
  ai_overall: number | null;
};

type Template = {
  id: string;
  name: string;
  is_global: boolean;
  job_id: string | null;
};

type DashboardRow = {
  application: ApplicationRow;
  invitation: InvitationRow | null;
  aiOverall: number | null;
};

type InviteFilter = "all" | "not_assigned" | "pending" | "started" | "completed";

export function ScreeningDashboard() {
  const { supabase, configError } = useHrBrowserClient();
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [templatesN, setTemplatesN] = useState<number | null>(null);
  const [invitesN, setInvitesN] = useState<number | null>(null);
  const [screeningN, setScreeningN] = useState<number | null>(null);
  const [rows, setRows] = useState<DashboardRow[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [jobFilter, setJobFilter] = useState("all");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [inviteFilter, setInviteFilter] = useState<InviteFilter>("all");

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<DashboardRow | null>(null);
  const [templateChoice, setTemplateChoice] = useState("");
  const [assignBusy, setAssignBusy] = useState(false);
  const [assignMessage, setAssignMessage] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!supabase) return;

    setError(null);
    const {
      data: { session: s },
    } = await supabase.auth.getSession();

    if (!s) {
      setAuthed(false);
      setReady(true);
      return;
    }

    setAuthed(true);
    setSession(s);

    const [templatesCountRes, invitesCountRes, screeningCountRes, appsRes, templatesRes] = await Promise.all([
      supabase.from("screening_templates").select("id", { count: "exact", head: true }),
      supabase.from("screening_invitations").select("id", { count: "exact", head: true }),
      supabase.from("applications").select("id", { count: "exact", head: true }).eq("status", "screening"),
      supabase
        .from("applications")
        .select("id, first_name, last_name, email, job_id, ai_rating, jobs(title)")
        .eq("status", "screening")
        .order("created_at", { ascending: false }),
      supabase.from("screening_templates").select("id, name, is_global, job_id").order("created_at", { ascending: false }),
    ]);

    if (appsRes.error) {
      setError(appsRes.error.message);
      setReady(true);
      return;
    }

    const applications = (appsRes.data || []) as ApplicationRow[];
    const appIds = applications.map((a) => a.id);

    const invitesByApp = new Map<string, InvitationRow>();
    const analysisByInvitation = new Map<string, number | null>();

    if (appIds.length > 0) {
      const { data: invitationRows, error: inviteErr } = await supabase
        .from("screening_invitations")
        .select("id, application_id, status, token, template_id, created_at, sent_at")
        .in("application_id", appIds)
        .order("created_at", { ascending: false });

      if (inviteErr) {
        setError(inviteErr.message);
        setReady(true);
        return;
      }

      const invitations = (invitationRows || []) as InvitationRow[];
      for (const inv of invitations) {
        if (!invitesByApp.has(inv.application_id)) {
          invitesByApp.set(inv.application_id, inv);
        }
      }

      const invitationIds = invitations.map((inv) => inv.id);
      if (invitationIds.length > 0) {
        const { data: analysisRows, error: analysisErr } = await supabase
          .from("screening_ai_analysis")
          .select("invitation_id, ai_overall")
          .in("invitation_id", invitationIds);

        if (analysisErr) {
          setError(analysisErr.message);
          setReady(true);
          return;
        }

        ((analysisRows || []) as AnalysisRow[]).forEach((analysis) => {
          analysisByInvitation.set(analysis.invitation_id, analysis.ai_overall);
        });
      }
    }

    const mappedRows: DashboardRow[] = applications.map((app) => {
      const invitation = invitesByApp.get(app.id) || null;
      const aiOverall = invitation ? (analysisByInvitation.get(invitation.id) ?? null) : null;
      return { application: app, invitation, aiOverall };
    });

    setTemplatesN(templatesCountRes.count ?? 0);
    setInvitesN(invitesCountRes.count ?? 0);
    setScreeningN(screeningCountRes.count ?? 0);
    setTemplates((templatesRes.data || []) as Template[]);
    setRows(mappedRows);
    setReady(true);
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (cancelled) return;
      await loadDashboard();
    })();

    return () => {
      cancelled = true;
    };
  }, [loadDashboard]);

  const jobs = useMemo(() => {
    const byId = new Map<string, string>();
    rows.forEach((row) => {
      const jobId = row.application.job_id;
      const title = getJobTitle(row.application.jobs);
      byId.set(jobId, title || "Untitled job");
    });
    return Array.from(byId.entries()).map(([id, title]) => ({ id, title }));
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (jobFilter !== "all" && row.application.job_id !== jobFilter) return false;

      if (inviteFilter !== "all") {
        if (inviteFilter === "not_assigned" && row.invitation) return false;
        if (inviteFilter !== "not_assigned" && row.invitation?.status !== inviteFilter) return false;
      }

      const score = row.aiOverall ?? row.application.ai_rating ?? null;
      if (scoreFilter === "80_plus") return typeof score === "number" && score >= 80;
      if (scoreFilter === "60_79") return typeof score === "number" && score >= 60 && score < 80;
      if (scoreFilter === "below_60") return typeof score === "number" && score < 60;
      if (scoreFilter === "none") return score === null;
      return true;
    });
  }, [rows, jobFilter, inviteFilter, scoreFilter]);

  const openAssignModal = (row: DashboardRow) => {
    setSelectedApp(row);
    const defaultTemplate =
      templates.find((tpl) => tpl.job_id === row.application.job_id)?.id ||
      templates.find((tpl) => tpl.is_global)?.id ||
      templates[0]?.id ||
      "";
    setTemplateChoice(defaultTemplate);
    setAssignMessage(null);
    setAssignModalOpen(true);
  };

  const assignTest = async () => {
    if (!selectedApp || !session?.access_token) return;

    setAssignBusy(true);
    setAssignMessage(null);

    try {
      let chosenTemplate = templateChoice;
      if (chosenTemplate === "__generate__") {
        const generateRes = await hrScreeningFetch("/api/hr/screening/generate", {
          method: "POST",
          accessToken: session.access_token,
          body: JSON.stringify({ job_id: selectedApp.application.job_id }),
        });
        const generateData = await generateRes.json();
        if (!generateRes.ok || !generateData.template_id) {
          throw new Error(generateData.error || "Failed to generate template");
        }
        chosenTemplate = generateData.template_id;
      }

      if (!chosenTemplate) {
        throw new Error("Please select a template.");
      }

      const inviteRes = await hrScreeningFetch("/api/hr/screening/invite", {
        method: "POST",
        accessToken: session.access_token,
        body: JSON.stringify({ application_id: selectedApp.application.id, template_id: chosenTemplate }),
      });
      const inviteData = await inviteRes.json();
      if (!inviteRes.ok) {
        throw new Error(inviteData.error || "Failed to assign screening test");
      }

      setAssignMessage("Screening assigned successfully.");
      await loadDashboard();
      setAssignModalOpen(false);
    } catch (e) {
      setAssignMessage(e instanceof Error ? e.message : "Unexpected error while assigning screening.");
    } finally {
      setAssignBusy(false);
    }
  };

  if (configError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {configError}
      </div>
    );
  }
  if (!supabase) return <p className="text-sm text-neutral-500">Loading…</p>;
  if (!ready) return <p className="text-sm text-neutral-500">Loading…</p>;

  if (!authed) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Sign in with Supabase Auth to load screening data. Configure{" "}
        <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_SUPABASE_*</code> and use the same project as{" "}
        <code className="rounded bg-amber-100 px-1">hr</code> schema.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Templates" value={templatesN} href="/screening/templates" />
        <StatCard label="Invitations" value={invitesN} href="/screening/invitations" />
        <StatCard label="In screening" value={screeningN} href="#" />
      </div>

      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <FilterField label="Job">
            <select
              className="mt-1 rounded border border-neutral-300 px-2 py-1.5 text-sm"
              value={jobFilter}
              onChange={(e) => setJobFilter(e.target.value)}
            >
              <option value="all">All jobs</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Score">
            <select
              className="mt-1 rounded border border-neutral-300 px-2 py-1.5 text-sm"
              value={scoreFilter}
              onChange={(e) => setScoreFilter(e.target.value)}
            >
              <option value="all">All scores</option>
              <option value="80_plus">80+</option>
              <option value="60_79">60-79</option>
              <option value="below_60">Below 60</option>
              <option value="none">No score</option>
            </select>
          </FilterField>

          <FilterField label="Screening status">
            <select
              className="mt-1 rounded border border-neutral-300 px-2 py-1.5 text-sm"
              value={inviteFilter}
              onChange={(e) => setInviteFilter(e.target.value as InviteFilter)}
            >
              <option value="all">All</option>
              <option value="not_assigned">Not assigned</option>
              <option value="pending">Invited</option>
              <option value="started">In progress</option>
              <option value="completed">Completed</option>
            </select>
          </FilterField>
        </div>
      </section>

      <section className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
            <tr>
              <th className="px-3 py-2">Candidate</th>
              <th className="px-3 py-2">Job</th>
              <th className="px-3 py-2">Screening status</th>
              <th className="px-3 py-2">Score</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {error ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-red-700">
                  {error}
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-neutral-500">
                  No screening candidates found.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => {
                const app = row.application;
                const invitation = row.invitation;
                const name = `${app.first_name || ""} ${app.last_name || ""}`.trim() || "Unnamed candidate";
                const score = row.aiOverall ?? app.ai_rating;

                return (
                  <tr key={app.id} className="border-b border-neutral-100 align-top">
                    <td className="px-3 py-3">
                      <p className="font-medium text-neutral-900">{name}</p>
                      <p className="text-xs text-neutral-500">{app.email || "No email"}</p>
                    </td>
                    <td className="px-3 py-3 text-neutral-700">{getJobTitle(app.jobs) || "Untitled job"}</td>
                    <td className="px-3 py-3">{renderInviteStatus(invitation?.status)}</td>
                    <td className="px-3 py-3">{renderScoreBadge(score)}</td>
                    <td className="px-3 py-3">
                      {!invitation ? (
                        <button
                          type="button"
                          onClick={() => openAssignModal(row)}
                          className="rounded border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-50"
                        >
                          Assign test
                        </button>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/screening/${invitation.token}`}
                            target="_blank"
                            className="rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
                          >
                            View test
                          </Link>
                          <Link
                            href="/screening/invitations"
                            className="rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
                          >
                            View results
                          </Link>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      {assignModalOpen && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-lg border border-neutral-200 bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-neutral-900">Assign screening test</h3>
            <p className="mt-1 text-sm text-neutral-600">
              Candidate: {`${selectedApp.application.first_name || ""} ${selectedApp.application.last_name || ""}`.trim() || "Unnamed candidate"}
            </p>

            <div className="mt-4">
              <label className="block text-xs font-medium uppercase tracking-wide text-neutral-500">Template</label>
              <select
                className="mt-1 w-full rounded border border-neutral-300 px-2 py-2 text-sm"
                value={templateChoice}
                onChange={(e) => setTemplateChoice(e.target.value)}
                disabled={assignBusy}
              >
                <option value="">Select template…</option>
                {templates
                  .filter((tpl) => tpl.is_global || tpl.job_id === selectedApp.application.job_id)
                  .map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name}
                    </option>
                  ))}
                <option value="__generate__">Generate new template</option>
              </select>
            </div>

            {assignMessage && <p className="mt-3 text-sm text-neutral-700">{assignMessage}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAssignModalOpen(false)}
                className="rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
                disabled={assignBusy}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={assignTest}
                disabled={assignBusy}
                className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {assignBusy ? "Assigning…" : "Assign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getJobTitle(jobRel: ApplicationRow["jobs"]): string | null {
  if (!jobRel) return null;
  if (Array.isArray(jobRel)) return jobRel[0]?.title ?? null;
  return jobRel.title ?? null;
}

function renderInviteStatus(status?: string | null) {
  if (!status) return <StatusBadge className="bg-neutral-100 text-neutral-700">Not assigned</StatusBadge>;
  if (status === "pending") return <StatusBadge className="bg-blue-100 text-blue-700">Invited</StatusBadge>;
  if (status === "started") return <StatusBadge className="bg-amber-100 text-amber-700">In progress</StatusBadge>;
  if (status === "completed") return <StatusBadge className="bg-emerald-100 text-emerald-700">Completed</StatusBadge>;
  return <StatusBadge className="bg-neutral-100 text-neutral-700">{status}</StatusBadge>;
}

function renderScoreBadge(score: number | null | undefined) {
  if (typeof score !== "number") return <span className="text-xs text-neutral-500">—</span>;

  if (score >= 80) {
    return <StatusBadge className="bg-emerald-100 text-emerald-700">{score}/100</StatusBadge>;
  }
  if (score >= 60) {
    return <StatusBadge className="bg-amber-100 text-amber-700">{score}/100</StatusBadge>;
  }
  return <StatusBadge className="bg-rose-100 text-rose-700">{score}/100</StatusBadge>;
}

function StatusBadge({ className, children }: { className: string; children: ReactNode }) {
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${className}`}>{children}</span>;
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</label>
      {children}
    </div>
  );
}

function StatCard({ label, value, href }: { label: string; value: number | null; href: string }) {
  const inner = (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900">{value ?? "—"}</p>
    </>
  );
  if (href === "#") {
    return <div className="rounded-lg border border-neutral-200 bg-white p-4">{inner}</div>;
  }
  return (
    <Link href={href} className="block rounded-lg border border-neutral-200 bg-white p-4 hover:border-neutral-300">
      {inner}
    </Link>
  );
}
