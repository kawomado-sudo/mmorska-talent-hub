import { TemplatesClient } from "./templates-client";

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Templates</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          View questions, create invitations, or regenerate a test from a job (calls the generate
          API).
        </p>
      </div>
      <TemplatesClient />
    </div>
  );
}
