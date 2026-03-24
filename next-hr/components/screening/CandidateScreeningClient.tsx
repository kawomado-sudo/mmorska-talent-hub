"use client";

import { useEffect, useMemo, useState } from "react";
import { QuestionFields } from "@/components/screening/QuestionFields";
import type { QuestionRow } from "@/components/screening/types";

type AnswerState = Record<string, { text?: string; values?: unknown }>;

export function CandidateScreeningClient({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [submitting, setSubmitting] = useState(false);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const start = await fetch("/api/hr/screening/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (!start.ok) {
          const j = await start.json().catch(() => ({}));
          if (!cancelled) {
            setError(j.error === "expired" ? "This invitation has expired." : "Invalid or unknown link.");
          }
          return;
        }
        const res = await fetch(`/api/hr/screening/candidate/${encodeURIComponent(token)}`);
        const data = await res.json();
        if (!res.ok) {
          if (!cancelled) {
            setError(
              data.error === "expired"
                ? "This invitation has expired."
                : "Could not load screening."
            );
          }
          return;
        }
        if (data.completed) {
          if (!cancelled) {
            setCompleted(true);
            setQuestions(data.questions || []);
          }
          return;
        }
        const qs: QuestionRow[] = data.questions || [];
        if (!cancelled) {
          setQuestions(qs);
          const init: AnswerState = {};
          for (const q of qs) {
            if (q.type === "scale") init[q.id] = { values: q.scale_min ?? 1 };
            else if (q.type === "multi") init[q.id] = { values: [] };
            else if (q.type === "single") init[q.id] = {};
            else init[q.id] = { text: "" };
          }
          setAnswers(init);
        }
      } catch {
        if (!cancelled) setError("Network error.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const patchAnswer = (questionId: string, patch: { text?: string; values?: unknown }) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], ...patch },
    }));
  };

  const payload = useMemo(() => {
    return questions.map((q) => {
      const a = answers[q.id];
      if (q.type === "text") {
        return { question_id: q.id, answer_text: a?.text ?? "", answer_values: null };
      }
      return { question_id: q.id, answer_text: null, answer_values: a?.values ?? null };
    });
  }, [questions, answers]);

  const submit = async () => {
    for (const q of questions) {
      const a = answers[q.id];
      if (q.type === "text" && !(a?.text || "").trim()) {
        setError("Please answer all questions.");
        return;
      }
      if (q.type === "single" && typeof a?.values !== "number") {
        setError("Please answer all questions.");
        return;
      }
      if (q.type === "multi" && (!Array.isArray(a?.values) || (a?.values as number[]).length === 0)) {
        setError("Please answer all questions.");
        return;
      }
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/hr/screening/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, answers: payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Submit failed");
        return;
      }
      setDoneMsg(
        data.analysis_error
          ? "Responses saved. AI analysis will be available shortly."
          : "Thank you. Your responses have been submitted."
      );
      setCompleted(true);
    } catch {
      setError("Network error on submit.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-neutral-500">Loading screening…</p>;
  }

  if (error && !questions.length && !completed) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error}
      </div>
    );
  }

  if (completed && !doneMsg) {
    return (
      <p className="text-sm text-neutral-600">
        This screening was already completed. Thank you.
      </p>
    );
  }

  if (completed && doneMsg) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        {doneMsg}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          {error}
        </div>
      )}
      <QuestionFields questions={questions} answers={answers} onChange={patchAnswer} disabled={submitting} />
      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit answers"}
      </button>
    </div>
  );
}
