import { InvitationsClient } from "./invitations-client";

export default function InvitationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Invitations</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Pending, started, and completed screening invitations with candidate links.
        </p>
      </div>
      <InvitationsClient />
    </div>
  );
}
