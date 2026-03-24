import { InvitationsPageClient } from "@/components/screening/InvitationsPageClient";

export default function ScreeningInvitationsPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-neutral-900">Invitations</h1>
      <p className="mt-1 text-sm text-neutral-600">Status and candidate links.</p>
      <div className="mt-8">
        <InvitationsPageClient />
      </div>
    </div>
  );
}
