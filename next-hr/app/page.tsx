import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-50 p-6">
      <h1 className="text-2xl font-semibold text-neutral-900">HR Screening API</h1>
      <p className="max-w-md text-center text-sm text-neutral-600">
        Next.js App Router + Supabase <code className="rounded bg-neutral-200 px-1">hr</code> schema. Recruiter UI at{" "}
        <Link href="/screening" className="text-blue-600 underline">
          /screening
        </Link>
        .
      </p>
    </div>
  );
}
