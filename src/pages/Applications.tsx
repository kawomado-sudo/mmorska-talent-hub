import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft } from 'lucide-react';
import { CandidateDrawer } from '@/components/applications/CandidateDrawer';

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

const Applications = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [selectedApp, setSelectedApp] = useState<any>(null);

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

  return (
    <div className="p-6">
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/jobs')} className="mb-2 gap-1">
          <ArrowLeft className="h-4 w-4" /> Ogłoszenia
        </Button>
        <h1 className="text-2xl font-bold">{job?.title || 'Kandydatury'}</h1>
      </div>

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
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">
                    {app.ai_summary ? app.ai_summary.substring(0, 80) + (app.ai_summary.length > 80 ? '…' : '') : '—'}
                  </TableCell>
                </TableRow>
              ))}
              {applications?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Brak kandydatur.
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
