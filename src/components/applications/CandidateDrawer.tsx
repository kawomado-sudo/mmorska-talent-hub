import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hrApi } from '@/lib/hr-api';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Download, ExternalLink, Save, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface CandidateDrawerProps {
  application: any;
  onClose: () => void;
  jobId: string;
}

const statusActions = [
  { value: 'reviewing', label: 'W ocenie', className: 'bg-sky-900/50 text-sky-400 hover:bg-sky-900/70 border-sky-800' },
  { value: 'hold', label: 'Hold', className: 'bg-yellow-900/50 text-yellow-400 hover:bg-yellow-900/70 border-yellow-800' },
  { value: 'accepted', label: 'Zaakceptuj', className: 'bg-emerald-900/50 text-emerald-400 hover:bg-emerald-900/70 border-emerald-800' },
  { value: 'rejected', label: 'Odrzuć', className: 'bg-red-900/50 text-red-400 hover:bg-red-900/70 border-red-800' },
];

export const CandidateDrawer = ({ application, onClose, jobId }: CandidateDrawerProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');
  const [cvSignedUrl, setCvSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (application) {
      setNotes(application.recruiter_notes || '');
      setCvSignedUrl(null);
      // Generate signed URL if cv_url is a storage path (not a full URL)
      const cvPath = application.cv_url;
      if (cvPath && !cvPath.startsWith('http')) {
        supabase.storage.from('hr-cv').createSignedUrl(cvPath, 3600).then(({ data }) => {
          if (data?.signedUrl) setCvSignedUrl(data.signedUrl);
        });
      } else if (cvPath) {
        setCvSignedUrl(cvPath);
      }
    }
  }, [application]);

  const { data: statusHistory } = useQuery({
    queryKey: ['status-history', application?.id],
    queryFn: () => hrApi('list_status_log', { application_id: application.id }),
    enabled: !!application,
  });

  const statusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const oldStatus = application.status;
      await hrApi('update_application', {
        id: application.id,
        status: newStatus,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      await hrApi('insert_status_log', {
        application_id: application.id,
        old_status: oldStatus,
        new_status: newStatus,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications', jobId] });
      queryClient.invalidateQueries({ queryKey: ['status-history', application?.id] });
      toast.success('Status zmieniony');
      onClose();
    },
    onError: () => toast.error('Nie udało się zmienić statusu'),
  });

  const notesMutation = useMutation({
    mutationFn: () =>
      hrApi('update_application', {
        id: application.id,
        recruiter_notes: notes,
        updated_at: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications', jobId] });
      toast.success('Notatki zapisane');
    },
  });

  if (!application) return null;

  return (
    <Sheet open={!!application} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{application.first_name} {application.last_name}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          <div className="space-y-1 text-sm">
            <div><span className="text-muted-foreground">Email:</span> {application.email}</div>
            {application.phone && <div><span className="text-muted-foreground">Telefon:</span> {application.phone}</div>}
          </div>

          {cvSignedUrl && (
            <div>
              {application.cv_link ? (
                <Button variant="outline" size="sm" asChild>
                  <a href={application.cv_link} target="_blank" rel="noreferrer" className="gap-2">
                    <ExternalLink className="h-4 w-4" /> Otwórz CV
                  </a>
                </Button>
              ) : (
                <Button variant="outline" size="sm" asChild>
                  <a href={cvSignedUrl} target="_blank" rel="noreferrer" className="gap-2">
                    <Download className="h-4 w-4" /> Pobierz CV
                  </a>
                </Button>
              )}
            </div>
          )}

          <Separator />

          {application.cover_letter && (
            <div>
              <h3 className="mb-2 text-sm font-medium">List motywacyjny</h3>
              <ScrollArea className="h-32 rounded-md border p-3 text-sm">
                {application.cover_letter}
              </ScrollArea>
            </div>
          )}

          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Summary
            </div>
            <p className="text-sm text-muted-foreground">
              {application.ai_summary || 'Podsumowanie AI w trakcie generowania…'}
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="mb-2 text-sm font-medium">Notatki rekrutera</h3>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            <Button size="sm" variant="outline" className="mt-2 gap-1" onClick={() => notesMutation.mutate()}>
              <Save className="h-3 w-3" /> Zapisz notatki
            </Button>
          </div>

          <Separator />

          <div>
            <h3 className="mb-2 text-sm font-medium">Zmień status</h3>
            <div className="flex flex-wrap gap-2">
              {statusActions.map((s) => (
                <Button
                  key={s.value}
                  size="sm"
                  variant="outline"
                  className={`${s.className} ${application.status === s.value ? 'ring-2 ring-ring' : 'opacity-70'}`}
                  onClick={() => statusMutation.mutate(s.value)}
                  disabled={statusMutation.isPending}
                >
                  {s.label}
                </Button>
              ))}
            </div>
          </div>

          {statusHistory && statusHistory.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium">Historia statusów</h3>
              <div className="space-y-2">
                {statusHistory.map((log: any) => (
                  <div key={log.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-xs">
                    <span>
                      <span className="text-muted-foreground">{log.old_status || '—'}</span>
                      {' → '}
                      <span className="font-medium">{log.new_status}</span>
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(log.changed_at).toLocaleString('pl-PL')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
