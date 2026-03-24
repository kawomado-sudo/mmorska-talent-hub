"use client";

import { useEffect, useState } from "react";
import { useHrBrowserClient } from "@/lib/supabase/use-hr-browser";

type Invitation = {
  id: string;
  token: string;
  status: string;
  application_id: string;
  template_id: string;
  sent_at: string | null;
  expires_at: string | null;
};

export function InvitationsPageClient() {
  const { supabase, configError } = useHrBrowserClient();
  const [rows, setRows] = useState<Invitation[]>([]);
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [base, setBase] = useState("");

  useEffect(() => {
    setBase(typeof window !== "undefined" ? window.location.origin : "");
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (!cancelled) {
          setAuthed(false);
          setReady(true);
        }
        return;
      }
      setAuthed(true);
      const { data, error } = await supabase
        .from("screening_invitations")
        .select("id, token, status, application_id, template_id, sent_at, expires_at")
        .order("sent_at", { ascending: false })
        .limit(100);
      if (!cancelled && !error) setRows((data || []) as Invitation[]);
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  if (configError) {
    return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{configError}</div>;
  }
  if (!supabase) return <p className="text-sm text-neutral-500">Loading…</p>;
  if (!ready) return <p className="text-sm text-neutral-500">Loading…</p>;
  if (!authed) {
    return <p className="text-sm text-amber-800">Sign in to list invitations.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
          <tr>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Candidate link</th>
            <th className="px-3 py-2">Application</th>
            <th className="px-3 py-2">Sent</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-3 py-6 text-center text-neutral-500">
                No invitations.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id} className="border-b border-neutral-100">
                <td className="px-3 py-2 capitalize">{r.status}</td>
                <td className="px-3 py-2">
                  <a
                    href={`${base || ""}/screening/${r.token}`}
                    className="text-blue-600 hover:underline break-all"
                    target="_blank"
                    rel="noreferrer"
                  >
                    /screening/{r.token.slice(0, 8)}…
                  </a>
                </td>
                <td className="px-3 py-2 font-mono text-xs">{r.application_id.slice(0, 8)}…</td>
                <td className="px-3 py-2 text-xs text-neutral-600">
                  {r.sent_at ? new Date(r.sent_at).toLocaleString() : "—"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
