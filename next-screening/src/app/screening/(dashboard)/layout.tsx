import Link from "next/link";

export default function ScreeningDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-4 py-3">
          <Link href="/screening" className="font-semibold">
            Screening
          </Link>
          <nav className="flex flex-wrap gap-3 text-sm text-zinc-600 dark:text-zinc-400">
            <Link href="/screening" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              Dashboard
            </Link>
            <Link
              href="/screening/templates"
              className="hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Templates
            </Link>
            <Link
              href="/screening/invitations"
              className="hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Invitations
            </Link>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-8">{children}</div>
    </div>
  );
}
