import type { SupabaseClient } from "@supabase/supabase-js";

export type AnswerInput = {
  question_id: string;
  answer_text?: string;
  answer_values?: unknown;
};

type QuestionRow = {
  id: string;
  type: string;
  options: unknown;
  scale_min: number | null;
  scale_max: number | null;
};

function getOptions(q: QuestionRow): { text: string }[] {
  if (!Array.isArray(q.options)) return [];
  return q.options.filter(
    (o: unknown): o is { text: string } =>
      typeof o === "object" &&
      o !== null &&
      "text" in o &&
      typeof (o as { text: string }).text === "string"
  );
}

export function buildResponseRow(
  q: QuestionRow,
  a: AnswerInput
): { answer_text: string | null; answer_values: unknown } {
  if (q.type === "text") {
    const t = (a.answer_text ?? "").trim();
    return { answer_text: t || null, answer_values: null };
  }

  if (q.type === "scale") {
    const min = q.scale_min ?? 1;
    const max = q.scale_max ?? 5;
    const n =
      typeof a.answer_values === "number"
        ? a.answer_values
        : Number(a.answer_values);
    if (!Number.isFinite(n) || n < min || n > max) {
      throw new Error(`Invalid scale for question ${q.id}`);
    }
    return { answer_text: null, answer_values: n };
  }

  if (q.type === "single") {
    const opts = getOptions(q);
    const v = a.answer_values;
    let idx: number | null = null;
    if (typeof v === "number") idx = v;
    else if (typeof v === "string") {
      idx = opts.findIndex((o) => o.text === v);
      if (idx < 0) idx = Number(v);
    }
    if (idx === null || !Number.isFinite(idx) || idx < 0 || idx >= opts.length) {
      throw new Error(`Invalid single choice for question ${q.id}`);
    }
    return { answer_text: null, answer_values: idx };
  }

  if (q.type === "multi") {
    const opts = getOptions(q);
    const raw = a.answer_values;
    let indices: number[] = [];
    if (Array.isArray(raw)) {
      for (const item of raw) {
        if (typeof item === "number") indices.push(item);
        else if (typeof item === "string") {
          const i = opts.findIndex((o) => o.text === item);
          if (i >= 0) indices.push(i);
        }
      }
    }
    indices = [...new Set(indices)].filter((i) => i >= 0 && i < opts.length);
    if (indices.length === 0) {
      throw new Error(`Select at least one option for question ${q.id}`);
    }
    return { answer_text: null, answer_values: indices };
  }

  throw new Error(`Unknown question type: ${q.type}`);
}

export async function persistScreeningSubmission(
  db: SupabaseClient,
  params: {
    invitationId: string;
    templateId: string;
    answers: AnswerInput[];
  }
) {
  const { data: questions, error: qErr } = await db
    .from("screening_questions")
    .select("id, type, options, scale_min, scale_max")
    .eq("template_id", params.templateId);

  if (qErr) throw qErr;
  const qMap = new Map((questions as QuestionRow[]).map((q) => [q.id, q]));

  const rows: {
    invitation_id: string;
    question_id: string;
    answer_text: string | null;
    answer_values: unknown;
  }[] = [];

  for (const a of params.answers) {
    const q = qMap.get(a.question_id);
    if (!q) throw new Error(`Unknown question_id: ${a.question_id}`);
    const built = buildResponseRow(q, a);
    rows.push({
      invitation_id: params.invitationId,
      question_id: a.question_id,
      answer_text: built.answer_text,
      answer_values: built.answer_values,
    });
  }

  await db.from("screening_responses").delete().eq("invitation_id", params.invitationId);

  const { error: insErr } = await db.from("screening_responses").insert(rows);
  if (insErr) throw insErr;
}
