import { createHash, randomBytes } from "crypto";
import { getHrServiceClient } from "@/lib/supabase/server";
import { completeJson } from "@/lib/ai/client";
import { getPublicSiteUrl } from "@/lib/env";
import {
  generatedScreeningSchema,
  normalizeGeneratedQuestion,
  type GeneratedScreening,
} from "@/lib/services/screeningSchemas";

const ACTIVE_INVITATION_STATUSES = ["pending", "started"] as const;

type Moscow = "must" | "should" | "could" | "wont";

export interface JobRow {
  id: string;
  title: string;
  description: string | null;
}

export interface SkillRow {
  id: string;
  name: string;
  moscow: Moscow;
}

type SkillLinkRow = {
  skill_id: string;
  moscow: Moscow | null;
  skills: { id: string; name: string } | null;
};

function normalizeMoscow(value: string | null | undefined): Moscow {
  const normalized = (value || "").toLowerCase();
  if (normalized === "must" || normalized === "should" || normalized === "could" || normalized === "wont") {
    return normalized;
  }
  return "should";
}

function computeTemplateSignature(jobId: string, skills: SkillRow[]): string {
  const normalized = [...skills]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((skill) => `${skill.id}:${normalizeMoscow(skill.moscow)}`)
    .join("|");
  return createHash("sha256").update(`${jobId}::${normalized}`).digest("hex");
}

function buildPrompt(job: JobRow, skills: SkillRow[]): string {
  const byPriority = {
    must: skills.filter((s) => s.moscow === "must"),
    should: skills.filter((s) => s.moscow === "should"),
    could: skills.filter((s) => s.moscow === "could"),
    wont: skills.filter((s) => s.moscow === "wont"),
  };

  const formatSkills = (rows: SkillRow[]) => rows.map((s) => `- ${s.name} (skill_id: ${s.id})`).join("\n") || "- none";

  return `You are an expert technical recruiter. Create a reusable screening assessment template.

Job title: ${job.title}
Job description:
${job.description || "(none)"}

MOSCOW priorities:
MUST:
${formatSkills(byPriority.must)}
SHOULD:
${formatSkills(byPriority.should)}
COULD:
${formatSkills(byPriority.could)}
WON'T:
${formatSkills(byPriority.wont)}

Output JSON shape:
{
  "template": {
    "name": "short screening template title",
    "description": "1-2 sentences"
  },
  "questions": [
    {
      "skill_id": "uuid or null",
      "question": "clear question text",
      "type": "single" | "multi" | "text" | "scale",
      "options": [
        { "text": "...", "is_correct": true }
      ],
      "scale_min": 1,
      "scale_max": 5
    }
  ]
}

Rules:
- Generate at least 3 clear sections in the flow (technical depth, behavior, and situational/crisis).
- Produce 8-14 questions total.
- Mix question types: include text, single, multi, and scale.
- Map each question to one skill_id when possible.
- MUST skills should appear most often, SHOULD medium, COULD less often.
- For single/multi use 3-5 options and at least one correct option.
- For scale omit options, keep integer bounds (typically 1-5).
- Keep language aligned with the job description language.
- Questions must be legal, fair, job-related, and non-discriminatory.`;
}

async function generateScreeningPayload(job: JobRow, skills: SkillRow[]): Promise<GeneratedScreening> {
  const system = "You output only JSON matching the requested schema. Never include markdown.";
  const user = buildPrompt(job, skills);

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const raw = await completeJson<unknown>({ system, user, temperature: 0.3 });
      const parsed = generatedScreeningSchema.safeParse(raw);
      if (!parsed.success) {
        const msg = parsed.error.issues.map((e) => e.message).join("; ");
        throw new Error(`AI output validation failed: ${msg}`);
      }
      return parsed.data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown LLM error");
    }
  }

  throw new Error(`Failed to generate screening payload: ${lastError?.message || "unknown error"}`);
}

async function fetchApplicationWithJob(applicationId: string): Promise<{ id: string; job_id: string }> {
  const db = getHrServiceClient();
  const { data, error } = await db.from("applications").select("id, job_id").eq("id", applicationId).single();
  if (error || !data) throw new Error(error?.message || "Application not found");
  if (!data.job_id) throw new Error("Application has no job_id");
  return data as { id: string; job_id: string };
}

async function fetchJobWithSkills(jobId: string): Promise<{ job: JobRow; skills: SkillRow[] }> {
  const db = getHrServiceClient();
  const { data: job, error: jobErr } = await db.from("jobs").select("id, title, description").eq("id", jobId).single();
  if (jobErr || !job) throw new Error(jobErr?.message || "Job not found");

  const { data: links, error: linkErr } = await db
    .from("job_skills")
    .select("skill_id, moscow, skills:skills!inner(id, name)")
    .eq("job_id", jobId);

  if (linkErr) throw new Error(linkErr.message);

  const mapped: SkillRow[] = ((links || []) as SkillLinkRow[])
    .filter((row) => row.skill_id && row.skills?.id && row.skills?.name)
    .map((row) => ({
      id: row.skills!.id,
      name: row.skills!.name,
      moscow: normalizeMoscow(row.moscow),
    }));

  if (mapped.length === 0) {
    throw new Error("No job_skills configured for this job");
  }

  return { job: job as JobRow, skills: mapped };
}

let _metadataColumnAvailable: boolean | null = null;

async function hasTemplateMetadataColumn(): Promise<boolean> {
  if (_metadataColumnAvailable !== null) return _metadataColumnAvailable;
  const db = getHrServiceClient();
  const { error } = await db.from("screening_templates").select("id, metadata").limit(1);
  _metadataColumnAvailable = !error;
  return _metadataColumnAvailable;
}

