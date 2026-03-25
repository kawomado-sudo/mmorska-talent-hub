import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface JobOption {
  id: string;
  title: string;
}

interface ScreeningResultRow {
  id: string;
  completed_at: string | null;
  application: { id: string; first_name: string | null; last_name: string | null } | null;
  ai_analysis: { ai_overall: number | null; status: string | null }[] | null;
}

interface ResponseRow {
  id: string;
  answer_text: string | null;
  answer_values: string | string[] | null;
  question: { question: string; type: string; order_index: number } | null;
}

const getAiStatusLabel = (status: string | null) => {
  if (status === 'approved') return 'Zatwierdzona';
  if (status === 'rejected') return 'Odrzucona';
  if (status === 'edited') return 'Edytowana';
  if (status === 'pending') return 'Oczekuje';
  return 'Brak analizy';
};

const getAiStatusBadgeClass = (status: string | null) => {
  if (status === 'approved') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (status === 'rejected') return 'bg-red-100 text-red-700 border-red-200';
  if (status === 'edited') return 'bg-blue-100 text-blue-700 border-blue-200';
  if (status === 'pending') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-muted text-muted-foreground border-border';
};

export default function ScreeningResults() {
  const [selectedJobId, setSelectedJobId] = useState<string>('none');
  const [selectedInvitationId, setSelectedInvitationId] = useState<string | null>(null);
  const [selectedCandidateName, setSelectedCandidateName] = useState<string>('');

  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ['screening_results_jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title')
        .order('title');
      if (error) throw error;
      return (data || []) as JobOption[];
    },
  });

  const { data: results = [], isLoading: resultsLoading } = useQuery({
    queryKey: ['screening_results_list', selectedJobId],
    queryFn: async () => {
      const query = supabase
        .from('screening_invitations')
        .select('id, completed_at, application:applications(id, first_name, last_name), ai_analysis:screening_ai_analysis(ai_overall, status)')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (selectedJobId !== 'none') {
        query.eq('applications.job_id', selectedJobId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as ScreeningResultRow[];
    },
  });

  const { data: candidateResponses = [], isLoading: responsesLoading } = useQuery({
    queryKey: ['screening_result_responses', selectedInvitationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('screening_responses')
        .select('id, answer_text, answer_values, question:screening_questions(question, type, order_index)')
        .eq('invitation_id', selectedInvitationId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return ((data || []) as unknown as ResponseRow[]).sort(
        (a, b) => (a.question?.order_index || 0) - (b.question?.order_index || 0),
      );
    },
    enabled: !!selectedInvitationId,
  });

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Wyniki testów screeningowych</h1>
        <p className="text-sm text-muted-foreground">
          Porównanie wyników kandydatów, którzy zakończyli test.
        </p>
      </div>

      <div className="max-w-md">
        <Select value={selectedJobId} onValueChange={setSelectedJobId}>
          <SelectTrigger>
            <SelectValue placeholder="Wybierz ogłoszenie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Wszystkie ogłoszenia</SelectItem>
            {jobs.map((job) => (
              <SelectItem key={job.id} value={job.id}>
                {job.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {jobsLoading || resultsLoading ? (
        <p className="text-sm text-muted-foreground">Ładowanie wyników...</p>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Imię i nazwisko</TableHead>
                <TableHead>Data wypełnienia</TableHead>
                <TableHead>Wynik AI</TableHead>
                <TableHead>Status analizy AI</TableHead>
                <TableHead>Akcja</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Brak zakończonych testów dla wybranego filtra.
                  </TableCell>
                </TableRow>
              ) : (
                results.map((row) => {
                  const ai = row.ai_analysis?.[0];
                  const fullName = `${row.application?.first_name || ''} ${row.application?.last_name || ''}`.trim() || 'Nieznany kandydat';
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{fullName}</TableCell>
                      <TableCell>
                        {row.completed_at ? new Date(row.completed_at).toLocaleString('pl-PL') : '—'}
                      </TableCell>
                      <TableCell>
                        {ai?.ai_overall != null ? (
                          <Badge variant="secondary">{Math.round(ai.ai_overall)}/100</Badge>
                        ) : (
                          <Badge variant="outline">Brak</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={getAiStatusBadgeClass(ai?.status || null)}>
                          {getAiStatusLabel(ai?.status || null)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedInvitationId(row.id);
                            setSelectedCandidateName(fullName);
                          }}
                        >
                          Podgląd
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Drawer open={!!selectedInvitationId} onOpenChange={(open) => !open && setSelectedInvitationId(null)}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle>Odpowiedzi kandydata — {selectedCandidateName}</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-3 overflow-y-auto px-4 pb-6">
            {responsesLoading ? (
              <p className="text-sm text-muted-foreground">Ładowanie odpowiedzi...</p>
            ) : candidateResponses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Brak odpowiedzi.</p>
            ) : (
              candidateResponses.map((response, index) => (
                <div key={response.id} className="rounded-md border border-border p-3">
                  <p className="text-sm font-semibold">
                    {index + 1}. {response.question?.question || 'Pytanie'}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {Array.isArray(response.answer_values)
                      ? response.answer_values.join(', ')
                      : response.answer_values || response.answer_text || '—'}
                  </p>
                </div>
              ))
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
