import { getHrServiceClient } from "@/lib/supabase/server";
import { completeJson } from "@/lib/ai/client";
import {
  generatedScreeningSchema,
  normalizeGeneratedQuestion,
  type GeneratedScreening,
} from "@/lib/services/screeningSchemas";

export interface JobRow {
  id: string;
  title: string;
  description: string | null;
}

export interface SkillRow {
  id: string;
  name: string;
}

export async function fetchJobWithSkills(jobId: string): Promise<{
  job: JobRow;
  skills: SkillRow[];
}> {
  const db = getHrServiceClient();
  const { data: job, error: jobErr } = await db.from("jobs").select("id, title, description").eq("id", jobId).single();
  if (jobErr || !job) throw new Error(jobErr?.message || "Job not found");

  const { data: links, error: linkErr } = await db.from("job_skills").select("skill_id").eq("job_id", jobId);
  if (linkErr) throw new Error(linkErr.message);

  const skillIds = (links || []).map((r: { skill_id: string }) => r.skill_id).filter(Boolean);
  let skills: SkillRow[] = [];
  if (skillIds.length > 0) {
    const { data: sk, error: skErr } = await db.from("skills").select("id, name").in("id", skillIds);
    if (skErr) throw new Error(skErr.message);
    skills = (sk || []) as SkillRow[];
  }

  return { job: job as JobRow, skills };
}

function buildPrompt(job: JobRow, skills: SkillRow[]): string {
  const skillLines =
    skills.length > 0
      ? skills.map((s) => `- ${s.name} (skill_id: ${s.id})`).join("\n")
      : "(No skills linked to this job — create general role-relevant questions.)";

  return `You are an expert technical recruiter. Build a screening assessment for this job.

Job title: ${job.title}
Job description:
${job.description || "(none)"}

Linked skills (use skill_id on questions when a question clearly maps to one skill):
${skillLines}

Output JSON shape:
{
  "template": {
    "name": "short title for this test",
    "description": "1-2 sentences"
  },
  "questions": [
    {
      "skill_id": "uuid or null",
      "question": "clear question text",
      "type": "single" | "multi" | "text" | "scale",
      "options": [ { "text": "...", "is_correct": true/false } ],  // required for single/multi, omit for text/scale
      "scale_min": 1,   // only for scale
      "scale_max": 5    // only for scale
    }
  ]
}

Rules:
- 6–12 questions total, mixed types.
- For single/multi: 3–5 options, at least one is_correct true (can be multiple for multi).
- For scale: omit options; use scale_min/scale_max integers (e.g. 1–5 agreement).
- Keep language consistent with the job description (Polish if job text is Polish, else English).
- Questions must be fair, job-related, and non-discriminatory.`;
}

export async function generateScreeningPayload(job: JobRow, skills: SkillRow[]): Promise<GeneratedScreening> {
  const user = buildPrompt(job, skills);
  const system =
    "You output only JSON matching the user's schema. Never include PII. Never ask illegal interview questions.";

  const raw = await completeJson<unknown>({ system, user, temperature: 0.35 });
  const parsed = generatedScreeningSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((e) => e.message).join("; ");
    throw new Error(`AI output validation failed: ${msg}`);
  }
  return parsed.data;
}

export async function insertScreeningFromGeneration(params: {
  jobId: string;
  createdBy: string | null;
  data: GeneratedScreening;
}): Promise<{ template_id: string }> {
  const db = getHrServiceClient();
  const { template, questions } = params.data;

  const normalized = questions.map((q, i) => normalizeGeneratedQuestion(q, i));

  const { data: tpl, error: tplErr } = await db
    .from("screening_templates")
    .insert({
      name: template.name,
      description: template.description ?? null,
      is_global: false,
      job_id: params.jobId,
      created_by: params.createdBy,
    })
    .select("id")
    .single();

  if (tplErr || !tpl) throw new Error(tplErr?.message || "Failed to insert template");

  const templateId = tpl.id as string;
  const rows = normalized.map((q) => ({
    template_id: templateId,
    skill_id: q.skill_id,
    question: q.question,
    type: q.type,
    options: q.options,
    scale_min: q.scale_min,
    scale_max: q.scale_max,
    order_index: q.order_index,
  }));

  const { error: qErr } = await db.from("screening_questions").insert(rows);
  if (qErr) throw new Error(qErr.message);

  return { template_id: templateId };
}

export async function generateAndStoreScreening(jobId: string, createdBy: string | null) {
  const { job, skills } = await fetchJobWithSkills(jobId);
  const data = await generateScreeningPayload(job, skills);
  return insertScreeningFromGeneration({ jobId, createdBy, data });
}
