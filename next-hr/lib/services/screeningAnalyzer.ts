import { z } from "zod";
import { getHrServiceClient } from "@/lib/supabase/server";
import { completeJson } from "@/lib/ai/client";

const MOSCOW_WEIGHT: Record<string, number> = {
  must: 0.6,
  should: 0.3,
  could: 0.1,
  wont: 0,
};

const questionScoreEntrySchema = z.object({
  question_id: z.string().uuid(),
  score: z.number().min(0).max(5),
  reason: z.string().min(1).max(2000),
});

const skillScoreEntrySchema = z.object({
  skill_id: z.string().uuid(),
  score: z.number().min(0).max(100),
});

/** Accept spec shape + common aliases; normalize in parseLlmAnalysis. */
const llmAnalysisLooseSchema = z
  .object({
    ai_summary: z.string().max(8000).optional(),
    summary: z.string().max(8000).optional(),
    question_scores: z.array(questionScoreEntrySchema).optional(),
    skill_scores: z.array(skillScoreEntrySchema).optional(),
    overall_score: z.number().min(0).max(100).optional(),
    ai_overall: z.number().min(0).max(100).optional(),
    flags: z.array(z.string()).max(50).optional(),
    ai_flags: z.array(z.string()).max(50).optional(),
  })
  .passthrough();

type LlmAnalysisNormalized = {
  summary: string;
  question_scores: z.infer<typeof questionScoreEntrySchema>[];
  skill_scores: z.infer<typeof skillScoreEntrySchema>[];
  overall_score?: number;
  flags: string[];
};

function parseLlmAnalysis(raw: unknown): LlmAnalysisNormalized | null {
  const parsed = llmAnalysisLooseSchema.safeParse(raw);
  if (!parsed.success) {
    logAnalyzer("llm", "top-level validation failed", { issues: parsed.error.issues.slice(0, 6) });
    return null;
  }
  const o = parsed.data;
  const summary = (o.ai_summary ?? o.summary ?? "").trim();
  const qs = z.array(questionScoreEntrySchema).safeParse(o.question_scores ?? []);
  const question_scores = qs.success ? qs.data : [];
  if (!qs.success) {
    logAnalyzer("repair", "question_scores invalid, using heuristics for all", {
      issues: qs.error.issues.slice(0, 4),
    });
  }
  const ssParsed = z.array(skillScoreEntrySchema).safeParse(o.skill_scores ?? []);
  const skill_scores = ssParsed.success ? ssParsed.data : [];
  if (!ssParsed.success) {
    logAnalyzer("repair", "skill_scores dropped, will use deterministic", { issues: ssParsed.error.issues.slice(0, 3) });
  }
  const flagsRaw = o.flags ?? o.ai_flags ?? [];
  const flags = z.array(z.string()).max(50).safeParse(flagsRaw);
  const overall_score = o.overall_score ?? o.ai_overall;
  return {
    summary,
    question_scores,
    skill_scores,
    overall_score: overall_score !== undefined ? clampInt(overall_score, 0, 100) : undefined,
    flags: flags.success ? flags.data : [],
  };
}

export type ScreeningAnalysisResult = {
  ai_summary: string;
  ai_skill_scores: Record<string, number>;
  ai_overall: number;
  ai_flags: string[];
};

type QuestionRow = {
  id: string;
  skill_id: string | null;
  question: string;
  type: string;
  options: unknown;
  scale_min: number | null;
  scale_max: number | null;
};

type ResponseRow = {
  question_id: string;
  answer_text: string | null;
  answer_values: unknown;
};

function logAnalyzer(stage: string, message: string, extra?: Record<string, unknown>) {
  const payload = extra ? ` ${JSON.stringify(extra)}` : "";
  console.error(`[screeningAnalyzer] ${stage}: ${message}${payload}`);
}

function clampInt(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.round(Math.min(hi, Math.max(lo, n)));
}

function questionScoreToPercent(q: number): number {
  return clampInt((q / 5) * 100, 0, 100);
}

/** Mean of numbers; empty → 0 */
function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/**
 * Per-skill: average of question percent scores for questions tagged with that skill.
 */
