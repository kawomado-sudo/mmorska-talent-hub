import { CandidateScreening } from "./candidate-screening";

export default async function CandidateScreeningPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <CandidateScreening token={token} />;
}
