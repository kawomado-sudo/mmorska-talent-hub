import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { hrApi } from '@/lib/hr-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { X, Plus, Save, UserCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const CONFIG_KEYS = [
  { key: 'form_header_title', label: 'Tytuł nagłówka', type: 'input' },
  { key: 'form_header_description', label: 'Opis nagłówka', type: 'textarea' },
  { key: 'process_step_1', label: 'Krok 1', type: 'input' },
  { key: 'process_step_2', label: 'Krok 2', type: 'input' },
  { key: 'process_step_3', label: 'Krok 3', type: 'input' },
  { key: 'process_step_4', label: 'Krok 4', type: 'input' },
  { key: 'work_tags', label: 'Tagi "Pracujemy w"', type: 'tags' },
  { key: 'rodo_text', label: 'Tekst RODO', type: 'textarea' },
  { key: 'success_title', label: 'Tytuł ekranu sukcesu', type: 'input' },
  { key: 'success_description', label: 'Opis ekranu sukcesu', type: 'textarea' },
];

const SettingsPage = () => {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [tagInput, setTagInput] = useState('');
  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState('');

  // Form config
  const { data: configs, isLoading } = useQuery({
    queryKey: ['form-config'],
    queryFn: async () => {
      const { data, error } = await supabase.from('form_config').select('*');
      if (error) throw error;
      return data;
    },
  });

  // Reviewers
  const { data: reviewers, isLoading: reviewersLoading } = useQuery({
    queryKey: ['reviewers'],
    queryFn: () => hrApi('list_reviewers'),
  });

  // Team members (for adding new reviewers)
  const { data: teamMembers } = useQuery({
    queryKey: ['team-members'],
    queryFn: () => hrApi('list_team_members'),
  });

  useEffect(() => {
    if (configs) {
      const map: Record<string, string> = {};
      configs.forEach((c: any) => { map[c.key] = c.value || ''; });
      setValues(map);
    }
  }, [configs]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const cfg of CONFIG_KEYS) {
        const val = values[cfg.key] || '';
        const existing = configs?.find((c: any) => c.key === cfg.key);
        if (existing) {
          await supabase.from('form_config').update({ value: val, updated_at: new Date().toISOString() }).eq('key', cfg.key);
        } else {
          await supabase.from('form_config').insert({ key: cfg.key, value: val });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-config'] });
      toast.success('Ustawienia zapisane');
    },
    onError: () => toast.error('Nie udało się zapisać'),
  });

  const addReviewerMutation = useMutation({
    mutationFn: async () => {
      const member = teamMembers?.find((m: any) => m.auth_user_id === selectedTeamMemberId);
      if (!member) throw new Error('Nie znaleziono pracownika');
      await hrApi('add_reviewer', {
        auth_user_id: member.auth_user_id,
        full_name: member.full_name || `${member.first_name} ${member.last_name}`,
        email: member.email,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviewers'] });
      setSelectedTeamMemberId('');
      toast.success('Recenzent dodany');
    },
    onError: (e: any) => toast.error(e.message || 'Nie udało się dodać recenzenta'),
  });

  const removeReviewerMutation = useMutation({
    mutationFn: async (reviewerId: string) => {
      await hrApi('remove_reviewer', { id: reviewerId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviewers'] });
      toast.success('Recenzent usunięty');
    },
    onError: () => toast.error('Nie udało się usunąć recenzenta'),
  });

  const tags = (values.work_tags || '').split(',').filter(Boolean);
  const addTag = () => {
    if (!tagInput.trim()) return;
    const newTags = [...tags, tagInput.trim()].join(',');
    setValues({ ...values, work_tags: newTags });
    setTagInput('');
  };
  const removeTag = (idx: number) => {
    const newTags = tags.filter((_, i) => i !== idx).join(',');
    setValues({ ...values, work_tags: newTags });
  };

  // Filter out team members who are already reviewers
  const reviewerUserIds = new Set(reviewers?.map((r: any) => r.auth_user_id) || []);
  const availableMembers = teamMembers?.filter(
    (m: any) => m.auth_user_id && !reviewerUserIds.has(m.auth_user_id)
  ) || [];

  if (isLoading) return <div className="p-6 text-muted-foreground">Ładowanie...</div>;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ustawienia</h1>
      </div>

      <div className="max-w-2xl space-y-8">
        {/* ─── Sekcja: Recenzenci ─── */}
        <div className="rounded-lg border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Recenzenci</h2>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Pracownicy, którzy mogą oceniać przypisanych kandydatów.
          </p>

          {/* Lista recenzentów */}
          <div className="mb-4 space-y-2">
            {reviewersLoading ? (
              <p className="text-sm text-muted-foreground">Ładowanie...</p>
            ) : reviewers?.length === 0 ? (
              <p className="text-sm text-muted-foreground">Brak recenzentów. Dodaj poniżej.</p>
            ) : (
              reviewers?.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div>
                    <span className="text-sm font-medium">{r.full_name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{r.email}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => removeReviewerMutation.mutate(r.id)}
                    disabled={removeReviewerMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>

          {/* Dodawanie recenzenta */}
          <div className="flex gap-2">
            <Select value={selectedTeamMemberId} onValueChange={setSelectedTeamMemberId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Wybierz pracownika..." />
              </SelectTrigger>
              <SelectContent>
                {availableMembers.map((m: any) => (
                  <SelectItem key={m.auth_user_id} value={m.auth_user_id}>
                    {m.full_name || `${m.first_name} ${m.last_name}`} — {m.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => addReviewerMutation.mutate()}
              disabled={!selectedTeamMemberId || addReviewerMutation.isPending}
            >
              <Plus className="mr-1 h-4 w-4" /> Dodaj
            </Button>
          </div>
        </div>

        <Separator />

        {/* ─── Sekcja: Formularz ─── */}
        <div className="rounded-lg border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Ustawienia formularza</h2>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {saveMutation.isPending ? 'Zapisywanie...' : 'Zapisz zmiany'}
            </Button>
          </div>

          <div className="space-y-6">
            {CONFIG_KEYS.map((cfg) => {
              if (cfg.type === 'tags') {
                return (
                  <div key={cfg.key} className="grid gap-2">
                    <Label>{cfg.label}</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {tags.map((tag, idx) => (
                        <Badge key={idx} variant="secondary" className="gap-1">
                          {tag}
                          <button onClick={() => removeTag(idx)}><X className="h-3 w-3" /></button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Nowy tag" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} />
                      <Button variant="outline" size="icon" onClick={addTag}><Plus className="h-4 w-4" /></Button>
                    </div>
                  </div>
                );
              }
              return (
                <div key={cfg.key} className="grid gap-2">
                  <Label>{cfg.label}</Label>
                  {cfg.type === 'textarea' ? (
                    <Textarea value={values[cfg.key] || ''} onChange={(e) => setValues({ ...values, [cfg.key]: e.target.value })} rows={3} />
                  ) : (
                    <Input value={values[cfg.key] || ''} onChange={(e) => setValues({ ...values, [cfg.key]: e.target.value })} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
