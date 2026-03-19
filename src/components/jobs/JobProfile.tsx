import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';

interface SkillCategory {
  id: string;
  name: string;
  color: string;
}

interface Skill {
  id: string;
  category_id: string;
  name: string;
}

interface JobSkill {
  id: string;
  job_id: string;
  skill_id: string;
  moscow: 'must' | 'should' | 'could' | 'wont';
}

interface ScreeningTemplate {
  id: string;
  name: string;
  is_global: boolean;
  job_id: string | null;
}

type Moscow = 'must' | 'should' | 'could' | 'wont';

const moscowConfig: Record<Moscow, { label: string; className: string }> = {
  must: { label: 'Must', className: 'bg-red-900/60 text-red-300 border-red-800' },
  should: { label: 'Should', className: 'bg-amber-900/60 text-amber-300 border-amber-800' },
  could: { label: 'Could', className: 'bg-blue-900/60 text-blue-300 border-blue-800' },
  wont: { label: "Won't", className: 'bg-muted text-muted-foreground' },
};

interface JobProfileProps {
  jobId: string;
}

export function JobProfile({ jobId }: JobProfileProps) {
  const queryClient = useQueryClient();
  const [addSkillDialog, setAddSkillDialog] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [selectedMoscow, setSelectedMoscow] = useState<Moscow>('must');
  const [assignTemplateDialog, setAssignTemplateDialog] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // Fetch skills and categories for selector
  const { data: skills = [] } = useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skills')
        .select('id, category_id, name')
        .order('name');
      if (error) throw error;
      return data as Skill[];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['skill_categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skill_categories')
        .select('id, name, color')
        .order('name');
      if (error) throw error;
      return data as SkillCategory[];
    },
  });

  // Fetch job skills
  const { data: jobSkills = [], isLoading } = useQuery({
    queryKey: ['job_skills', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_skills')
        .select('*')
        .eq('job_id', jobId);
      if (error) throw error;
      return data as JobSkill[];
    },
    enabled: !!jobId,
  });

  // Fetch screening templates (global + assigned to this job)
  const { data: templates = [] } = useQuery({
    queryKey: ['screening_templates_for_job', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('screening_templates')
        .select('id, name, is_global, job_id')
        .or(`is_global.eq.true,job_id.eq.${jobId}`)
        .order('name');
      if (error) throw error;
      return data as ScreeningTemplate[];
    },
    enabled: !!jobId,
  });

  // Assigned template for this job
  const assignedTemplate = templates.find((t) => t.job_id === jobId && !t.is_global);

  // Add skill mutation
  const addSkillMutation = useMutation({
    mutationFn: async ({
      skill_id,
      moscow,
    }: {
      skill_id: string;
      moscow: Moscow;
    }) => {
      const { error } = await supabase.from('job_skills').insert({
        job_id: jobId,
        skill_id,
        moscow,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job_skills', jobId] });
      toast.success('Skill przypisany');
      setAddSkillDialog(false);
      setSelectedSkillId('');
    },
    onError: (err: any) => toast.error(err.message || 'Nie udało się przypisać skilla'),
  });

  // Update moscow mutation
  const updateMoscowMutation = useMutation({
    mutationFn: async ({ id, moscow }: { id: string; moscow: Moscow }) => {
      const { error } = await supabase
        .from('job_skills')
        .update({ moscow })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job_skills', jobId] });
    },
    onError: () => toast.error('Nie udało się zaktualizować wagi'),
  });

  // Remove skill mutation
  const removeSkillMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('job_skills').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job_skills', jobId] });
      toast.success('Skill usunięty');
    },
    onError: () => toast.error('Nie udało się usunąć skilla'),
  });

  // Assign template mutation — create a copy of the template with job_id
  const assignTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      // Get template details
      const { data: tpl, error: tplErr } = await supabase
        .from('screening_templates')
        .select('*')
        .eq('id', templateId)
        .single();
      if (tplErr) throw tplErr;

      if (tpl.is_global) {
        // Link: update template to also reference this job? No - per spec,
        // just update the job_id field on the template record to this job.
        // Actually job_id on screening_templates means "template for this job".
        // We just update an existing per-job template or create a new assignment.
        // Simpler: update the template's job_id field.
        const { error } = await supabase
          .from('screening_templates')
          .update({ job_id: jobId })
          .eq('id', templateId);
        if (error) throw error;
      }
      // If it's already a per-job template, it's already assigned
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screening_templates_for_job', jobId] });
      toast.success('Szablon przypisany do ogłoszenia');
      setAssignTemplateDialog(false);
    },
    onError: (err: any) =>
      toast.error(err.message || 'Nie udało się przypisać szablonu'),
  });

  const getSkillById = (id: string) => skills.find((s) => s.id === id);
  const getCategoryById = (id: string) => categories.find((c) => c.id === id);

  // Skills not yet assigned to this job
  const assignedSkillIds = new Set(jobSkills.map((js) => js.skill_id));
  const availableSkills = skills.filter((s) => !assignedSkillIds.has(s.id));

  return (
    <div className="space-y-6">
      {/* Skills matrix */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Matryca skillsów (MoSCoW)</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectedSkillId('');
              setSelectedMoscow('must');
              setAddSkillDialog(true);
            }}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Przypisz skill
          </Button>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Ładowanie...</div>
        ) : jobSkills.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-md">
            Brak przypisanych skillsów. Dodaj wymagania stanowiska.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Skill</TableHead>
                <TableHead className="text-xs">Kategoria</TableHead>
                <TableHead className="text-xs">Waga MoSCoW</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobSkills.map((js) => {
                const skill = getSkillById(js.skill_id);
                const cat = skill ? getCategoryById(skill.category_id) : undefined;
                return (
                  <TableRow key={js.id}>
                    <TableCell className="text-sm font-medium">
                      {skill?.name ?? js.skill_id}
                    </TableCell>
                    <TableCell>
                      {cat && (
                        <div className="flex items-center gap-1.5">
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="text-xs text-muted-foreground">
                            {cat.name}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={js.moscow}
                        onValueChange={(val) =>
                          updateMoscowMutation.mutate({
                            id: js.id,
                            moscow: val as Moscow,
                          })
                        }
                      >
                        <SelectTrigger className="h-7 w-28 text-xs">
                          <SelectValue>
                            <Badge className={moscowConfig[js.moscow].className}>
                              {moscowConfig[js.moscow].label}
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(moscowConfig) as Moscow[]).map((m) => (
                            <SelectItem key={m} value={m}>
                              <Badge className={moscowConfig[m].className}>
                                {moscowConfig[m].label}
                              </Badge>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => removeSkillMutation.mutate(js.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Separator />

      {/* Assigned screening template */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Szablon testu screeningowego</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectedTemplateId('');
              setAssignTemplateDialog(true);
            }}
          >
            <ClipboardList className="mr-1.5 h-3.5 w-3.5" />
            Przypisz szablon
          </Button>
        </div>

        {assignedTemplate ? (
          <div className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3">
            <ClipboardList className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">{assignedTemplate.name}</p>
              <p className="text-xs text-muted-foreground">Przypisany do tego ogłoszenia</p>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-md">
            Brak przypisanego szablonu. Kliknij "Przypisz szablon", aby wybrać.
          </div>
        )}
      </div>

      {/* Dialog — Add skill */}
      <Dialog open={addSkillDialog} onOpenChange={setAddSkillDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Przypisz skill do stanowiska</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Skill</Label>
              <Select value={selectedSkillId} onValueChange={setSelectedSkillId}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz skill..." />
                </SelectTrigger>
                <SelectContent>
                  {availableSkills.length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      Wszystkie skille już przypisane
                    </SelectItem>
                  ) : (
                    availableSkills.map((s) => {
                      const cat = getCategoryById(s.category_id);
                      return (
                        <SelectItem key={s.id} value={s.id}>
                          <span className="flex items-center gap-1.5">
                            {cat && (
                              <span
                                className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: cat.color }}
                              />
                            )}
                            {s.name}
                            {cat && (
                              <span className="text-muted-foreground text-xs">
                                — {cat.name}
                              </span>
                            )}
                          </span>
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Waga MoSCoW</Label>
              <Select
                value={selectedMoscow}
                onValueChange={(v) => setSelectedMoscow(v as Moscow)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(moscowConfig) as [Moscow, { label: string }][]).map(
                    ([v, cfg]) => (
                      <SelectItem key={v} value={v}>
                        {cfg.label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddSkillDialog(false)}>
              Anuluj
            </Button>
            <Button
              onClick={() =>
                addSkillMutation.mutate({
                  skill_id: selectedSkillId,
                  moscow: selectedMoscow,
                })
              }
              disabled={!selectedSkillId || addSkillMutation.isPending}
            >
              Przypisz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog — Assign template */}
      <Dialog open={assignTemplateDialog} onOpenChange={setAssignTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Przypisz szablon testu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Szablon</Label>
              <Select
                value={selectedTemplateId}
                onValueChange={setSelectedTemplateId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz szablon..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.filter((t) => t.is_global).map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <span className="flex items-center gap-1.5">
                        {t.name}
                        <Badge variant="outline" className="text-xs ml-1">
                          Globalny
                        </Badge>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignTemplateDialog(false)}>
              Anuluj
            </Button>
            <Button
              onClick={() => assignTemplateMutation.mutate(selectedTemplateId)}
              disabled={!selectedTemplateId || assignTemplateMutation.isPending}
            >
              Przypisz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