async function findExistingTemplateBySignature(jobId: string, signature: string): Promise<string | null> {
  const db = getHrServiceClient();

  if (await hasTemplateMetadataColumn()) {
    const { data, error } = await db
      .from("screening_templates")
      .select("id")
      .eq("job_id", jobId)
      .eq("metadata->>signature", signature)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data?.id) return data.id as string;
  }

  // Fallback for environments without metadata column.
  const { data: templates, error } = await db
    .from("screening_templates")
    .select("id, name")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);

  const marker = `[sig:${signature}]`;
  const existing = (templates || []).find((tpl) => typeof tpl.name === "string" && tpl.name.includes(marker));
  return existing?.id ?? null;
}

async function insertTemplateWithQuestions(params: {
  jobId: string;
  signature: string;
  createdBy: string | null;
  generated: GeneratedScreening;
}): Promise<string> {
  const db = getHrServiceClient();
  const normalizedQuestions = params.generated.questions.map((q, idx) => normalizeGeneratedQuestion(q, idx));
  const usesMetadata = await hasTemplateMetadataColumn();

  const signatureMarker = `[sig:${params.signature}]`;
  const templateName = usesMetadata
    ? params.generated.template.name.trim()
    : `${params.generated.template.name.trim()} ${signatureMarker}`.slice(0, 180);

  const insertTemplate: Record<string, unknown> = {
    name: templateName,
    description: params.generated.template.description ?? null,
    is_global: false,
    job_id: params.jobId,
    created_by: params.createdBy,
  };

  if (usesMetadata) {
    insertTemplate.metadata = { signature: params.signature, generator: "ai", version: 1 };
  }

  const { data: template, error: templateError } = await db
    .from("screening_templates")
    .insert(insertTemplate)
    .select("id")
    .single();

  if (templateError || !template) {
    throw new Error(templateError?.message || "Failed to insert screening template");
  }

  const templateId = template.id as string;
  const questionRows = normalizedQuestions.map((q) => ({
    template_id: templateId,
    skill_id: q.skill_id,
    question: q.question,
    type: q.type,
    options: q.options,
    scale_min: q.scale_min,
    scale_max: q.scale_max,
    order_index: q.order_index,
  }));

  const { error: qErr } = await db.from("screening_questions").insert(questionRows);
  if (qErr) {
    await db.from("screening_templates").delete().eq("id", templateId);
    throw new Error(`Failed to insert screening questions: ${qErr.message}`);
  }

  return templateId;
}

async function generateUniqueInvitationToken(): Promise<string> {
  const db = getHrServiceClient();

  for (let i = 0; i < 5; i += 1) {
    const token = randomBytes(24).toString("hex");
    const { data, error } = await db.from("screening_invitations").select("id").eq("token", token).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return token;
  }

  throw new Error("Failed to generate a unique invitation token");
}

async function createOrReuseInvitation(applicationId: string, templateId: string) {
  const db = getHrServiceClient();

  const { data: existing, error: existingErr } = await db
    .from("screening_invitations")
    .select("id, token, status")
    .eq("application_id", applicationId)
    .in("status", [...ACTIVE_INVITATION_STATUSES])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingErr) throw new Error(existingErr.message);

  if (existing?.id && existing.token) {
    return {
      invitation_id: existing.id as string,
      token: existing.token as string,
      reused: true,
    };
  }

  const token = await generateUniqueInvitationToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { data: invitation, error } = await db
    .from("screening_invitations")
    .insert({
      application_id: applicationId,
      template_id: templateId,
      token,
      status: "pending",
      sent_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .select("id, token")
    .single();

  if (error || !invitation) throw new Error(error?.message || "Failed to create invitation");

  return {
    invitation_id: invitation.id as string,
    token: invitation.token as string,
    reused: false,
  };
}

export async function generateScreeningForApplication(applicationId: string, createdBy: string | null) {
  const application = await fetchApplicationWithJob(applicationId);
  const { job, skills } = await fetchJobWithSkills(application.job_id);
  const signature = computeTemplateSignature(job.id, skills);

  let templateId = await findExistingTemplateBySignature(job.id, signature);
  let templateReused = true;

  if (!templateId) {
    const generated = await generateScreeningPayload(job, skills);
    templateId = await insertTemplateWithQuestions({
      jobId: job.id,
      signature,
      createdBy,
      generated,
    });
    templateReused = false;
  }

  const invitation = await createOrReuseInvitation(application.id, templateId);
  const url = `${getPublicSiteUrl()}/screening/${invitation.token}`;

  return {
    template_id: templateId,
    invitation_id: invitation.invitation_id,
    token: invitation.token,
    url,
    template_reused: templateReused,
    invitation_reused: invitation.reused,
    signature,
  };
}

// Backward-compatible API used by existing UI actions.
export async function generateAndStoreScreening(jobId: string, createdBy: string | null) {
  const { job, skills } = await fetchJobWithSkills(jobId);
  const signature = computeTemplateSignature(job.id, skills);

  const existingTemplateId = await findExistingTemplateBySignature(job.id, signature);
  if (existingTemplateId) {
    return { template_id: existingTemplateId, template_reused: true, signature };
  }

  const generated = await generateScreeningPayload(job, skills);
  const templateId = await insertTemplateWithQuestions({
    jobId,
    signature,
    createdBy,
    generated,
  });

  return { template_id: templateId, template_reused: false, signature };
}
