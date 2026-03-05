import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';

interface JobFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingJob: any | null;
}

export const JobFormDialog = ({ open, onOpenChange, editingJob }: JobFormDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [description, setDescription] = useState('');
  const [responsibilities, setResponsibilities] = useState<string[]>(['']);
  const [requirements, setRequirements] = useState<string[]>(['']);
  const [status, setStatus] = useState('draft');

  useEffect(() => {
    if (editingJob) {
      setTitle(editingJob.title || '');
      setDepartment(editingJob.department || '');
      setDescription(editingJob.description || '');
      setResponsibilities(editingJob.responsibilities?.length ? editingJob.responsibilities : ['']);
      setRequirements(editingJob.requirements?.length ? editingJob.requirements : ['']);
      setStatus(editingJob.status || 'draft');
    } else {
      setTitle(''); setDepartment(''); setDescription('');
      setResponsibilities(['']); setRequirements(['']); setStatus('draft');
    }
  }, [editingJob, open]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title,
        department: department || null,
        description: description || null,
        responsibilities: responsibilities.filter(Boolean),
        requirements: requirements.filter(Boolean),
        status,
        ...(editingJob ? {} : { created_by: user?.id }),
        ...(status === 'active' && !editingJob?.published_at ? { published_at: new Date().toISOString() } : {}),
        ...(status === 'closed' && !editingJob?.closed_at ? { closed_at: new Date().toISOString() } : {}),
      };

      if (editingJob) {
        const { error } = await supabase.from('jobs').update(payload).eq('id', editingJob.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('jobs').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      onOpenChange(false);
      toast.success(editingJob ? 'Ogłoszenie zaktualizowane' : 'Ogłoszenie utworzone');
    },
    onError: () => toast.error('Wystąpił błąd'),
  });

  const addItem = (list: string[], setList: (v: string[]) => void) => setList([...list, '']);
  const removeItem = (list: string[], setList: (v: string[]) => void, idx: number) =>
    setList(list.filter((_, i) => i !== idx));
  const updateItem = (list: string[], setList: (v: string[]) => void, idx: number, val: string) =>
    setList(list.map((item, i) => (i === idx ? val : item)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingJob ? 'Edytuj ogłoszenie' : 'Nowe ogłoszenie'}</DialogTitle>
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
            {responsibilities.map((item, idx) => (
              <div key={idx} className="flex gap-2">
                <Input value={item} onChange={(e) => updateItem(responsibilities, setResponsibilities, idx, e.target.value)} />
                {responsibilities.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => removeItem(responsibilities, setResponsibilities, idx)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => addItem(responsibilities, setResponsibilities)}>
              <Plus className="mr-1 h-3 w-3" /> Dodaj
            </Button>
          </div>

          <div className="grid gap-2">
            <Label>Wymagania</Label>
            {requirements.map((item, idx) => (
              <div key={idx} className="flex gap-2">
                <Input value={item} onChange={(e) => updateItem(requirements, setRequirements, idx, e.target.value)} />
                {requirements.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => removeItem(requirements, setRequirements, idx)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => addItem(requirements, setRequirements)}>
              <Plus className="mr-1 h-3 w-3" /> Dodaj
            </Button>
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
