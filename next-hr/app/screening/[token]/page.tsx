import { CandidateScreeningClient } from "@/components/screening/CandidateScreeningClient";

export default async function CandidateScreeningPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-xl font-semibold text-neutral-900">Screening</h1>
      <p className="mt-1 text-sm text-neutral-600">Answer all questions, then submit.</p>
      <div className="mt-8">
        <CandidateScreeningClient token={token} />
      </div>
    </div>
  );
}
