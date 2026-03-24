import { ScreeningDashboard } from "@/components/screening/ScreeningDashboard";

export default function ScreeningHomePage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-neutral-900">Recruiter dashboard</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Templates, invitations, and recent applications.
      </p>
      <div className="mt-8">
        <ScreeningDashboard />
      </div>
    </div>
  );
}
