"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useHrBrowserClient } from "@/lib/supabase/use-hr-browser";

export function ScreeningDashboard() {
  const { supabase, configError } = useHrBrowserClient();
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [templatesN, setTemplatesN] = useState<number | null>(null);
  const [invitesN, setInvitesN] = useState<number | null>(null);
  const [appsN, setAppsN] = useState<number | null>(null);
  const [recentApps, setRecentApps] = useState<
    { id: string; first_name: string | null; last_name: string | null; status: string; job_id: string }[]
  >([]);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) {
        setAuthed(false);
        setReady(true);
        return;
      }
      setAuthed(true);
      const [t1, t2, t3, t4] = await Promise.all([
        supabase.from("screening_templates").select("id", { count: "exact", head: true }),
        supabase.from("screening_invitations").select("id", { count: "exact", head: true }),
        supabase.from("applications").select("id", { count: "exact", head: true }),
        supabase
          .from("applications")
          .select("id, first_name, last_name, status, job_id")
          .order("created_at", { ascending: false })
          .limit(8),
      ]);
      if (!cancelled) {
        setTemplatesN(t1.count ?? 0);
        setInvitesN(t2.count ?? 0);
        setAppsN(t3.count ?? 0);
        setRecentApps((t4.data || []) as typeof recentApps);
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

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
        Sign in with Supabase Auth to load dashboard data. Configure{" "}
        <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_SUPABASE_*</code> and use the same project as{" "}
        <code className="rounded bg-amber-100 px-1">hr</code> schema.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Templates" value={templatesN} href="/screening/templates" />
        <StatCard label="Invitations" value={invitesN} href="/screening/invitations" />
        <StatCard label="Applications" value={appsN} href="#" />
      </div>

      <section>
        <h2 className="text-sm font-semibold text-neutral-800">Recent applications</h2>
        <ul className="mt-3 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {recentApps.length === 0 ? (
            <li className="px-3 py-4 text-sm text-neutral-500">No applications yet.</li>
          ) : (
            recentApps.map((a) => (
              <li key={a.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>
                  {(a.first_name || "") + " " + (a.last_name || "") || "—"}{" "}
                  <span className="text-neutral-400">({a.status})</span>
                </span>
                <code className="text-xs text-neutral-500">{a.id.slice(0, 8)}…</code>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="flex flex-wrap gap-3 text-sm">
        <Link
          href="/screening/templates"
          className="rounded-lg border border-neutral-300 bg-white px-4 py-2 font-medium hover:bg-neutral-50"
        >
          Manage templates
        </Link>
        <Link
          href="/screening/invitations"
          className="rounded-lg border border-neutral-300 bg-white px-4 py-2 font-medium hover:bg-neutral-50"
        >
          View invitations
        </Link>
      </section>
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
