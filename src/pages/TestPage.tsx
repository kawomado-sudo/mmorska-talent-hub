import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import logo from '@/assets/mmorska-logo.png';

const SUPABASE_URL = 'https://opdpjplccytlzadjpdsd.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wZHBqcGxjY3l0bHphZGpwZHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMDMwMTIsImV4cCI6MjA3Njg3OTAxMn0.-E7lNQ_tMRPg7ImwNgJIJa1WSUZOJLp_glmWtFix7VE';

const supabasePublicHr = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: 'hr' },
});

type InvitationStatus = 'pending' | 'started' | 'completed' | 'expired';
type QuestionType = 'single' | 'multi' | 'text' | 'scale';
type TemplateLanguage = 'pl' | 'en';

const uiLabels: Record<TemplateLanguage, { submit: string; next: string; thankYou: string }> = {
  pl: { submit: 'Wyślij test', next: 'Dalej', thankYou: 'Dziękujemy' },
  en: { submit: 'Submit test', next: 'Next', thankYou: 'Thank you' },
};

function getLanguageFromDescription(raw: string | null): TemplateLanguage {
  if (!raw) return 'pl';

  try {
    const parsed = JSON.parse(raw) as { lang?: string };
    return parsed.lang === 'en' ? 'en' : 'pl';
  } catch {
    return 'pl';
  }
}

interface ScreeningInvitation {
  id: string;
  token: string;
  status: InvitationStatus;
  template_id: string;
  expires_at: string | null;
}

interface QuestionOption {
  text?: string;
  value?: string;
}

interface ScreeningQuestion {
  id: string;
  question: string;
  type: QuestionType;
  options: QuestionOption[] | string[] | null;
  scale_min: number | null;
  scale_max: number | null;
  order_index: number;
}

