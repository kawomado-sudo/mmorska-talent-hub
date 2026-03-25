import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { hrApi } from '@/lib/hr-api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Plus,
  Trash2,
  ClipboardList,
  Globe,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

interface SkillCategory {
  id: string;
  name: string;
  color: string;
}

interface Skill {
  id: string;
  category_id: string;
  name: string;
}

interface ScreeningTemplate {
  id: string;
  name: string;
  description: string | null;
  is_global: boolean;
  job_id: string | null;
  created_by: string | null;
  created_at: string;
  question_count?: number;
}

interface ScreeningInvitationRow {
  id: string;
  token: string;
  status: 'pending' | 'started' | 'completed' | 'expired';
  template_id: string | null;
}

interface ScreeningCandidateRow {
  application_id: string;
  candidate_name: string;
  job_title: string;
  status: string;
  invitation: ScreeningInvitationRow | null;
}

interface ScreeningCandidateSourceRow {
  application_id: string;
  candidate_name: string;
  job_title: string;
  status: string;
  invitation: ScreeningInvitationRow | null;
}

interface ScreeningQuestionRow {
  id: string;
  skill_id: string | null;
  question: string;
  type: QuestionType;
  options: QuestionOption[] | null;
  scale_min: number | null;
  scale_max: number | null;
  order_index: number;
}

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

type QuestionType = 'single' | 'multi' | 'text' | 'scale';

interface QuestionOption {
  text: string;
  is_correct: boolean;
}

interface LocalQuestion {
  localId: string; // for local state before save
  id?: string;     // db id if already saved
  skill_id: string | null;
  question: string;
  type: QuestionType;
  options: QuestionOption[];
  scale_min: number;
  scale_max: number;
  order_index: number;
  expanded: boolean;
}

const typeLabels: Record<QuestionType, string> = {
  single: 'Jednokrotny wybór',
  multi: 'Wielokrotny wybór',
  text: 'Odpowiedź tekstowa',
  scale: 'Skala',
};

function newLocalQuestion(order_index: number): LocalQuestion {
  return {
    localId: crypto.randomUUID(),
    skill_id: null,
    question: '',
    type: 'single',
    options: [
      { text: '', is_correct: false },
      { text: '', is_correct: false },
    ],
    scale_min: 1,
    scale_max: 5,
    order_index,
    expanded: true,
  };
}

