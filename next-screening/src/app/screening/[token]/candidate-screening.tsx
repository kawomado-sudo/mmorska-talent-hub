"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  QuestionFields,
  initialValueForQuestion,
  validateQuestionAnswer,
  type ScreeningQuestionRow,
} from "@/components/screening/QuestionFields";

type LoadPayload = {
  invitation: { id: string; status: string; template_id: string };
  candidate_name: string | null;
  template: { name: string; description: string | null } | null;
  questions: ScreeningQuestionRow[];
};

export function CandidateScreening({ token }: { token: string }) {
  const [data, setData] = useState<LoadPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch(`/api/hr/screening/by-token/${encodeURIComponent(token)}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to load");
      const payload = body as LoadPayload;
      setData(payload);
      const init: Record<string, unknown> = {};
      for (const q of payload.questions) {
        init[q.id] = initialValueForQuestion(q);
      }
      setAnswers(init);
      setDone(payload.invitation.status === "completed");
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const sorted = useMemo(() => {
    const questions = data?.questions ?? [];
    return [...questions].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  }, [data?.questions]);
  const current = sorted[step];
  const isLast = step >= sorted.length - 1;

  const submit = async () => {
    if (!data) return;
    for (const q of sorted) {
      const err = validateQuestionAnswer(q, answers[q.id]);
      if (err) {
        setSubmitMsg(err);
        setStep(sorted.indexOf(q));
        return;
      }
    }
    setSubmitting(true);
    setSubmitMsg(null);
    try {
      const res = await fetch("/api/hr/screening/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          answers: sorted.map((q) => {
            const v = answers[q.id];
            if (q.type === "text") {
              return { question_id: q.id, answer_text: String(v ?? "") };
            }
            return { question_id: q.id, answer_values: v };
          }),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Submit failed");
      setDone(true);
      setSubmitMsg(
        body.analysis_triggered
          ? "Thank you. Your responses were submitted and analysis is running."
          : "Thank you. Your responses were submitted."
      );
    } catch (e: unknown) {
      setSubmitMsg(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-red-600">{loadError}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-zinc-500">Loading…</div>
    );
  }

  if (done && data.invitation.status === "completed") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Already submitted</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          This screening has been completed. Thank you.
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Thank you</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{submitMsg}</p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto max-w-xl px-4 py-10">
        <p className="text-sm text-zinc-500">Screening</p>
        <h1 className="mt-1 text-2xl font-semibold">{data.template?.name || "Assessment"}</h1>
        {data.candidate_name && (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Hello, {data.candidate_name}
          </p>
        )}
        {data.template?.description && (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {data.template.description}
          </p>
        )}

        {sorted.length === 0 ? (
          <p className="mt-8 text-sm">No questions in this template.</p>
        ) : (
          <>
            <div className="mt-6 text-xs text-zinc-500">
              Question {step + 1} of {sorted.length}
            </div>
            <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="font-medium">{current.question}</p>
              <QuestionFields
                q={current}
                value={answers[current.id]}
                onChange={(v) =>
                  setAnswers((prev) => ({
                    ...prev,
                    [current.id]: v,
                  }))
                }
                disabled={submitting}
              />
            </div>
            {submitMsg && <p className="mt-3 text-sm text-red-600">{submitMsg}</p>}
            <div className="mt-6 flex justify-between gap-2">
              <button
                type="button"
                className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600"
                disabled={step === 0 || submitting}
                onClick={() => setStep((s) => Math.max(0, s - 1))}
              >
                Back
              </button>
              {!isLast ? (
                <button
                  type="button"
                  className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
                  disabled={submitting}
                  onClick={() => {
                    const err = validateQuestionAnswer(current, answers[current.id]);
                    if (err) {
                      setSubmitMsg(err);
                      return;
                    }
                    setSubmitMsg(null);
                    setStep((s) => s + 1);
                  }}
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
                  disabled={submitting}
                  onClick={() => submit()}
                >
                  {submitting ? "Submitting…" : "Submit"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
