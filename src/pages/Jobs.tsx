import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { JobFormDialog } from '@/components/jobs/JobFormDialog';
import { toast } from 'sonner';

interface Job {
  id: string;
  title: string;
  department: string | null;
  description: string | null;
  responsibilities: string[] | null;
  requirements: string[] | null;
  status: string;
  created_at: string;
  application_count?: number;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Szkic', className: 'bg-muted text-muted-foreground' },
  active: { label: 'Aktywne', className: 'bg-emerald-900/50 text-emerald-400 border-emerald-800' },
  closed: { label: 'Zamknięte', className: 'bg-red-900/50 text-red-400 border-red-800' },
};

const Jobs = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const { data: jobsData, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Get application counts
      const { data: counts, error: countError } = await supabase
        .from('applications')
        .select('job_id');
      if (countError) throw countError;

      const countMap: Record<string, number> = {};
      counts?.forEach((a: any) => {
        countMap[a.job_id] = (countMap[a.job_id] || 0) + 1;
      });

      return (jobsData as Job[]).map((j) => ({
        ...j,
        application_count: countMap[j.id] || 0,
      }));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('jobs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Ogłoszenie usunięte');
    },
    onError: () => toast.error('Nie udało się usunąć ogłoszenia'),
  });

  const handleEdit = (e: React.MouseEvent, job: Job) => {
    e.stopPropagation();
    setEditingJob(job);
    setDialogOpen(true);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Czy na pewno chcesz usunąć to ogłoszenie?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ogłoszenia o pracę</h1>
        <Button onClick={() => { setEditingJob(null); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Nowe ogłoszenie
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Ładowanie...</div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tytuł</TableHead>
                <TableHead>Dział</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Kandydatury</TableHead>
                <TableHead>Data utworzenia</TableHead>
                <TableHead className="w-24">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs?.map((job) => (
                <TableRow
                  key={job.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/jobs/${job.id}/applications`)}
                >
                  <TableCell className="font-medium">{job.title}</TableCell>
                  <TableCell>{job.department || '—'}</TableCell>
                  <TableCell>
                    <Badge className={statusConfig[job.status]?.className}>
                      {statusConfig[job.status]?.label || job.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{job.application_count}</TableCell>
                  <TableCell>{new Date(job.created_at).toLocaleDateString('pl-PL')}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={(e) => handleEdit(e, job)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={(e) => handleDelete(e, job.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {jobs?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Brak ogłoszeń. Dodaj pierwsze ogłoszenie.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <JobFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingJob={editingJob}
      />
    </div>
  );
};

export default Jobs;