function deterministicSkillScoresFromQuestions(
  questions: QuestionRow[],
  questionIdToScore: Map<string, number>
): Record<string, number> {
  const bySkill = new Map<string, number[]>();
  for (const q of questions) {
    if (!q.skill_id) continue;
    const s = questionIdToScore.get(q.id);
    if (s === undefined) continue;
    const pct = questionScoreToPercent(s);
    if (!bySkill.has(q.skill_id)) bySkill.set(q.skill_id, []);
    bySkill.get(q.skill_id)!.push(pct);
  }
  const out: Record<string, number> = {};
  for (const [skillId, arr] of bySkill) {
    out[skillId] = clampInt(mean(arr), 0, 100);
  }
  return out;
}

function buildJobSkillWeights(
  rows: { skill_id: string; moscow: string }[]
): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of rows) {
    const w = MOSCOW_WEIGHT[r.moscow?.toLowerCase?.() ?? ""] ?? 0.1;
    map.set(r.skill_id, w);
  }
  return map;
}

/** Normalize weights to sum to 1 over given skill ids (only positive weights). */
function normalizeWeightsForSkills(
  jobWeights: Map<string, number>,
  skillIds: Set<string>
): Map<string, number> {
  const out = new Map<string, number>();
  let sum = 0;
  for (const id of skillIds) {
    const w = jobWeights.get(id) ?? 0;
    if (w > 0) {
      out.set(id, w);
      sum += w;
    }
  }
  if (sum <= 0) return out;
  for (const [id, w] of out) {
    out.set(id, w / sum);
  }
  return out;
}

/** MoSCoW-weighted mean over skills that appear on the job and have a score. */
function moscowWeightedOverall(skillScores: Record<string, number>, jobWeights: Map<string, number>): number | null {
  const ids = Object.keys(skillScores).filter((id) => (jobWeights.get(id) ?? 0) > 0);
  if (ids.length === 0) return null;
  const norm = normalizeWeightsForSkills(jobWeights, new Set(ids));
  if (norm.size === 0) return null;
  let acc = 0;
  for (const [id, w] of norm) {
    const s = skillScores[id];
    if (s !== undefined) acc += w * s;
  }
  return clampInt(acc, 0, 100);
}

function mergeSkillScores(
  deterministic: Record<string, number>,
  aiBySkill: Record<string, number>
): Record<string, number> {
  const ids = new Set([...Object.keys(deterministic), ...Object.keys(aiBySkill)]);
  const out: Record<string, number> = {};
  for (const id of ids) {
    const d = deterministic[id];
    const a = aiBySkill[id];
    if (a !== undefined && Number.isFinite(a)) {
      out[id] = clampInt(a, 0, 100);
    } else if (d !== undefined) {
      out[id] = d;
    }
  }
  return out;
}

function heuristicQuestionScore(q: QuestionRow, r: ResponseRow | undefined): number {
  if (!r) return 0;
  if (q.type === "text") {
    const t = (r.answer_text || "").trim();
    if (t.length >= 120) return 4;
    if (t.length >= 40) return 3;
    if (t.length > 0) return 2;
    return 0;
  }
  if (q.type === "scale") {
    const v = typeof r.answer_values === "number" ? r.answer_values : Number(r.answer_values);
    if (!Number.isFinite(v)) return 2;
    const mn = q.scale_min ?? 1;
    const mx = q.scale_max ?? 5;
    if (mx <= mn) return 3;
    const t = (v - mn) / (mx - mn);
    return clampInt(t * 5, 0, 5);
  }
  if (q.type === "single" || q.type === "multi") {
    const av = r.answer_values;
    if (av === null || av === undefined) return 0;
    if (Array.isArray(av) && av.length === 0) return 0;
    return 3;
  }
  return 2;
}

function buildHeuristicScores(questions: QuestionRow[], responses: ResponseRow[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const q of questions) {
    const r = responses.find((x) => x.question_id === q.id);
    m.set(q.id, heuristicQuestionScore(q, r));
  }
  return m;
}

