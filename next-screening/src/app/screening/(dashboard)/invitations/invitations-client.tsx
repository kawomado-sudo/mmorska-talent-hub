"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getHrBrowserClient } from "@/lib/supabase/browser";

type Invitation = {
  id: string;
  application_id: string;
  template_id: string;
  token: string;
  status: string;
  expires_at: string | null;
  sent_at: string | null;
  completed_at: string | null;
};

export function InvitationsClient() {
  const [rows, setRows] = useState<Invitation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getHrBrowserClient();
      const { data, error: e } = await supabase
        .from("screening_invitations")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(100);
      if (e) throw e;
      setRows((data || []) as Invitation[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p className="text-sm text-zinc-500">Loading…</p>;
  if (error) {
    return (
      <p className="text-sm text-red-600">
        {error} — check env and RLS (authenticated access).
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-zinc-100 dark:bg-zinc-900">
          <tr>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Candidate view</th>
            <th className="px-3 py-2 font-medium">Application</th>
            <th className="px-3 py-2 font-medium">Expires</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-zinc-200 dark:border-zinc-800">
              <td className="px-3 py-2">{r.status}</td>
              <td className="px-3 py-2">
                <Link
                  href={`/screening/${r.token}`}
                  className="text-blue-600 underline dark:text-blue-400"
                >
                  Open test
                </Link>
              </td>
              <td className="px-3 py-2 font-mono text-xs">{r.application_id}</td>
              <td className="px-3 py-2 text-xs text-zinc-500">
                {r.expires_at ? new Date(r.expires_at).toLocaleString() : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <p className="p-4 text-sm text-zinc-500">No invitations yet.</p>
      )}
    </div>
  );
}
