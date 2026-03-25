import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface SkillCategory {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

interface Skill {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface JobSkillViewRow {
  id: string;
  moscow_priority: string | null;
  skill: { name: string; category: { name: string } | null } | null;
  job: { title: string } | null;
}

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#64748b', '#14b8a6', '#f59e0b',
];

export default function Skills() {
  const queryClient = useQueryClient();

  // Category dialog state
  const [catDialog, setCatDialog] = useState(false);
  const [editingCat, setEditingCat] = useState<SkillCategory | null>(null);
  const [catName, setCatName] = useState('');
  const [catColor, setCatColor] = useState(PRESET_COLORS[0]);

  // Skill dialog state
  const [skillDialog, setSkillDialog] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [skillCategoryId, setSkillCategoryId] = useState('');
  const [skillName, setSkillName] = useState('');
  const [skillDescription, setSkillDescription] = useState('');
  const [openJobs, setOpenJobs] = useState<Record<string, boolean>>({});

  // Fetch categories
  const { data: categories = [], isLoading: catsLoading } = useQuery({
    queryKey: ['skill_categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skill_categories')
        .select('id, name, color, created_at')
        .order('name');
      if (error) throw error;
      return data as SkillCategory[];
    },
  });

  // Fetch skills
  const { data: skills = [], isLoading: skillsLoading } = useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skills')
        .select('id, category_id, name, description, created_at')
        .order('name');
      if (error) throw error;
      return data as Skill[];
    },
  });

  const { data: jobSkillRows = [], isLoading: jobSkillsLoading } = useQuery({
    queryKey: ['job_skills_view'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_skills')
        .select('id, moscow_priority, skill:skills(name, category:skill_categories(name)), job:jobs(title)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as JobSkillViewRow[];
    },
  });

  // Category mutations
  const saveCatMutation = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      if (editingCat) {
        const { error } = await supabase
          .from('skill_categories')
          .update({ name, color })
          .eq('id', editingCat.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('skill_categories')
          .insert({ name, color });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skill_categories'] });
      toast.success(editingCat ? 'Kategoria zaktualizowana' : 'Kategoria dodana');
      setCatDialog(false);
    },
    onError: () => toast.error('Nie udało się zapisać kategorii'),
  });

  const deleteCatMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('skill_categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skill_categories'] });
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      toast.success('Kategoria usunięta');
    },
    onError: () => toast.error('Nie udało się usunąć kategorii'),
  });

  // Skill mutations
  const saveSkillMutation = useMutation({
    mutationFn: async ({
      name,
      description,
      category_id,
    }: {
      name: string;
      description: string;
      category_id: string;
    }) => {
      if (editingSkill) {
        const { error } = await supabase
          .from('skills')
          .update({ name, description: description || null, category_id })
          .eq('id', editingSkill.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('skills')
          .insert({ name, description: description || null, category_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      toast.success(editingSkill ? 'Skill zaktualizowany' : 'Skill dodany');
      setSkillDialog(false);
    },
    onError: () => toast.error('Nie udało się zapisać skilla'),
  });

  const deleteSkillMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('skills').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      toast.success('Skill usunięty');
    },
    onError: () => toast.error('Nie udało się usunąć skilla'),
  });

  const openAddCat = () => {
    setEditingCat(null);
    setCatName('');
    setCatColor(PRESET_COLORS[0]);
    setCatDialog(true);
  };

  const openEditCat = (cat: SkillCategory) => {
    setEditingCat(cat);
    setCatName(cat.name);
    setCatColor(cat.color);
    setCatDialog(true);
  };

  const openAddSkill = (categoryId: string) => {
    setEditingSkill(null);
    setSkillCategoryId(categoryId);
    setSkillName('');
    setSkillDescription('');
    setSkillDialog(true);
  };

  const openEditSkill = (skill: Skill) => {
    setEditingSkill(skill);
    setSkillCategoryId(skill.category_id);
    setSkillName(skill.name);
    setSkillDescription(skill.description || '');
    setSkillDialog(true);
  };

  const isLoading = catsLoading || skillsLoading;
  const groupedJobSkills = jobSkillRows.reduce<Record<string, JobSkillViewRow[]>>((acc, row) => {
    const jobTitle = row.job?.title || 'Bez przypisanego ogłoszenia';
    if (!acc[jobTitle]) acc[jobTitle] = [];
    acc[jobTitle].push(row);
    return acc;
  }, {});

  const getMoscowBadge = (value: string | null) => {
    const normalized = (value || '').toLowerCase();
    if (normalized === 'must') return <Badge className="bg-red-100 text-red-700 border-red-200">Must</Badge>;
    if (normalized === 'should') return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Should</Badge>;
    if (normalized === 'could') return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Could</Badge>;
    if (normalized === "won't" || normalized === 'wont') {
      return <Badge className="bg-muted text-muted-foreground border-border">Won't</Badge>;
    }
    return <Badge variant="outline">{value || '—'}</Badge>;
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Matryca Skillsów</h1>
        <Button onClick={openAddCat}>
          <Plus className="mr-2 h-4 w-4" />
          Nowa kategoria
        </Button>
      </div>

      <div className="mb-8 rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold">Skille przypisane do stanowisk</h2>
        {jobSkillsLoading ? (
          <p className="text-sm text-muted-foreground">Ładowanie przypisań...</p>
        ) : Object.keys(groupedJobSkills).length === 0 ? (
          <p className="text-sm text-muted-foreground">Brak przypisanych skilli do ogłoszeń.</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(groupedJobSkills).map(([jobTitle, rows]) => (
              <Collapsible
                key={jobTitle}
                open={openJobs[jobTitle] ?? true}
                onOpenChange={(open) => setOpenJobs((prev) => ({ ...prev, [jobTitle]: open }))}
                className="rounded-md border border-border"
              >
                <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted/40">
                  <span className="text-sm font-medium">{jobTitle}</span>
                  {openJobs[jobTitle] ?? true ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Skill</TableHead>
                        <TableHead>Kategoria</TableHead>
                        <TableHead>MoSCoW</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">{row.skill?.name || '—'}</TableCell>
                          <TableCell>{row.skill?.category?.name || '—'}</TableCell>
                          <TableCell>{getMoscowBadge(row.moscow_priority)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Ładowanie...</div>
      ) : categories.length === 0 ? (
        <div className="text-center text-muted-foreground py-16">
          Brak kategorii. Dodaj pierwszą kategorię skillsów.
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((cat) => {
            const catSkills = skills.filter((s) => s.category_id === cat.id);
            return (
              <div key={cat.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <h2 className="text-sm font-semibold">{cat.name}</h2>
                    <Badge variant="secondary" className="text-xs">
                      {catSkills.length}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => openAddSkill(cat.id)}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Dodaj skill
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditCat(cat)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        if (
                          confirm(
                            'Usunąć kategorię? Wszystkie powiązane skille zostaną usunięte.'
                          )
                        ) {
                          deleteCatMutation.mutate(cat.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
                <Separator className="mb-3" />
                {catSkills.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2 px-1">
                    Brak skillsów w tej kategorii.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {catSkills.map((skill) => (
                      <div
                        key={skill.id}
                        className="flex items-center justify-between rounded-md px-3 py-2 bg-muted/40"
                      >
                        <div>
                          <p className="text-sm font-medium">{skill.name}</p>
                          {skill.description && (
                            <p className="text-xs text-muted-foreground">
                              {skill.description}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEditSkill(skill)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              if (confirm('Usunąć skill?')) {
                                deleteSkillMutation.mutate(skill.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog — Kategoria */}
      <Dialog open={catDialog} onOpenChange={setCatDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCat ? 'Edytuj kategorię' : 'Nowa kategoria'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nazwa</Label>
              <Input
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="np. Języki programowania"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && catName.trim()) {
                    saveCatMutation.mutate({ name: catName, color: catColor });
                  }
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Kolor</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`h-7 w-7 rounded-full transition-transform ${
                      catColor === c
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-background scale-110'
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => setCatColor(c)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialog(false)}>
              Anuluj
            </Button>
            <Button
              onClick={() => saveCatMutation.mutate({ name: catName, color: catColor })}
              disabled={!catName.trim() || saveCatMutation.isPending}
            >
              Zapisz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog — Skill */}
      <Dialog open={skillDialog} onOpenChange={setSkillDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSkill ? 'Edytuj skill' : 'Nowy skill'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nazwa skilla</Label>
              <Input
                value={skillName}
                onChange={(e) => setSkillName(e.target.value)}
                placeholder="np. TypeScript"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Opis (opcjonalnie)</Label>
              <Textarea
                value={skillDescription}
                onChange={(e) => setSkillDescription(e.target.value)}
                placeholder="Krótki opis skilla..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSkillDialog(false)}>
              Anuluj
            </Button>
            <Button
              onClick={() =>
                saveSkillMutation.mutate({
                  name: skillName,
                  description: skillDescription,
                  category_id: skillCategoryId,
                })
              }
              disabled={!skillName.trim() || saveSkillMutation.isPending}
            >
              Zapisz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
