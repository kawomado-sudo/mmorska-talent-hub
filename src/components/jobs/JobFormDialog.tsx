import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { hrApi } from '@/lib/hr-api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface JobFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingJob: any | null;
}

export const JobFormDialog = ({ open, onOpenChange, editingJob }: JobFormDialogProps) => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [description, setDescription] = useState('');
  const [responsibilities, setResponsibilities] = useState('');
  const [requirements, setRequirements] = useState('');
  const [status, setStatus] = useState('draft');

  useEffect(() => {
    if (editingJob) {
      setTitle(editingJob.title || '');
      setDepartment(editingJob.department || '');
      setDescription(editingJob.description || '');
      setResponsibilities(Array.isArray(editingJob.responsibilities) ? editingJob.responsibilities.join('\n') : '');
      setRequirements(Array.isArray(editingJob.requirements) ? editingJob.requirements.join('\n') : '');
      setStatus(editingJob.status || 'draft');
    } else {
      setTitle(''); setDepartment(''); setDescription('');
      setResponsibilities(''); setRequirements(''); setStatus('draft');
    }
  }, [editingJob, open]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title,
        department: department || null,
        description: description || null,
        responsibilities: responsibilities.split('\n').filter(Boolean),
        requirements: requirements.split('\n').filter(Boolean),
        status,
        ...(status === 'active' && !editingJob?.published_at ? { published_at: new Date().toISOString() } : {}),
        ...(status === 'closed' && !editingJob?.closed_at ? { closed_at: new Date().toISOString() } : {}),
      };

      if (editingJob) {
        await hrApi('update_job', { id: editingJob.id, payload });
      } else {
        await hrApi('create_job', { payload });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      onOpenChange(false);
      toast.success(editingJob ? 'Ogłoszenie zaktualizowane' : 'Ogłoszenie utworzone');
    },
    onError: () => toast.error('Wystąpił błąd'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingJob ? 'Edytuj ogłoszenie' : 'Nowe ogłoszenie'}</DialogTitle>
          <DialogDescription>Wypełnij dane ogłoszenia rekrutacyjnego.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Tytuł</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nazwa stanowiska" />
          </div>
          <div className="grid gap-2">
            <Label>Dział</Label>
            <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="np. Marketing" />
          </div>
          <div className="grid gap-2">
            <Label>Opis</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>

          <div className="grid gap-2">
            <Label>Obowiązki</Label>
            <Textarea
              value={responsibilities}
              onChange={(e) => setResponsibilities(e.target.value)}
              rows={4}
              placeholder="Wpisz obowiązki, każdy w nowej linii"
            />
          </div>

          <div className="grid gap-2">
            <Label>Wymagania</Label>
            <Textarea
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              rows={4}
              placeholder="Wpisz wymagania, każde w nowej linii"
            />
          </div>

          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Szkic</SelectItem>
                <SelectItem value="active">Aktywne</SelectItem>
                <SelectItem value="closed">Zamknięte</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={() => mutation.mutate()} disabled={!title || mutation.isPending}>
            {mutation.isPending ? 'Zapisywanie...' : 'Zapisz'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
