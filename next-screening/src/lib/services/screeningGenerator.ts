import { z } from "zod";
import { completeJson } from "@/lib/ai/client";
import type { SupabaseClient } from "@supabase/supabase-js";

const optionSchema = z.object({
  text: z.string(),
  is_correct: z.boolean(),
});

const generatedQuestionSchema = z.object({
  skill_name: z.string().nullable().optional(),
  question: z.string().min(1),
  type: z.enum(["single", "multi", "text", "scale"]),
  options: z.array(optionSchema).nullable().optional(),
  scale_min: z.number().int().nullable().optional(),
  scale_max: z.number().int().nullable().optional(),
});

const generatedTestSchema = z.object({
  template: z.object({
    name: z.string().min(1),
    description: z.string().nullable().optional(),
  }),
  questions: z.array(generatedQuestionSchema).min(3).max(20),
});

export type GenerateScreeningResult = {
  template_id: string;
  question_count: number;
};

type SkillRow = { id: string; name: string };

function normalizeQuestions(
  raw: z.infer<typeof generatedTestSchema>["questions"]
) {
  return raw.map((q, order_index) => {
    const type = q.type;
    let options =
      type === "single" || type === "multi"
        ? (q.options || []).filter((o) => o.text.trim())
        : null;
    if ((type === "single" || type === "multi") && (!options || options.length < 2)) {
      options = [
        { text: "Option A", is_correct: true },
        { text: "Option B", is_correct: false },
      ];
    }
    const scale_min = type === "scale" ? (q.scale_min ?? 1) : null;
    const scale_max = type === "scale" ? (q.scale_max ?? 5) : null;
    return {
      skill_name: q.skill_name?.trim() || null,
      question: q.question.trim(),
      type,
      options,
      scale_min,
      scale_max,
      order_index,
    };
  });
}

function matchSkillId(
  skillName: string | null,
  skills: SkillRow[]
): string | null {
  if (!skillName) return null;
  const lower = skillName.toLowerCase();
  const exact = skills.find((s) => s.name.toLowerCase() === lower);
  if (exact) return exact.id;
  const partial = skills.find((s) => lower.includes(s.name.toLowerCase()));
  return partial?.id ?? null;
}

export async function generateScreeningForJob(
  db: SupabaseClient,
  jobId: string
): Promise<GenerateScreeningResult> {
  const { data: job, error: jobErr } = await db
    .from("jobs")
    .select("id, title, description")
    .eq("id", jobId)
    .maybeSingle();

  if (jobErr) throw jobErr;
  if (!job) throw new Error("Job not found");

  const { data: jobSkillRows, error: jsErr } = await db
    .from("job_skills")
    .select("skill_id")
    .eq("job_id", jobId);

  if (jsErr) throw jsErr;

  const skillIds = (jobSkillRows || [])
    .map((r: { skill_id: string }) => r.skill_id)
    .filter(Boolean);

  let skills: SkillRow[] = [];
  if (skillIds.length > 0) {
    const { data: sk, error: skErr } = await db
      .from("skills")
      .select("id, name")
      .in("id", skillIds);
    if (skErr) throw skErr;
    skills = (sk || []) as SkillRow[];
  } else {
    const { data: sk, error: skErr } = await db
      .from("skills")
      .select("id, name")
      .limit(40);
    if (skErr) throw skErr;
    skills = (sk || []) as SkillRow[];
  }

  const skillsText =
    skills.length > 0
      ? skills.map((s) => `- ${s.name}`).join("\n")
      : "(No skills linked — generate general professional screening questions for the role.)";

  const system = `You are an expert recruiter. Output ONLY valid JSON matching this shape:
{
  "template": { "name": string, "description": string | null },
  "questions": [
    {
      "skill_name": string | null,
      "question": string,
      "type": "single" | "multi" | "text" | "scale",
      "options": [{ "text": string, "is_correct": boolean }] | null,
      "scale_min": number | null,
      "scale_max": number | null
    }
  ]
}
Rules:
- 8–12 questions unless the role is very narrow (then at least 5).
- For single/multi: provide 3–5 options, mark is_correct for ideal answers (may be multiple for multi).
- For scale: set scale_min and scale_max (e.g. 1–5), options must be null.
- For text: options null.
- skill_name should match one of the provided skill names when relevant, else null.
- Questions must be fair, job-related, and non-discriminatory.`;

  const user = `Job title: ${job.title}
Job description:
${job.description || "Not provided"}

Relevant skills (use skill_name from this list when applicable):
${skillsText}

Generate a screening test JSON as specified.`;

  const parsedRaw = await completeJson<unknown>([
    { role: "system", content: system },
    { role: "user", content: user },
  ]);

  const parsed = generatedTestSchema.parse(parsedRaw);
  const normalized = normalizeQuestions(parsed.questions);

  const { data: tpl, error: tplErr } = await db
    .from("screening_templates")
    .insert({
      name: parsed.template.name,
      description: parsed.template.description ?? null,
      is_global: false,
      job_id: jobId,
    })
    .select("id")
    .single();

  if (tplErr) throw tplErr;

  const questionRows = normalized.map((q) => ({
    template_id: tpl.id,
    skill_id: matchSkillId(q.skill_name, skills),
    question: q.question,
    type: q.type,
    options: q.options,
    scale_min: q.scale_min,
    scale_max: q.scale_max,
    order_index: q.order_index,
  }));

  const { error: qErr } = await db.from("screening_questions").insert(questionRows);
  if (qErr) throw qErr;

  return { template_id: tpl.id, question_count: questionRows.length };
}
