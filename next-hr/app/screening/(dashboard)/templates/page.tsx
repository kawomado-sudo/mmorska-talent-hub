import { TemplatesPageClient } from "@/components/screening/TemplatesPageClient";

export default function ScreeningTemplatesPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-neutral-900">Templates</h1>
      <p className="mt-1 text-sm text-neutral-600">View questions, generate tests, create invitations.</p>
      <div className="mt-8">
        <TemplatesPageClient />
      </div>
    </div>
  );
}
