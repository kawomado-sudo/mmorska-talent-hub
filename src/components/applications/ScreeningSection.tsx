import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  ClipboardList,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Sparkles,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';

interface ScreeningInvitation {
  id: string;
  application_id: string;
  token: string;
  template_id: string;
  status: 'pending' | 'started' | 'completed' | 'expired';
  expires_at: string | null;
  sent_at: string | null;
  completed_at: string | null;
}

interface ScreeningResponse {
  id: string;
  invitation_id: string;
  question_id: string;
  answer_text: string | null;
  answer_values: any;
}

interface ScreeningQuestion {
  id: string;
  question: string;
  type: string;
  options: any;
  scale_min: number | null;
  scale_max: number | null;
}

interface ScreeningAiAnalysis {
  id: string;
  invitation_id: string;
  ai_summary: string | null;
  ai_skill_scores: any;
  ai_overall: number | null;
  ai_flags: any;
  status: 'pending' | 'approved' | 'rejected' | 'edited';
  reviewer_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

interface ScreeningTemplate {
  id: string;
  name: string;
  is_global: boolean;
  job_id: string | null;
}

const invitationStatusConfig = {
  pending: { label: 'Oczekuje', icon: Clock, className: 'text-amber-400' },
  started: { label: 'W toku', icon: AlertCircle, className: 'text-blue-400' },
  completed: { label: 'Ukończony', icon: CheckCircle2, className: 'text-emerald-400' },
  expired: { label: 'Wygasły', icon: XCircle, className: 'text-red-400' },
};

const analysisStatusConfig = {
  pending: { label: 'Oczekuje na AI', className: 'bg-muted text-muted-foreground' },
  approved: { label: 'Zatwierdzone', className: 'bg-emerald-900/60 text-emerald-300 border-emerald-800' },
  rejected: { label: 'Odrzucone', className: 'bg-red-900/60 text-red-300 border-red-800' },
  edited: { label: 'Edytowane', className: 'bg-blue-900/60 text-blue-300 border-blue-800' },
};

interface ScreeningSectionProps {
  applicationId: string;
  jobId: string;
}

export function ScreeningSection({ applicationId, jobId }: ScreeningSectionProps) {
  const queryClient = useQueryClient();
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);

  // Fetch invitation for this application
  const { data: invitation, isLoading: invLoading } = useQuery({
    queryKey: ['screening_invitation', applicationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('screening_invitations')
        .select('*')
        .eq('application_id', applicationId)
        .maybeSingle();
      if (error) throw error;
      return data as ScreeningInvitation | null;
    },
    enabled: !!applicationId,
  });

  // Fetch templates for job (global + assigned to job)
  const { data: templates = [] } = useQuery({
    queryKey: ['screening_templates_for_job', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('screening_templates')
        .select('id, name, is_global, job_id')
        .or(`is_global.eq.true,job_id.eq.${jobId}`)
        .order('name');
      if (error) throw error;
      return data as ScreeningTemplate[];
    },
    enabled: !!jobId,
  });

  // Fetch responses if invitation is completed
  const { data: responses = [] } = useQuery({
    queryKey: ['screening_responses', invitation?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('screening_responses')
        .select('*')
        .eq('invitation_id', invitation!.id);
      if (error) throw error;
      return data as ScreeningResponse[];
    },
    enabled: !!invitation?.id && invitation.status === 'completed',
  });

  // Fetch questions for the template used in this invitation
  const { data: questions = [] } = useQuery({
    queryKey: ['screening_questions', invitation?.template_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('screening_questions')
        .select('*')
        .eq('template_id', invitation!.template_id)
        .order('order_index');
      if (error) throw error;
      return data as ScreeningQuestion[];
    },
    enabled: !!invitation?.template_id && invitation.status === 'completed',
  });

  // Fetch AI analysis
  const { data: analysis } = useQuery({
    queryKey: ['screening_ai_analysis', invitation?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('screening_ai_analysis')
        .select('*')
        .eq('invitation_id', invitation!.id)
        .maybeSingle();
      if (error) throw error;
      if (data) setReviewerNotes(data.reviewer_notes || '');
      return data as ScreeningAiAnalysis | null;
    },
    enabled: !!invitation?.id && invitation.status === 'completed',
  });

