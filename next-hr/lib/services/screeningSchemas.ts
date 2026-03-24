import { z } from "zod";

export const questionOptionSchema = z.object({
  text: z.string().min(1),
  is_correct: z.boolean(),
});

export const generatedQuestionSchema = z.object({
  skill_id: z.string().uuid().nullable().optional(),
  question: z.string().min(1),
  type: z.enum(["single", "multi", "text", "scale"]),
  options: z.array(questionOptionSchema).nullable().optional(),
  scale_min: z.number().int().nullable().optional(),
  scale_max: z.number().int().nullable().optional(),
});

export const generatedScreeningSchema = z.object({
  template: z.object({
    name: z.string().min(1),
    description: z.string().nullable().optional(),
  }),
  questions: z.array(generatedQuestionSchema).min(4).max(20),
});

export type GeneratedScreening = z.infer<typeof generatedScreeningSchema>;

export function normalizeGeneratedQuestion(
  q: z.infer<typeof generatedQuestionSchema>,
  order_index: number
) {
  const type = q.type;
  let options: { text: string; is_correct: boolean }[] | null = null;
  let scale_min: number | null = null;
  let scale_max: number | null = null;

  if (type === "single" || type === "multi") {
    const raw = q.options?.filter((o) => o.text?.trim()) ?? [];
    if (raw.length < 2) {
      throw new Error(`Question "${q.question.slice(0, 40)}..." needs at least 2 options`);
    }
    options = raw.map((o) => ({
      text: o.text.trim(),
      is_correct: Boolean(o.is_correct),
    }));
  } else if (type === "scale") {
    scale_min = q.scale_min ?? 1;
    scale_max = q.scale_max ?? 5;
    if (scale_min >= scale_max) {
      throw new Error("scale_min must be less than scale_max");
    }
  }

  return {
    skill_id: q.skill_id ?? null,
    question: q.question.trim(),
    type,
    options,
    scale_min,
    scale_max,
    order_index,
  };
}