export default function Screening() {
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ScreeningTemplate | null>(null);

  // Template form state
  const [tplName, setTplName] = useState('');
  const [tplDescription, setTplDescription] = useState('');
  const [tplIsGlobal, setTplIsGlobal] = useState(true);
  const [questions, setQuestions] = useState<LocalQuestion[]>([]);
  const [saving, setSaving] = useState(false);

  // Fetch candidates currently in screening stage + invitation metadata
  const {
    data: screeningCandidates = [],
    isLoading: screeningCandidatesLoading,
    isError: screeningCandidatesError,
    error: screeningCandidatesErrorDetails,
  } = useQuery({
    queryKey: ['screening_candidates'],
    queryFn: async () => {
      const data = await hrApi<ScreeningCandidateSourceRow[]>('list_screening_candidates');
      const normalized = (data || []).map((row) => ({
        application_id: row.application_id,
        candidate_name: row.candidate_name || 'Nieznany kandydat',
        job_title: row.job_title || 'Brak stanowiska',
        status: row.status || 'unknown',
        invitation: row.invitation
          ? {
              id: row.invitation.id,
              token: row.invitation.token,
              status: row.invitation.status,
              template_id: row.invitation.template_id,
            }
          : null,
      })) as ScreeningCandidateRow[];

      console.debug('[screening] candidates with invitations', normalized);
      return normalized;
    },
  });

  const generateTestMutation = useMutation({
    mutationFn: async ({ applicationId }: { applicationId: string }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Brak aktywnej sesji użytkownika');

      const response = await fetch('/api/hr/screening/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          application_id: applicationId,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Nie udało się wygenerować testu');
      }

      return payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screening_candidates'] });
      toast.success('Test został wygenerowany');
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, 'Nie udało się wygenerować testu'));
    },
  });

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['screening_templates'],
    queryFn: async () => {
      const { data: tpls, error } = await supabase
        .from('screening_templates')
        .select('id, name, description, is_global, job_id, created_by, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Count questions per template
      const { data: qCounts } = await supabase
        .from('screening_questions')
        .select('template_id');

      const countMap: Record<string, number> = {};
      (qCounts || []).forEach((q: { template_id: string }) => {
        countMap[q.template_id] = (countMap[q.template_id] || 0) + 1;
      });

      return (tpls as ScreeningTemplate[]).map((t) => ({
        ...t,
        question_count: countMap[t.id] || 0,
      }));
    },
  });

  // Fetch skills for selector
  const { data: skills = [] } = useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skills')
        .select('id, category_id, name')
        .order('name');
      if (error) throw error;
      return data as Skill[];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['skill_categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skill_categories')
        .select('id, name, color')
        .order('name');
      if (error) throw error;
      return data as SkillCategory[];
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('screening_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screening_templates'] });
      toast.success('Szablon usunięty');
    },
    onError: () => toast.error('Nie udało się usunąć szablonu'),
  });

  const openNew = () => {
    setEditingTemplate(null);
    setTplName('');
    setTplDescription('');
    setTplIsGlobal(true);
    setQuestions([newLocalQuestion(0)]);
    setSheetOpen(true);
  };

  const openEdit = async (tpl: ScreeningTemplate) => {
    setEditingTemplate(tpl);
    setTplName(tpl.name);
    setTplDescription(tpl.description || '');
    setTplIsGlobal(tpl.is_global);

    // Load existing questions
    const { data, error } = await supabase
      .from('screening_questions')
      .select('id, skill_id, question, type, options, scale_min, scale_max, order_index')
      .eq('template_id', tpl.id)
      .order('order_index');

    if (error) {
      toast.error('Nie udało się załadować pytań');
      return;
    }

    const loaded: LocalQuestion[] = ((data || []) as ScreeningQuestionRow[]).map((q) => ({
      localId: crypto.randomUUID(),
      id: q.id,
      skill_id: q.skill_id,
      question: q.question,
      type: q.type as QuestionType,
      options: Array.isArray(q.options) ? q.options : [],
      scale_min: q.scale_min ?? 1,
      scale_max: q.scale_max ?? 5,
      order_index: q.order_index,
      expanded: false,
    }));

    setQuestions(loaded.length > 0 ? loaded : [newLocalQuestion(0)]);
    setSheetOpen(true);
  };

  const handleSave = async () => {
    if (!tplName.trim()) {
      toast.error('Podaj nazwę szablonu');
      return;
    }

    setSaving(true);
    try {
      let templateId: string;

      if (editingTemplate) {
        const { error } = await supabase
          .from('screening_templates')
          .update({
            name: tplName.trim(),
            description: tplDescription.trim() || null,
            is_global: tplIsGlobal,
          })
          .eq('id', editingTemplate.id);
        if (error) throw error;
        templateId = editingTemplate.id;

        // Delete all existing questions and re-insert
        await supabase
          .from('screening_questions')
          .delete()
          .eq('template_id', templateId);
      } else {
        const { data, error } = await supabase
          .from('screening_templates')
          .insert({
            name: tplName.trim(),
            description: tplDescription.trim() || null,
            is_global: tplIsGlobal,
            job_id: null,
          })
          .select('id')
          .single();
        if (error) throw error;
        templateId = data.id;
      }

      // Insert questions
      const validQuestions = questions.filter((q) => q.question.trim());
      if (validQuestions.length > 0) {
        const rows = validQuestions.map((q, idx) => ({
          template_id: templateId,
          skill_id: q.skill_id || null,
          question: q.question.trim(),
          type: q.type,
          options:
            q.type === 'single' || q.type === 'multi'
              ? q.options.filter((o) => o.text.trim())
              : null,
          scale_min: q.type === 'scale' ? q.scale_min : null,
          scale_max: q.type === 'scale' ? q.scale_max : null,
          order_index: idx,
        }));

        const { error: qError } = await supabase
          .from('screening_questions')
          .insert(rows);
        if (qError) throw qError;
      }

      queryClient.invalidateQueries({ queryKey: ['screening_templates'] });
      toast.success(editingTemplate ? 'Szablon zaktualizowany' : 'Szablon utworzony');
      setSheetOpen(false);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Nie udało się zapisać szablonu'));
    } finally {
      setSaving(false);
    }
  };

  // Question helpers
  const updateQuestion = (localId: string, patch: Partial<LocalQuestion>) => {
    setQuestions((prev) =>
      prev.map((q) => (q.localId === localId ? { ...q, ...patch } : q))
    );
  };

  const removeQuestion = (localId: string) => {
    setQuestions((prev) => prev.filter((q) => q.localId !== localId));
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, newLocalQuestion(prev.length)]);
  };

  const updateOption = (localId: string, optIdx: number, text: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.localId !== localId) return q;
        const opts = [...q.options];
        opts[optIdx] = { ...opts[optIdx], text };
        return { ...q, options: opts };
      })
    );
  };

  const toggleCorrect = (localId: string, optIdx: number, type: QuestionType) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.localId !== localId) return q;
        const opts = q.options.map((o, i) => {
          if (type === 'single') {
            return { ...o, is_correct: i === optIdx };
          }
          return i === optIdx ? { ...o, is_correct: !o.is_correct } : o;
        });
        return { ...q, options: opts };
      })
    );
  };

  const addOption = (localId: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.localId !== localId) return q;
        return { ...q, options: [...q.options, { text: '', is_correct: false }] };
      })
    );
  };

  const removeOption = (localId: string, optIdx: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.localId !== localId) return q;
        const opts = q.options.filter((_, i) => i !== optIdx);
        return { ...q, options: opts };
      })
    );
  };

  const getCategoryColor = (skillId: string | null) => {
    if (!skillId) return undefined;
    const skill = skills.find((s) => s.id === skillId);
    if (!skill) return undefined;
    const cat = categories.find((c) => c.id === skill.category_id);
    return cat?.color;
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Szablony Testów Screeningowych</h1>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nowy szablon
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Kandydaci w etapie screening_test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {screeningCandidatesLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Ładowanie kandydatów i zaproszeń...
            </div>
          ) : screeningCandidatesError ? (
            <div className="space-y-2 text-sm">
              <p className="text-destructive font-medium">
                Nie udało się pobrać kandydatów screeningowych.
              </p>
              <p className="text-muted-foreground break-all">
                {getErrorMessage(
                  screeningCandidatesErrorDetails,
                  'Błąd pobierania danych'
                )}
              </p>
            </div>
          ) : screeningCandidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Brak kandydatów ze statusem <code>screening_test</code>.
            </p>
          ) : (
            <div className="space-y-2">
              {screeningCandidates.map((candidate) => {
                const hasInvitation = Boolean(candidate.invitation?.token);
                const invitationLink = hasInvitation
                  ? `${window.location.origin}/screening/${candidate.invitation!.token}`
                  : null;

                return (
                  <div
                    key={candidate.application_id}
                    className="rounded-md border border-border p-3"
                  >
                    <div className="grid gap-2 md:grid-cols-[1.2fr_1fr_0.8fr_0.9fr_auto] md:items-center">
                      <div>
                        <p className="text-sm font-medium">{candidate.candidate_name}</p>
                        <p className="text-xs text-muted-foreground">{candidate.job_title}</p>
                      </div>

                      <div>
                        <Badge variant="outline">{candidate.status}</Badge>
                      </div>

                      <div>
                        <Badge variant={hasInvitation ? 'secondary' : 'outline'}>
                          {candidate.invitation?.status || 'brak zaproszenia'}
                        </Badge>
                      </div>

                      <div className="min-w-0">
                        {hasInvitation ? (
                          <p className="truncate text-xs text-muted-foreground">
                            Token: {candidate.invitation?.token}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">Token: —</p>
                        )}
                      </div>

                      <div className="flex justify-end gap-2">
                        {hasInvitation ? (
                          <>
                            <Button asChild size="sm" variant="outline">
                              <Link to={`/screening/${candidate.invitation!.token}`}>
                                Otwórz test
                              </Link>
                            </Button>
                            <Button asChild size="sm" variant="ghost">
                              <a href={invitationLink!} target="_blank" rel="noreferrer">
                                <ExternalLink className="mr-1 h-3.5 w-3.5" />
                                Link
                              </a>
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() =>
                              generateTestMutation.mutate({
                                applicationId: candidate.application_id,
                              })
                            }
                            disabled={generateTestMutation.isPending}
                          >
                            {generateTestMutation.isPending ? (
                              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                            ) : null}
                            Generuj test
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-muted-foreground">Ładowanie...</div>
      ) : templates.length === 0 ? (
        <div className="text-center text-muted-foreground py-16">
          Brak szablonów. Utwórz pierwszy szablon testu screeningowego.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((tpl) => (
            <Card
              key={tpl.id}
              className="cursor-pointer transition-colors hover:border-primary/40"
              onClick={() => openEdit(tpl)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">{tpl.name}</CardTitle>
                  {tpl.is_global && (
                    <Badge variant="outline" className="flex-shrink-0 text-xs gap-1">
                      <Globe className="h-3 w-3" />
                      Globalny
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pb-3">
                {tpl.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {tpl.description}
                  </p>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ClipboardList className="h-3.5 w-3.5" />
                  {tpl.question_count}{' '}
                  {tpl.question_count === 1 ? 'pytanie' : 'pytań'}
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Usunąć szablon?')) {
                        deleteTemplateMutation.mutate(tpl.id);
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Template editor Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
            <SheetTitle>
              {editingTemplate ? 'Edytuj szablon' : 'Nowy szablon'}
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-8rem)]">
            <div className="px-6 py-4 space-y-6">
              {/* Template basic info */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Nazwa szablonu</Label>
                  <Input
                    value={tplName}
                    onChange={(e) => setTplName(e.target.value)}
                    placeholder="np. Test techniczny Frontend"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Opis (opcjonalnie)</Label>
                  <Textarea
                    value={tplDescription}
                    onChange={(e) => setTplDescription(e.target.value)}
                    placeholder="Krótki opis testu..."
                    rows={2}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={tplIsGlobal}
                    onCheckedChange={setTplIsGlobal}
                    id="is-global"
                  />
                  <Label htmlFor="is-global" className="cursor-pointer">
                    Szablon globalny (dostępny dla wszystkich ogłoszeń)
                  </Label>
                </div>
              </div>

              <Separator />

              {/* Questions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">
                    Pytania ({questions.length})
                  </h3>
                  <Button variant="outline" size="sm" onClick={addQuestion}>
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Dodaj pytanie
                  </Button>
                </div>

                {questions.map((q, qIdx) => (
                  <div
                    key={q.localId}
                    className="rounded-lg border border-border bg-card"
                  >
                    {/* Question header */}
                    <div
                      className="flex items-center gap-2 px-4 py-3 cursor-pointer"
                      onClick={() =>
                        updateQuestion(q.localId, { expanded: !q.expanded })
                      }
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs text-muted-foreground flex-shrink-0 w-5">
                        {qIdx + 1}.
                      </span>
                      <span className="text-sm flex-1 truncate">
                        {q.question || (
                          <span className="text-muted-foreground italic">
                            Nowe pytanie
                          </span>
                        )}
                      </span>
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        {typeLabels[q.type]}
                      </Badge>
                      {q.expanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>

                    {q.expanded && (
                      <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                        {/* Type + Skill */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Typ pytania</Label>
                            <Select
                              value={q.type}
                              onValueChange={(val) =>
                                updateQuestion(q.localId, {
                                  type: val as QuestionType,
                                  options:
                                    val === 'single' || val === 'multi'
                                      ? q.options.length > 0
                                        ? q.options
                                        : [
                                            { text: '', is_correct: false },
                                            { text: '', is_correct: false },
                                          ]
                                      : [],
                                })
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(typeLabels).map(([v, l]) => (
                                  <SelectItem key={v} value={v}>
                                    {l}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Skill (opcjonalnie)</Label>
                            <Select
                              value={q.skill_id || 'none'}
                              onValueChange={(val) =>
                                updateQuestion(q.localId, {
                                  skill_id: val === 'none' ? null : val,
                                })
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Brak" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Brak</SelectItem>
                                {skills.map((s) => {
                                  const color = getCategoryColor(s.id);
                                  return (
                                    <SelectItem key={s.id} value={s.id}>
                                      <span className="flex items-center gap-1.5">
                                        {color && (
                                          <span
                                            className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: color }}
                                          />
                                        )}
                                        {s.name}
                                      </span>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Question text */}
                        <div className="space-y-1.5">
                          <Label className="text-xs">Treść pytania</Label>
                          <Textarea
                            value={q.question}
                            onChange={(e) =>
                              updateQuestion(q.localId, { question: e.target.value })
                            }
                            placeholder="Wpisz pytanie..."
                            rows={2}
                            className="text-sm"
                          />
                        </div>

                        {/* Options for single/multi */}
                        {(q.type === 'single' || q.type === 'multi') && (
                          <div className="space-y-2">
                            <Label className="text-xs">
                              Opcje odpowiedzi{' '}
                              <span className="text-muted-foreground">
                                (zaznacz poprawne)
                              </span>
                            </Label>
                            {q.options.map((opt, oIdx) => (
                              <div key={oIdx} className="flex items-center gap-2">
                                <Checkbox
                                  checked={opt.is_correct}
                                  onCheckedChange={() =>
                                    toggleCorrect(q.localId, oIdx, q.type)
                                  }
                                  className="flex-shrink-0"
                                />
                                <Input
                                  value={opt.text}
                                  onChange={(e) =>
                                    updateOption(q.localId, oIdx, e.target.value)
                                  }
                                  placeholder={`Opcja ${oIdx + 1}`}
                                  className="h-8 text-xs flex-1"
                                />
                                {q.options.length > 2 && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 flex-shrink-0"
                                    onClick={() => removeOption(q.localId, oIdx)}
                                  >
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                )}
                              </div>
                            ))}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => addOption(q.localId)}
                            >
                              <Plus className="mr-1 h-3 w-3" />
                              Dodaj opcję
                            </Button>
                          </div>
                        )}

                        {/* Scale config */}
                        {q.type === 'scale' && (
                          <div className="flex gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs">Min</Label>
                              <Input
                                type="number"
                                value={q.scale_min}
                                onChange={(e) =>
                                  updateQuestion(q.localId, {
                                    scale_min: parseInt(e.target.value) || 1,
                                  })
                                }
                                className="h-8 w-20 text-xs"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs">Max</Label>
                              <Input
                                type="number"
                                value={q.scale_max}
                                onChange={(e) =>
                                  updateQuestion(q.localId, {
                                    scale_max: parseInt(e.target.value) || 5,
                                  })
                                }
                                className="h-8 w-20 text-xs"
                              />
                            </div>
                          </div>
                        )}

                        {/* Delete question */}
                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-destructive hover:text-destructive"
                            onClick={() => removeQuestion(q.localId)}
                          >
                            <Trash2 className="mr-1 h-3 w-3" />
                            Usuń pytanie
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {questions.length === 0 && (
                  <div className="text-center text-muted-foreground text-sm py-6">
                    Brak pytań. Dodaj pierwsze pytanie.
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSheetOpen(false)}>
              Anuluj
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Zapisywanie...' : 'Zapisz szablon'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
