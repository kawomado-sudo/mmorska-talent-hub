"use client";

import type { QuestionRow } from "@/components/screening/types";

type AnswerState = Record<string, { text?: string; values?: unknown }>;

export function QuestionFields({
  questions,
  answers,
  onChange,
  disabled,
}: {
  questions: QuestionRow[];
  answers: AnswerState;
  onChange: (questionId: string, patch: { text?: string; values?: unknown }) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-8">
      {questions.map((q, idx) => (
        <div key={q.id} className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-neutral-800">
            {idx + 1}. {q.question}
          </p>
          <div className="mt-3">
            {q.type === "text" && (
              <textarea
                className="mt-1 w-full rounded border border-neutral-300 px-3 py-2 text-sm"
                rows={4}
                disabled={disabled}
                value={answers[q.id]?.text ?? ""}
                onChange={(e) => onChange(q.id, { text: e.target.value })}
              />
            )}
            {q.type === "scale" && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-neutral-500">
                  {q.scale_min ?? 1} – {q.scale_max ?? 5}
                </span>
                <input
                  type="range"
                  min={q.scale_min ?? 1}
                  max={q.scale_max ?? 5}
                  disabled={disabled}
                  value={
                    typeof answers[q.id]?.values === "number"
                      ? (answers[q.id]?.values as number)
                      : (q.scale_min ?? 1)
                  }
                  onChange={(e) => onChange(q.id, { values: Number(e.target.value) })}
                  className="flex-1"
                />
                <span className="text-sm font-medium tabular-nums">
                  {typeof answers[q.id]?.values === "number"
                    ? (answers[q.id]?.values as number)
                    : "—"}
                </span>
              </div>
            )}
            {(q.type === "single" || q.type === "multi") && Array.isArray(q.options) && (
              <div className="mt-2 space-y-2">
                {q.options.map((opt: { text: string }, oi: number) => {
                  const selected = answers[q.id]?.values;
                  const multiSel = Array.isArray(selected) ? (selected as number[]) : [];
                  const singleSel = typeof selected === "number" ? selected : undefined;
                  const checked =
                    q.type === "multi"
                      ? multiSel.includes(oi)
                      : singleSel === oi;
                  return (
                    <label
                      key={oi}
                      className="flex cursor-pointer items-start gap-2 text-sm"
                    >
                      <input
                        type={q.type === "multi" ? "checkbox" : "radio"}
                        name={q.id}
                        disabled={disabled}
                        checked={checked}
                        onChange={() => {
                          if (q.type === "multi") {
                            const next = new Set(multiSel);
                            if (next.has(oi)) next.delete(oi);
                            else next.add(oi);
                            onChange(q.id, { values: Array.from(next).sort((a, b) => a - b) });
                          } else {
                            onChange(q.id, { values: oi });
                          }
                        }}
                        className="mt-1"
                      />
                      <span>{opt.text}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
