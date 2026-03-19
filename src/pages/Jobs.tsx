import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hrApi } from '@/lib/hr-api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Pencil, Trash2, Users, Calendar, Briefcase, UserCheck } from 'lucide-react';
import { JobFormDialog } from '@/components/jobs/JobFormDialog';
import { useAuth } from '@/contexts/AuthContext';
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
  published_at: string | null;
  closed_at: string | null;
  application_count?: number;
  reviewers?: string[];
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: 'Szkic', className: 'bg-muted text-muted-foreground' },
  active: { label: 'Aktywne', className: 'bg-emerald-900/50 text-emerald-400 border-emerald-800' },
  closed: { label: 'Zamknięte', className: 'bg-red-900/50 text-red-400 border-red-800' },
};

const statusFilters = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'active', label: 'Aktywne' },
  { value: 'draft', label: 'Szkice' },
  { value: 'closed', label: 'Zamknięte' },
];

const Jobs = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin, isReviewer } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [filter, setFilter] = useState('active');

  const { data: jobs, isLoading, isError } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => hrApi<Job[]>('list_jobs'),
    meta: { errorMessage: 'Nie udało się pobrać ogłoszeń' },
  });

  // Show toast on error
  if (isError) {
    // toast handled via query meta or we show inline
  }

  const deleteMutation = useMutation({
    mutationFn: (id: string) => hrApi('delete_job', { id }),
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

  const filteredJobs = jobs?.filter(j => filter === 'all' || j.status === filter);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Rekrutacje</h1>
        {isAdmin && (
          <Button onClick={() => { setEditingJob(null); setDialogOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Nowe ogłoszenie
          </Button>
        )}
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
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
      ) : isError ? (
        <div className="text-center py-16 space-y-2">
          <p className="text-destructive font-medium">Nie udało się pobrać ogłoszeń</p>
          <p className="text-sm text-muted-foreground">Sprawdź połączenie i odśwież stronę.</p>
        </div>
      ) : isReviewer && (!filteredJobs || filteredJobs.length === 0) ? (
        <div className="text-center text-muted-foreground py-16 space-y-2">
          <p className="font-medium text-foreground">Brak przypisanych recenzji</p>
          <p className="text-sm">Nie masz jeszcze przypisanych kandydatur do oceny. Skontaktuj się z administratorem.</p>
        </div>
      ) : filteredJobs?.length === 0 ? (
        <div className="text-center text-muted-foreground py-16">
          Brak ogłoszeń w tej kategorii. Dodaj pierwsze ogłoszenie.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredJobs?.map((job) => (
            <Card
              key={job.id}
              className="cursor-pointer transition-colors hover:border-primary/40"
              onClick={() => navigate(`/jobs/${job.id}/applications`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">{job.title}</CardTitle>
                  <Badge className={statusConfig[job.status]?.className}>
                    {statusConfig[job.status]?.label || job.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pb-3">
                {job.department && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Briefcase className="h-3.5 w-3.5" />
                    {job.department}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  {job.application_count} {job.application_count === 1 ? 'kandydatura' : 'kandydatur'}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(job.created_at).toLocaleDateString('pl-PL')}
                </div>
                {job.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {job.description}
                  </p>
                )}
                {job.reviewers && job.reviewers.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <UserCheck className="h-3.5 w-3.5 text-primary" />
                    <span className="truncate">{job.reviewers.join(', ')}</span>
                  </div>
                )}
              </CardContent>
              {isAdmin && (
                <CardFooter className="pt-0">
                  <div className="flex gap-1 ml-auto">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => handleEdit(e, job)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => handleDelete(e, job.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </CardFooter>
              )}
            </Card>
          ))}
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
