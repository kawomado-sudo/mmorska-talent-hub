import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Save } from 'lucide-react';
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

  const { data: configs, isLoading } = useQuery({
    queryKey: ['form-config'],
    queryFn: async () => {
      const { data, error } = await supabase.from('form_config').select('*');
      if (error) throw error;
      return data;
    },
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

  if (isLoading) return <div className="p-6 text-muted-foreground">Ładowanie...</div>;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ustawienia formularza</h1>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          <Save className="mr-2 h-4 w-4" />
          {saveMutation.isPending ? 'Zapisywanie...' : 'Zapisz zmiany'}
        </Button>
      </div>

      <div className="max-w-2xl space-y-6 rounded-lg border bg-card p-6">
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
  );
};

export default SettingsPage;