function llmPayloadCompact(params: {
  jobTitle: string;
  jobDescription: string | null;
  skills: { id: string; name: string }[];
  jobSkills: { skill_id: string; moscow: string }[];
  qa: { question_id: string; skill_id: string | null; type: string; text: string; answer: unknown }[];
}) {
  return JSON.stringify({
    job: { title: params.jobTitle, description: params.jobDescription },
    skills: params.skills,
    job_skill_moscow: params.jobSkills,
    qa: params.qa,
  });
}

async function callLlmAnalysis(userPayload: string): Promise<LlmAnalysisNormalized | null> {
  const system = `You evaluate screening answers. Return ONE JSON object exactly in this shape:
{
  "ai_summary": "2-6 sentence recruiter narrative",
  "question_scores": [ { "question_id": "<uuid from qa>", "score": 0-5, "reason": "brief" } ],
  "skill_scores": [ { "skill_id": "<uuid>", "score": 0-100 } ],
  "overall_score": 0-100,
  "flags": ["short label", ...]
}
Rules: Include every qa item in question_scores. skill_scores: one row per skill_id that appears in qa (or job skills you can infer). MoSCoW in payload weights must/should/could — align skill_scores with question evidence. Scoring: 0=missing/poor, 3=ok, 5=excellent. Integers only.`;

  try {
    const raw = await completeJson<unknown>({
      system,
      user: userPayload,
      temperature: 0.15,
    });
    return parseLlmAnalysis(raw);
  } catch (e) {
    logAnalyzer("llm", e instanceof Error ? e.message : "unknown error");
    return null;
  }
}

/**
 * Repair partial LLM question_scores: fill missing questions from heuristic, clamp scores.
 */
function buildQuestionScoreMap(
  questions: QuestionRow[],
  responses: ResponseRow[],
  llmQs: z.infer<typeof questionScoreEntrySchema>[] | null
): Map<string, number> {
  const heuristic = buildHeuristicScores(questions, responses);
  const fromLlm = new Map<string, { score: number; reason?: string }>();
  if (llmQs) {
    for (const e of llmQs) {
      fromLlm.set(e.question_id, { score: clampInt(e.score, 0, 5) });
    }
  }
  const out = new Map<string, number>();
  for (const q of questions) {
    const l = fromLlm.get(q.id);
    if (l !== undefined) {
      out.set(q.id, l.score);
    } else {
      logAnalyzer("repair", "missing question_score, using heuristic", { question_id: q.id });
      out.set(q.id, heuristic.get(q.id) ?? 2);
    }
  }
  return out;
}

function aiSkillArrayToRecord(arr: { skill_id: string; score: number }[]): Record<string, number> {
  const o: Record<string, number> = {};
  for (const x of arr) {
    o[x.skill_id] = clampInt(x.score, 0, 100);
  }
  return o;
}

