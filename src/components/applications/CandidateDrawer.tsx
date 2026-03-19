import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hrApi } from '@/lib/hr-api';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Download, ExternalLink, Save, Eye, UserCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface CandidateDrawerProps {
  application: any;
  onClose: () => void;
  jobId: string;
  onDelete?: (app: any) => void;
}

const baseStatusActions = [
  { value: 'reviewing', label: 'U recenzenta', className: 'bg-sky-600 text-white hover:bg-sky-700 border-sky-600' },
  { value: 'hold', label: 'Hold', className: 'bg-amber-500 text-white hover:bg-amber-600 border-amber-500' },
  { value: 'accepted', label: 'Zaakceptuj', className: 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600' },
  { value: 'rejected', label: 'Odrzuć', className: 'bg-red-600 text-white hover:bg-red-700 border-red-600' },
];

const advancedStatusActions = [
  { value: 'in_review', label: 'W recenzji', className: 'bg-violet-600 text-white hover:bg-violet-700 border-violet-600' },
  { value: 'screening_test', label: 'Screening test', className: 'bg-indigo-600 text-white hover:bg-indigo-700 border-indigo-600' },
  { value: 'interview', label: 'Rozmowa', className: 'bg-cyan-600 text-white hover:bg-cyan-700 border-cyan-600' },
  { value: 'offer', label: 'Oferta', className: 'bg-yellow-500 text-white hover:bg-yellow-600 border-yellow-500' },
];

export const CandidateDrawer = ({ application, onClose, jobId, onDelete }: CandidateDrawerProps) => {
  const { user, isReviewer, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [cvSignedUrl, setCvSignedUrl] = useState<string | null>(null);
  const [cvLoading, setCvLoading] = useState(false);
  const [cvError, setCvError] = useState(false);
  const [showCvPreview, setShowCvPreview] = useState(false);
  const [selectedReviewerId, setSelectedReviewerId] = useState<string>('');

  useEffect(() => {
    if (application) {
      setNotes(application.recruiter_notes || '');
      setReviewNotes('');
      setCvSignedUrl(null);
      setCvError(false);
      setSelectedReviewerId('');
      const cvPath = application.cv_url;
      if (cvPath && !cvPath.startsWith('http')) {
        setCvLoading(true);
        hrApi<{ signed_url: string }>('get_cv_signed_url', { application_id: application.id })
          .then((res) => {
            setCvSignedUrl(res.signed_url);
          })
          .catch((err) => {
            console.error('CV signed URL error:', err);
            setCvError(true);
            toast.error('Nie udało się załadować CV');
          })
          .finally(() => setCvLoading(false));
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

  const { data: teamMembers } = useQuery({
    queryKey: ['team-members'],
    queryFn: () => hrApi('list_team_members'),
    enabled: !!application && !isReviewer,
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

  const submitReviewMutation = useMutation({
    mutationFn: async (decision: 'accepted' | 'rejected') => {
      await hrApi('submit_review', {
        application_id: application.id,
        status: decision,
        notes: reviewNotes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications', jobId] });
      queryClient.invalidateQueries({ queryKey: ['status-history', application?.id] });
      toast.success('Recenzja zapisana i wysłana');
      onClose();
    },
    onError: () => toast.error('Nie udało się zapisać recenzji'),
  });

  const assignReviewerMutation = useMutation({
    mutationFn: async () => {
      await hrApi('assign_reviewer', {
        application_id: application.id,
        reviewer_id: selectedReviewerId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications', jobId] });
      queryClient.invalidateQueries({ queryKey: ['status-history', application?.id] });
      toast.success('Kandydat przypisany do recenzenta');
    },
    onError: () => toast.error('Nie udało się przypisać recenzenta'),
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

  const handleStatusClick = (statusValue: string) => {
    statusMutation.mutate(statusValue);
  };

  const filteredTeamMembers = (teamMembers || []).filter((m: any) => m.active);

  // Reviewer sees only Accept/Reject buttons
  const visibleActions = isReviewer
    ? baseStatusActions.filter((s) => s.value === 'accepted' || s.value === 'rejected')
    : baseStatusActions;

  // Advanced statuses visible only for accepted candidates (manager/admin only)
  // Show stage 2 statuses when candidate is accepted or already in stage 2
  const canShowAdvanced = !isReviewer && application && 
    ['accepted', 'in_review', 'screening_test', 'interview'].includes(application.status);
  // Filter: offer only visible from interview status
  const advancedActions = canShowAdvanced
    ? advancedStatusActions.filter((s) => {
        if (s.value === 'offer') return application.status === 'interview';
        return true;
      })
    : [];

  if (!application) return null;

  return (
    <>
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
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowCvPreview(true)} className="gap-2">
                <Eye className="h-4 w-4" /> Podgląd CV
              </Button>
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

          {/* Reviewer: unified review block */}
          {isReviewer ? (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
              <h3 className="text-sm font-medium">Twoja recenzja</h3>
              <Textarea
                placeholder="Wpisz swoją notatkę do recenzji..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={4}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={() => submitReviewMutation.mutate('accepted')}
                  disabled={submitReviewMutation.isPending}
                >
                  ✅ Zaakceptuj
                </Button>
                <Button
                  size="sm"
                  className="bg-red-600 text-white hover:bg-red-700"
                  onClick={() => submitReviewMutation.mutate('rejected')}
                  disabled={submitReviewMutation.isPending}
                >
                  ❌ Odrzuć
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <h3 className="mb-2 text-sm font-medium">Notatki rekrutera</h3>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                <Button size="sm" variant="outline" className="mt-2 gap-1" onClick={() => notesMutation.mutate()}>
                  <Save className="h-3 w-3" /> Zapisz notatki
                </Button>
              </div>

              <Separator />

              {/* Reviewer assignment */}
              <div>
                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                  <UserCheck className="h-4 w-4 text-primary" />
                  Przypisz recenzenta
                </div>
                {application.assigned_reviewer_id && (
                  <p className="text-xs text-muted-foreground mb-2">
                    Aktualnie przypisany: <span className="font-medium text-foreground">
                      {filteredTeamMembers.find((m: any) => m.id === application.assigned_reviewer_id || m.auth_user_id === application.assigned_reviewer_id)?.full_name || application.assigned_reviewer_id}
                    </span>
                  </p>
                )}
                <Select value={selectedReviewerId} onValueChange={setSelectedReviewerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz recenzenta..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredTeamMembers.map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.full_name} ({m.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={() => assignReviewerMutation.mutate()}
                  disabled={!selectedReviewerId || assignReviewerMutation.isPending}
                >
                  Przypisz
                </Button>
              </div>

              <Separator />

              <div>
                <h3 className="mb-2 text-sm font-medium">Zmień status</h3>
                <div className="flex flex-wrap gap-2">
                  {visibleActions.map((s) => (
                    <Button
                      key={s.value}
                      size="sm"
                      variant="outline"
                      className={`${s.className} ${application.status === s.value ? 'ring-2 ring-ring' : 'opacity-70'}`}
                      onClick={() => handleStatusClick(s.value)}
                      disabled={statusMutation.isPending || assignReviewerMutation.isPending}
                    >
                      {s.label}
                    </Button>
                  ))}
                </div>
                {advancedActions.length > 0 && (
                  <>
                    <h4 className="mt-3 mb-2 text-xs font-medium text-muted-foreground">Kolejny etap rekrutacji</h4>
                    <div className="flex flex-wrap gap-2">
                      {advancedActions.map((s) => (
                        <Button
                          key={s.value}
                          size="sm"
                          variant="outline"
                          className={`${s.className} ${application.status === s.value ? 'ring-2 ring-ring' : 'opacity-70'}`}
                          onClick={() => handleStatusClick(s.value)}
                          disabled={statusMutation.isPending || assignReviewerMutation.isPending}
                        >
                          {s.label}
                        </Button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </>
          )}

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

          {/* RODO Delete button — admin only */}
          {onDelete && (
            <div className="pt-2">
              <Separator />
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => {
                  onDelete(application);
                  onClose();
                }}
              >
                <Trash2 className="h-4 w-4" /> Usuń kandydaturę (RODO)
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>

    <Dialog open={showCvPreview} onOpenChange={setShowCvPreview}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>CV — {application.first_name} {application.last_name}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 px-6 pb-6">
          <iframe
            src={cvSignedUrl || ''}
            className="w-full h-full rounded-md border"
            title="Podgląd CV"
          />
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};