  // Send invitation mutation
  const sendInvitationMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTemplateId) throw new Error('Wybierz szablon');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      const { error } = await supabase.from('screening_invitations').insert({
        application_id: applicationId,
        template_id: selectedTemplateId,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        sent_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screening_invitation', applicationId] });
      toast.success('Zaproszenie wysłane');
    },
    onError: (err: any) => toast.error(err.message || 'Nie udało się wysłać zaproszenia'),
  });

  // Update AI analysis status mutation
  const updateAnalysisMutation = useMutation({
    mutationFn: async ({
      status,
      notes,
    }: {
      status: 'approved' | 'rejected' | 'edited';
      notes?: string;
    }) => {
      if (!analysis) return;
      const { error } = await supabase
        .from('screening_ai_analysis')
        .update({
          status,
          reviewer_notes: notes ?? analysis.reviewer_notes,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', analysis.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['screening_ai_analysis', invitation?.id],
      });
      toast.success('Analiza zaktualizowana');
      setEditingNotes(false);
    },
    onError: () => toast.error('Nie udało się zaktualizować analizy'),
  });

  const invLink = invitation
    ? `${window.location.origin}/screening-test/${invitation.token}`
    : null;

  const copyLink = () => {
    if (invLink) {
      navigator.clipboard.writeText(invLink);
      toast.success('Link skopiowany do schowka');
    }
  };

  const getAnswerDisplay = (q: ScreeningQuestion, resp: ScreeningResponse | undefined) => {
    if (!resp) return <span className="text-muted-foreground italic">Brak odpowiedzi</span>;

    if (q.type === 'text') {
      return <p className="text-sm">{resp.answer_text || '—'}</p>;
    }

    if (q.type === 'scale') {
      const val = resp.answer_values as number;
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{val}</span>
          <span className="text-xs text-muted-foreground">
            / {q.scale_max} (min: {q.scale_min})
          </span>
        </div>
      );
    }

    if (q.type === 'single' || q.type === 'multi') {
      const selected = Array.isArray(resp.answer_values)
        ? resp.answer_values
        : resp.answer_values
        ? [resp.answer_values]
        : [];
      const opts = Array.isArray(q.options) ? q.options : [];
      return (
        <div className="space-y-0.5">
          {opts.map((opt: any, i: number) => {
            const isSelected = selected.includes(i) || selected.includes(opt.text);
            return (
              <div
                key={i}
                className={`text-sm flex items-center gap-1.5 ${
                  isSelected ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                    isSelected ? 'bg-primary' : 'bg-muted-foreground/40'
                  }`}
                />
                {opt.text || opt}
                {opt.is_correct && isSelected && (
                  <CheckCircle2 className="h-3 w-3 text-emerald-400 ml-1" />
                )}
              </div>
            );
          })}
        </div>
      );
    }

    return <span className="text-sm">{String(resp.answer_text || resp.answer_values)}</span>;
  };

  if (invLoading) {
    return (
      <div className="text-sm text-muted-foreground">Ładowanie danych screeningu...</div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <ClipboardList className="h-4 w-4 text-primary" />
        Test screeningowy
      </div>

      {!invitation ? (
        /* No invitation yet */
        <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
          <p className="text-sm text-muted-foreground">
            Brak wysłanego zaproszenia. Wybierz szablon i wyślij zaproszenie kandydatowi.
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs">Szablon testu</Label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Wybierz szablon..." />
              </SelectTrigger>
              <SelectContent>
                {templates.length === 0 ? (
                  <SelectItem value="__none__" disabled>
                    Brak szablonów — utwórz w sekcji Testy
                  </SelectItem>
                ) : (
                  templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                      {t.is_global && (
                        <span className="ml-1 text-muted-foreground">(globalny)</span>
                      )}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <Button
            size="sm"
            onClick={() => sendInvitationMutation.mutate()}
            disabled={!selectedTemplateId || sendInvitationMutation.isPending}
          >
            <Send className="mr-1.5 h-3.5 w-3.5" />
            Wyślij zaproszenie
          </Button>
        </div>
      ) : (
        /* Invitation exists */
        <div className="space-y-3">
          {/* Status badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {(() => {
                const cfg = invitationStatusConfig[invitation.status];
                const Icon = cfg.icon;
                return (
                  <>
                    <Icon className={`h-4 w-4 ${cfg.className}`} />
                    <span className="text-sm font-medium">{cfg.label}</span>
                  </>
                );
              })()}
            </div>
            {invitation.sent_at && (
              <span className="text-xs text-muted-foreground">
                Wysłane: {new Date(invitation.sent_at).toLocaleDateString('pl-PL')}
              </span>
            )}
          </div>

          {/* Invitation link */}
          {invLink && invitation.status !== 'completed' && (
            <div className="rounded-md bg-muted/40 border border-border px-3 py-2 flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground truncate">{invLink}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={copyLink}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )}

          {/* Completed: show responses + AI analysis */}
          {invitation.status === 'completed' && (
            <>
              <Separator />

              {/* Responses */}
              {questions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Odpowiedzi kandydata
                  </h4>
                  <ScrollArea className="max-h-72">
                    <div className="space-y-3 pr-2">
                      {questions.map((q, idx) => {
                        const resp = responses.find((r) => r.question_id === q.id);
                        return (
                          <div key={q.id} className="rounded-md border border-border p-3">
                            <p className="text-xs font-medium mb-1.5">
                              {idx + 1}. {q.question}
                            </p>
                            {getAnswerDisplay(q, resp)}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}

              <Separator />

              {/* AI Analysis */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h4 className="text-xs font-semibold">Analiza AI</h4>
                  {analysis && (
                    <Badge className={`text-xs ml-auto ${analysisStatusConfig[analysis.status].className}`}>
                      {analysisStatusConfig[analysis.status].label}
                    </Badge>
                  )}
                </div>

                {!analysis ? (
                  <p className="text-xs text-muted-foreground">
                    Analiza AI w toku...
                  </p>
                ) : (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
                    {analysis.ai_overall != null && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Wynik ogólny:</span>
                        <Progress value={analysis.ai_overall} className="h-2 flex-1" />
                        <span className="text-xs font-semibold">{analysis.ai_overall}%</span>
                      </div>
                    )}
                    {analysis.ai_summary && (
                      <p className="text-xs text-muted-foreground">{analysis.ai_summary}</p>
                    )}
                    {analysis.ai_skill_scores &&
                      Object.keys(analysis.ai_skill_scores).length > 0 && (
                        <div className="space-y-1 mt-2">
                          <p className="text-xs font-medium text-muted-foreground">Skille:</p>
                          {Object.entries(analysis.ai_skill_scores).map(
                            ([skill, score]: [string, any]) => (
                              <div key={skill} className="flex items-center gap-2">
                                <span className="text-xs flex-1 truncate">{skill}</span>
                                <Progress value={score} className="h-1.5 w-16" />
                                <span className="text-xs w-8 text-right">{score}%</span>
                              </div>
                            )
                          )}
                        </div>
                      )}
                  </div>
                )}

                {/* Reviewer notes */}
                {analysis && (
                  <div className="space-y-2">
                    <Label className="text-xs">Notatka rekrutera</Label>
                    {editingNotes ? (
                      <>
                        <Textarea
                          value={reviewerNotes}
                          onChange={(e) => setReviewerNotes(e.target.value)}
                          rows={3}
                          className="text-xs"
                          placeholder="Dodaj notatkę..."
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() =>
                            updateAnalysisMutation.mutate({
                              status: 'edited',
                              notes: reviewerNotes,
                            })
                          }
                          disabled={updateAnalysisMutation.isPending}
                        >
                          Zapisz notatkę
                        </Button>
                      </>
                    ) : (
                      <div
                        className="text-xs text-muted-foreground rounded-md border border-border px-3 py-2 cursor-pointer hover:bg-muted/40 min-h-[2.5rem]"
                        onClick={() => setEditingNotes(true)}
                      >
                        {analysis.reviewer_notes || (
                          <span className="italic">Kliknij, aby dodać notatkę...</span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Human-in-the-loop buttons */}
                {analysis && analysis.status !== 'approved' && analysis.status !== 'rejected' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-emerald-600 text-white hover:bg-emerald-700 h-7 text-xs"
                      onClick={() =>
                        updateAnalysisMutation.mutate({ status: 'approved' })
                      }
                      disabled={updateAnalysisMutation.isPending}
                    >
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                      Zatwierdź
                    </Button>
                    <Button
                      size="sm"
                      className="bg-red-600 text-white hover:bg-red-700 h-7 text-xs"
                      onClick={() =>
                        updateAnalysisMutation.mutate({ status: 'rejected' })
                      }
                      disabled={updateAnalysisMutation.isPending}
                    >
                      <XCircle className="mr-1 h-3.5 w-3.5" />
                      Odrzuć
                    </Button>
                    {!editingNotes && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => setEditingNotes(true)}
                      >
                        Edytuj notatkę
                      </Button>
                    )}
                  </div>
                )}

                {analysis &&
                  (analysis.status === 'approved' || analysis.status === 'rejected') && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => setEditingNotes(true)}
                      >
                        Edytuj notatkę
                      </Button>
                    </div>
                  )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