export default function TestPage() {
  const { token } = useParams<{ token: string }>();
  const [invitation, setInvitation] = useState<ScreeningInvitation | null>(null);
  const [questions, setQuestions] = useState<ScreeningQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<TemplateLanguage>('pl');

  useEffect(() => {
    const loadTest = async () => {
      if (!token) {
        setError('Brak tokenu zaproszenia.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      const { data: invitationData, error: invitationError } = await supabasePublicHr
        .from('screening_invitations')
        .select('id, token, status, template_id, expires_at')
        .eq('token', token)
        .maybeSingle();

      if (invitationError || !invitationData) {
        setError('Zaproszenie jest nieprawidłowe lub nie istnieje.');
        setIsLoading(false);
        return;
      }

      if (invitationData.expires_at && new Date(invitationData.expires_at) < new Date()) {
        setError('To zaproszenie wygasło. Skontaktuj się z rekruterem.');
        setIsLoading(false);
        return;
      }

      setInvitation(invitationData as ScreeningInvitation);

      const { data: templateData } = await supabasePublicHr
        .from('screening_templates')
        .select('description')
        .eq('id', invitationData.template_id)
        .maybeSingle();

      setLanguage(getLanguageFromDescription(templateData?.description || null));

      const { data: questionsData, error: questionsError } = await supabasePublicHr
        .from('screening_questions')
        .select('id, question, type, options, scale_min, scale_max, order_index')
        .eq('template_id', invitationData.template_id)
        .order('order_index', { ascending: true });

      if (questionsError) {
        setError('Nie udało się pobrać pytań testowych.');
      } else {
        setQuestions((questionsData || []) as ScreeningQuestion[]);
      }

      setIsLoading(false);
    };

    loadTest();
  }, [token]);

  const isCompleted = useMemo(() => invitation?.status === 'completed', [invitation]);
  const labels = uiLabels[language];

  const setTextAnswer = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const setSingleAnswer = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const toggleMultiAnswer = (questionId: string, value: string) => {
    setAnswers((prev) => {
      const current = Array.isArray(prev[questionId]) ? (prev[questionId] as string[]) : [];
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      return { ...prev, [questionId]: next };
    });
  };

  const getOptionLabel = (option: QuestionOption | string) =>
    typeof option === 'string' ? option : option.text || option.value || '';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!invitation) return;

    setIsSubmitting(true);
    setError(null);

    const payload = questions.map((q) => {
      const current = answers[q.id];
      if (q.type === 'text') {
        return {
          invitation_id: invitation.id,
          question_id: q.id,
          answer_text: typeof current === 'string' ? current : '',
          answer_values: null,
        };
      }

      if (q.type === 'multi') {
        return {
          invitation_id: invitation.id,
          question_id: q.id,
          answer_text: null,
          answer_values: Array.isArray(current) ? current : [],
        };
      }

      return {
        invitation_id: invitation.id,
        question_id: q.id,
        answer_text: null,
        answer_values: typeof current === 'string' ? current : null,
      };
    });

    const { error: insertError } = await supabasePublicHr
      .from('screening_responses')
      .insert(payload);

    if (insertError) {
      setError('Nie udało się zapisać odpowiedzi. Spróbuj ponownie.');
      setIsSubmitting(false);
      return;
    }

    const { error: updateError } = await supabasePublicHr
      .from('screening_invitations')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', invitation.id);

    if (updateError) {
      setError('Odpowiedzi zapisano, ale nie udało się zamknąć testu.');
      setIsSubmitting(false);
      return;
    }

    setIsSuccess(true);
    setIsSubmitting(false);
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex justify-center">
          <img src={logo} alt="MMorska" className="h-14 w-auto" />
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Ładowanie testu...
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardHeader>
              <CardTitle>Nie udało się otworzyć testu</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : isCompleted ? (
          <Card>
            <CardHeader>
              <CardTitle>Test już wypełniony</CardTitle>
            </CardHeader>
            <CardContent>{labels.thankYou} za przesłane odpowiedzi.</CardContent>
          </Card>
        ) : isSuccess ? (
          <Card>
            <CardHeader>
              <CardTitle>{labels.thankYou} za wypełnienie testu!</CardTitle>
            </CardHeader>
            <CardContent>Twoje odpowiedzi zostały zapisane.</CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Test screeningowy</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {questions.map((q, index) => {
                  const options = Array.isArray(q.options) ? q.options : [];
                  const scaleMin = q.scale_min ?? 1;
                  const scaleMax = q.scale_max ?? 5;
                  const scaleValues = Array.from(
                    { length: scaleMax - scaleMin + 1 },
                    (_, i) => String(scaleMin + i)
                  );

                  return (
                    <div
                      key={q.id}
                      data-question-id={q.id}
                      className="space-y-3 border-b border-slate-200 pb-6 last:border-none"
                    >
                      <Label className="text-base font-semibold">
                        {index + 1}. {q.question}
                      </Label>

                      {q.type === 'text' ? (
                        <Textarea
                          value={typeof answers[q.id] === 'string' ? (answers[q.id] as string) : ''}
                          onChange={(e) => setTextAnswer(q.id, e.target.value)}
                          placeholder={language === 'en' ? 'Type your answer' : 'Wpisz swoją odpowiedź'}
                        />
                      ) : null}

                      {q.type === 'single' ? (
                        <div className="space-y-2">
                          {options.map((opt, optIndex) => {
                            const value = getOptionLabel(opt);
                            return (
                              <label key={optIndex} className="flex items-center gap-2 text-sm">
                                <input
                                  type="radio"
                                  name={q.id}
                                  value={value}
                                  checked={answers[q.id] === value}
                                  onChange={() => setSingleAnswer(q.id, value)}
                                />
                                {value}
                              </label>
                            );
                          })}
                        </div>
                      ) : null}

                      {q.type === 'multi' ? (
                        <div className="space-y-2">
                          {options.map((opt, optIndex) => {
                            const value = getOptionLabel(opt);
                            const selected = Array.isArray(answers[q.id])
                              ? (answers[q.id] as string[])
                              : [];
                            return (
                              <label key={optIndex} className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  value={value}
                                  checked={selected.includes(value)}
                                  onChange={() => toggleMultiAnswer(q.id, value)}
                                />
                                {value}
                              </label>
                            );
                          })}
                        </div>
                      ) : null}

                      {q.type === 'scale' ? (
                        <div className="flex flex-wrap gap-2">
                          {scaleValues.map((value) => (
                            <Button
                              key={value}
                              type="button"
                              variant={answers[q.id] === value ? 'default' : 'outline'}
                              onClick={() => setSingleAnswer(q.id, value)}
                            >
                              {value}
                            </Button>
                          ))}
                        </div>
                      ) : null}
                    {index < questions.length - 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="px-0 text-xs"
                        onClick={() =>
                          document
                            .querySelectorAll('[data-question-id]')
                            [index + 1]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }
                      >
                        {labels.next}
                      </Button>
                    ) : null}
                    </div>
                  );
                })}

                <Button type="submit" disabled={isSubmitting || questions.length === 0}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {language === 'en' ? 'Submitting...' : 'Wysyłanie...'}
                    </>
                  ) : (
                    labels.submit
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
