import Link from "next/link";

export default function ScreeningDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
          <Link href="/screening" className="text-sm font-semibold text-neutral-900">
            Screening
          </Link>
          <nav className="flex gap-4 text-sm text-neutral-600">
            <Link href="/screening" className="hover:text-neutral-900">
              Dashboard
            </Link>
            <Link href="/screening/templates" className="hover:text-neutral-900">
              Templates
            </Link>
            <Link href="/screening/invitations" className="hover:text-neutral-900">
              Invitations
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
