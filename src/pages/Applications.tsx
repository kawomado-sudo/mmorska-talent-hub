import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Upload, FileUp, Loader2 } from 'lucide-react';
import { CandidateDrawer } from '@/components/applications/CandidateDrawer';
import { toast } from 'sonner';

const statusFilters = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'new', label: 'Nowe' },
  { value: 'reviewing', label: 'W ocenie' },
  { value: 'hold', label: 'Hold' },
  { value: 'accepted', label: 'Zaakceptowane' },
  { value: 'rejected', label: 'Odrzucone' },
];

const statusBadge: Record<string, { label: string; className: string }> = {
  new: { label: 'Nowe', className: 'bg-blue-900/50 text-blue-400 border-blue-800' },
  reviewing: { label: 'W ocenie', className: 'bg-sky-900/50 text-sky-400 border-sky-800' },
  hold: { label: 'Hold', className: 'bg-yellow-900/50 text-yellow-400 border-yellow-800' },
  accepted: { label: 'Zaakceptowane', className: 'bg-emerald-900/50 text-emerald-400 border-emerald-800' },
  rejected: { label: 'Odrzucone', className: 'bg-red-900/50 text-red-400 border-red-800' },
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
  const [filter, setFilter] = useState('all');
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const { data: job } = useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      const { data, error } = await supabase.from('jobs').select('*').eq('id', jobId!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: applications, isLoading } = useQuery({
    queryKey: ['applications', jobId, filter],
    queryFn: async () => {
      let query = supabase.from('applications').select('*').eq('job_id', jobId!).order('created_at', { ascending: false });
      if (filter !== 'all') query = query.eq('status', filter);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
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

      // Call parse-cv edge function
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
      </div>

      {/* CV Upload zone */}
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

      {/* Status filters */}
      <div className="mb-4 flex flex-wrap gap-2">
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

      {isLoading ? (
        <div className="text-muted-foreground">Ładowanie...</div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Imię i nazwisko</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Data aplikacji</TableHead>
                <TableHead>Status</TableHead>
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
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Brak kandydatur. Prześlij CV aby dodać kandydata.
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
