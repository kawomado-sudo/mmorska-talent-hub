import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { hrApi } from '@/lib/hr-api';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, FileUp, Loader2, LayoutList, LayoutGrid } from 'lucide-react';
import { CandidateDrawer } from '@/components/applications/CandidateDrawer';
import { KanbanBoard } from '@/components/applications/KanbanBoard';
import { toast } from 'sonner';

const getInitials = (name: string) => {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
};

const statusFilters = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'new', label: 'Nowe' },
  { value: 'reviewing', label: 'U recenzenta' },
  { value: 'hold', label: 'Hold' },
  { value: 'accepted', label: 'Zaakceptowane' },
  { value: 'rejected', label: 'Odrzucone' },
  { value: 'in_review', label: 'W recenzji' },
  { value: 'screening_test', label: 'Screening test' },
  { value: 'interview', label: 'Rozmowa' },
  { value: 'offer', label: 'Oferta' },
];

const statusBadge: Record<string, { label: string; className: string }> = {
  new: { label: 'Nowe', className: 'bg-blue-600 text-white border-blue-600' },
  reviewing: { label: 'U recenzenta', className: 'bg-sky-600 text-white border-sky-600' },
  hold: { label: 'Hold', className: 'bg-amber-500 text-white border-amber-500' },
  accepted: { label: 'Zaakceptowane', className: 'bg-emerald-600 text-white border-emerald-600' },
  rejected: { label: 'Odrzucone', className: 'bg-red-600 text-white border-red-600' },
  in_review: { label: 'W recenzji', className: 'bg-violet-600 text-white border-violet-600' },
  screening_test: { label: 'Screening test', className: 'bg-indigo-600 text-white border-indigo-600' },
  interview: { label: 'Rozmowa', className: 'bg-cyan-600 text-white border-cyan-600' },
  offer: { label: 'Oferta', className: 'bg-yellow-500 text-white border-yellow-500' },
};

const ratingColor = (rating: number | null) => {
  if (!rating) return 'text-muted-foreground';
  if (rating >= 75) return 'text-emerald-400';
  if (rating >= 50) return 'text-yellow-400';
  return 'text-red-400';
};

const Applications = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isReviewer } = useAuth();
  const [filter, setFilter] = useState('all');
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');

  const { data: job } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => hrApi('get_job', { id: jobId }),
  });

  const { data: applications, isLoading, isError } = useQuery({
    queryKey: ['applications', jobId, viewMode === 'kanban' ? 'all' : filter, isReviewer],
    queryFn: () => hrApi('list_applications', {
      job_id: jobId,
      status: viewMode === 'kanban' ? 'all' : filter,
      reviewer_only: isReviewer,
    }),
  });

  const handleFileUpload = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('Dozwolone są tylko pliki PDF');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Plik nie może być większy niż 10 MB');
      return;
    }

    setUploading(true);
    try {
      const filePath = `${jobId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('hr-cv')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-cv`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ job_id: jobId, cv_storage_path: filePath }),
        }
      );

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Błąd parsowania CV');
      }

      toast.success('CV przesłane i przeanalizowane przez AI');
      queryClient.invalidateQueries({ queryKey: ['applications', jobId] });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Nie udało się przesłać CV');
    } finally {
      setUploading(false);
    }
  }, [jobId, queryClient]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    e.target.value = '';
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/jobs')} className="mb-2 gap-1">
          <ArrowLeft className="h-4 w-4" /> Ogłoszenia
        </Button>
        <h1 className="text-2xl font-bold">{job?.title || 'Kandydatury'}</h1>
        {isReviewer && (
          <p className="text-sm text-muted-foreground mt-1">
            Widzisz tylko kandydatury przypisane do Twojej oceny.
          </p>
        )}
      </div>

      {/* Ukryj upload CV dla recenzenta */}
      {!isReviewer && (
        <div
          className={`mb-6 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
            dragOver ? 'border-primary bg-primary/5' : 'border-border'
          } ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Przetwarzanie CV przez AI...
            </div>
          ) : (
            <div className="space-y-2">
              <FileUp className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Przeciągnij plik CV (PDF) lub{' '}
                <label className="cursor-pointer text-primary underline underline-offset-2">
                  wybierz z dysku
                  <input type="file" accept=".pdf" className="hidden" onChange={handleFileInput} />
                </label>
              </p>
              <p className="text-xs text-muted-foreground">AI automatycznie wyciągnie dane i oceni dopasowanie</p>
            </div>
          )}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((s) => (
            <Button
              key={s.value}
              variant={filter === s.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(s.value)}
            >
              {s.label}
            </Button>
          ))}
        </div>
        <div className="flex gap-1 ml-4">
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="icon"
            className="h-9 w-9"
            onClick={() => setViewMode('table')}
          >
            <LayoutList className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'outline'}
            size="icon"
            className="h-9 w-9"
            onClick={() => setViewMode('kanban')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Ładowanie...</div>
      ) : isError ? (
        <div className="text-center py-16 space-y-2">
          <p className="text-destructive font-medium">Nie udało się pobrać kandydatur</p>
          <p className="text-sm text-muted-foreground">Sprawdź połączenie i odśwież stronę.</p>
        </div>
      ) : isReviewer && (!applications || applications.length === 0) ? (
        <div className="text-center py-16 space-y-2">
          <p className="font-medium text-foreground">Brak przypisanych kandydatur</p>
          <p className="text-sm text-muted-foreground">Nie masz jeszcze przypisanych kandydatur do oceny w tym ogłoszeniu.</p>
        </div>
      ) : viewMode === 'kanban' ? (
        <KanbanBoard applications={applications || []} onSelectApp={setSelectedApp} />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Imię i nazwisko</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Data aplikacji</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Recenzent</TableHead>
                <TableHead>Dopasowanie AI</TableHead>
                <TableHead>AI Summary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications?.map((app: any) => (
                <TableRow key={app.id} className="cursor-pointer" onClick={() => setSelectedApp(app)}>
                  <TableCell className="font-medium">{app.first_name} {app.last_name}</TableCell>
                  <TableCell>{app.email}</TableCell>
                  <TableCell>{new Date(app.created_at).toLocaleDateString('pl-PL')}</TableCell>
                  <TableCell>
                    <Badge className={statusBadge[app.status]?.className}>
                      {statusBadge[app.status]?.label || app.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {app.reviewer_name ? (
                      <div className="flex items-center gap-2" title={app.reviewer_name}>
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                            {getInitials(app.reviewer_name)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {app.ai_rating != null ? (
                      <div className="flex items-center gap-2">
                        <Progress value={app.ai_rating} className="h-2 w-16" />
                        <span className={`text-xs font-medium ${ratingColor(app.ai_rating)}`}>
                          {app.ai_rating}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">
                    {app.ai_summary ? app.ai_summary.substring(0, 80) + (app.ai_summary.length > 80 ? '…' : '') : '—'}
                  </TableCell>
                </TableRow>
              ))}
              {applications?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    {isReviewer ? 'Brak przypisanych kandydatur do oceny.' : 'Brak kandydatur. Prześlij CV aby dodać kandydata.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <CandidateDrawer
        application={selectedApp}
        onClose={() => setSelectedApp(null)}
        jobId={jobId!}
      />
    </div>
  );
};

export default Applications;