export async function runScreeningAnalysis(invitationId: string): Promise<ScreeningAnalysisResult> {
  const db = getHrServiceClient();

  const { data: inv, error: invErr } = await db
    .from("screening_invitations")
    .select("id, application_id, template_id")
    .eq("id", invitationId)
    .single();
  if (invErr || !inv) throw new Error(invErr?.message || "Invitation not found");

  const { data: app, error: appErr } = await db
    .from("applications")
    .select("first_name, last_name, job_id")
    .eq("id", inv.application_id)
    .single();
  if (appErr || !app?.job_id) throw new Error(appErr?.message || "Application/job not found");

  const { data: job } = await db
    .from("jobs")
    .select("title, description")
    .eq("id", app.job_id)
    .single();

  const { data: jobSkillRows, error: jsErr } = await db
    .from("job_skills")
    .select("skill_id, moscow")
    .eq("job_id", app.job_id);
  if (jsErr) logAnalyzer("db", "job_skills fetch error", { message: jsErr.message });

  const jobWeights = buildJobSkillWeights((jobSkillRows || []) as { skill_id: string; moscow: string }[]);

  const { data: questions, error: qErr } = await db
    .from("screening_questions")
    .select("id, question, type, options, scale_min, scale_max, skill_id")
    .eq("template_id", inv.template_id)
    .order("order_index");
  if (qErr) throw new Error(qErr.message);
  const qList = (questions || []) as QuestionRow[];

  const skillIdsOnJob = new Set((jobSkillRows || []).map((r: { skill_id: string }) => r.skill_id));
  const skillIdsOnQuestions = new Set(
    qList.map((row) => row.skill_id).filter((id): id is string => Boolean(id))
  );
  const allSkillIds = new Set([...skillIdsOnJob, ...skillIdsOnQuestions]);
  const { data: skillRows } =
    allSkillIds.size > 0
      ? await db.from("skills").select("id, name").in("id", [...allSkillIds])
      : { data: [] as { id: string; name: string }[] };
  const skillsList = (skillRows || []) as { id: string; name: string }[];

  const { data: responses, error: rErr } = await db
    .from("screening_responses")
    .select("question_id, answer_text, answer_values")
    .eq("invitation_id", invitationId);
  if (rErr) throw new Error(rErr.message);
  const rList = (responses || []) as ResponseRow[];

  const qa = qList.map((q) => {
    const resp = rList.find((r) => r.question_id === q.id);
    let answer: unknown = null;
    if (resp) {
      answer =
        q.type === "text"
          ? resp.answer_text
          : resp.answer_values !== undefined
            ? resp.answer_values
            : resp.answer_text;
    }
    return {
      question_id: q.id,
      skill_id: q.skill_id,
      type: q.type,
      text: q.question,
      answer,
    };
  });

  const userPayload = llmPayloadCompact({
    jobTitle: job?.title || "Role",
    jobDescription: job?.description ?? null,
    skills: skillsList,
    jobSkills: (jobSkillRows || []) as { skill_id: string; moscow: string }[],
    qa,
  });

  const llm = await callLlmAnalysis(userPayload);

  const questionScoreMap = buildQuestionScoreMap(qList, rList, llm?.question_scores ?? null);

  const detSkills = deterministicSkillScoresFromQuestions(qList, questionScoreMap);
  const allQuestionPcts = qList.map((q) => questionScoreToPercent(questionScoreMap.get(q.id) ?? 0));
  const detOverallFromQuestions = allQuestionPcts.length ? clampInt(mean(allQuestionPcts), 0, 100) : 0;

  const aiSkills = llm && llm.skill_scores.length > 0 ? aiSkillArrayToRecord(llm.skill_scores) : {};
  const mergedSkills = mergeSkillScores(detSkills, aiSkills);

  const moscowOverall = moscowWeightedOverall(mergedSkills, jobWeights);
  let overall =
    moscowOverall !== null ? moscowOverall : detOverallFromQuestions;

  if (llm?.overall_score !== undefined) {
    const aiO = llm.overall_score;
    overall = clampInt(Math.round(0.5 * overall + 0.5 * aiO), 0, 100);
  }

  const hasSkillTaggedQuestions = qList.some((q) => q.skill_id);
  const flags = Array.from(
    new Set([
      ...(llm?.flags ?? []),
      ...(!hasSkillTaggedQuestions ? ["no skill-tagged questions"] : []),
    ])
  ).slice(0, 30);

  const summary =
    llm?.summary ||
    `Screening completed. Overall score ${overall}/100 based on ${qList.length} questions.`;

  return {
    ai_summary: summary,
    ai_skill_scores: mergedSkills,
    ai_overall: overall,
    ai_flags: flags,
  };
}

export async function upsertAnalysisRow(invitationId: string, result: ScreeningAnalysisResult) {
  const db = getHrServiceClient();
  const { data: existing } = await db
    .from("screening_ai_analysis")
    .select("id")
    .eq("invitation_id", invitationId)
    .maybeSingle();

  const row = {
    invitation_id: invitationId,
    ai_summary: result.ai_summary,
    ai_skill_scores: result.ai_skill_scores,
    ai_overall: result.ai_overall,
    ai_flags: result.ai_flags,
    status: "pending" as const,
  };

  if (existing?.id) {
    const { error } = await db.from("screening_ai_analysis").update(row).eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await db.from("screening_ai_analysis").insert(row);
    if (error) throw new Error(error.message);
  }
}
