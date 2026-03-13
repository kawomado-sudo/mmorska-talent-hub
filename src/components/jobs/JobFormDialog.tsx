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
import { Sparkles, Loader2 } from 'lucide-react';
import { supabaseAuth } from '@/integrations/supabase/client';

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
  const [isAiLoading, setIsAiLoading] = useState(false);

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

  const handleAiGenerate = async () => {
    if (!title.trim()) return;
    setIsAiLoading(true);
    try {
      const { data: { session } } = await supabaseAuth.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-job-description`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: title.trim(),
            department: department.trim() || undefined,
            draft_description: description.trim() || undefined,
            draft_responsibilities: responsibilities.trim() || undefined,
            draft_requirements: requirements.trim() || undefined,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'AI error');

      setDescription(data.description || '');
      setResponsibilities(Array.isArray(data.responsibilities) ? data.responsibilities.join('\n') : '');
      setRequirements(Array.isArray(data.requirements) ? data.requirements.join('\n') : '');
      toast.success('AI wygenerowało opis stanowiska');
    } catch (err: any) {
      console.error('AI generation error:', err);
      toast.error('Błąd generowania opisu AI');
    } finally {
      setIsAiLoading(false);
    }
  };

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

          <Button
            type="button"
            variant="outline"
            onClick={handleAiGenerate}
            disabled={!title.trim() || isAiLoading}
            className="w-full border-dashed border-primary/50 text-primary hover:bg-primary/5"
          >
            {isAiLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                AI generuje opis...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Dopracuj z AI
              </>
            )}
          </Button>

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
