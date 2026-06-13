import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BookOpen, Sparkles, Plus, Loader2, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SkillService, type SkillIntentInterpretResponse, type SkillIntentSuggestion } from '@/services/skillService';
import { UserService } from '@/services/userService';
import type { User, Skill } from '@/types';
import { cn } from '@/lib/utils';

const LEVEL_DISPLAY: Record<string, string> = {
  BEGINNER: 'Beginner',
  MODERATE: 'Moderate',
  EXPERT: 'Expert',
  Beginner: 'Beginner',
  Moderate: 'Moderate',
  Expert: 'Expert',
};

const LEVEL_OPTIONS = ['BEGINNER', 'MODERATE', 'EXPERT'] as const;
const SKILL_TYPE_LABEL: Record<'offered' | 'wanted', string> = {
  offered: 'Skills I Teach',
  wanted: 'Skills I Want to Learn',
};

const normalizeLevel = (level?: string): 'BEGINNER' | 'MODERATE' | 'EXPERT' => {
  const upper = (level ?? 'MODERATE').toUpperCase();
  if (upper === 'BEGINNER' || upper === 'MODERATE' || upper === 'EXPERT') return upper;
  return 'MODERATE';
};

interface SkillsTabProps {
  user: User | null;
  refreshUser: () => Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toast: (options: any) => void;
}

export default function SkillsTab({ user, refreshUser, toast }: SkillsTabProps) {
  // Intent fields
  const [teachIntentText, setTeachIntentText] = useState(user?.teachIntentText ?? '');
  const [learnIntentText, setLearnIntentText] = useState(user?.learnIntentText ?? '');

  // AI suggestions
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [interpretation, setInterpretation] = useState<SkillIntentInterpretResponse | null>(null);
  const [addingSkill, setAddingSkill] = useState(false);

  // Skill lists / removal
  const [removingSkillId, setRemovingSkillId] = useState<string | null>(null);
  const [editingSkillKey, setEditingSkillKey] = useState<string | null>(null);
  const [editingSkillLevel, setEditingSkillLevel] = useState<'BEGINNER' | 'MODERATE' | 'EXPERT'>('MODERATE');
  const [savingEditSkillKey, setSavingEditSkillKey] = useState<string | null>(null);

  // Manual catalog search
  const [skillCatalog, setSkillCatalog] = useState<Skill[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [manualQuery, setManualQuery] = useState('');
  const [manualType, setManualType] = useState<'offered' | 'wanted'>('offered');
  const [manualLevel, setManualLevel] = useState<'BEGINNER' | 'MODERATE' | 'EXPERT'>('MODERATE');
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [bulkAdding, setBulkAdding] = useState(false);

  // Fetch full skill catalog on mount
  useEffect(() => {
    let mounted = true;
    setCatalogLoading(true);
    SkillService.getAll()
      .then((skills) => {
        if (mounted) setSkillCatalog(Array.isArray(skills) ? skills : []);
      })
      .catch(() => {
        if (mounted) setSkillCatalog([]);
      })
      .finally(() => {
        if (mounted) setCatalogLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleInterpretSkills = async () => {
    if (!teachIntentText.trim() && !learnIntentText.trim()) return;

    setIsInterpreting(true);
    try {
      const result = await SkillService.interpretIntent({
        teachText: teachIntentText || undefined,
        learnText: learnIntentText || undefined,
      });
      setInterpretation(result);
      if (result.teach?.primary || result.learn?.primary) {
        toast({ title: 'AI suggestions ready', description: 'Review below and click Add to confirm.', variant: 'success' });
      } else {
        toast({ title: 'No match found', description: 'Try rephrasing or pick manually.', variant: 'destructive' });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Suggestion failed', description: 'Could not interpret text right now.' });
    } finally {
      setIsInterpreting(false);
    }
  };

  const handleAddSkill = useCallback(async (suggestion: SkillIntentSuggestion, type: 'offered' | 'wanted') => {
    const currentSkills = type === 'offered' ? (user?.skillsOffered ?? []) : (user?.skillsWanted ?? []);
    const currentSkillIds = new Set(currentSkills.map((s) => s.id));
    const currentSkillNames = new Set(currentSkills.map((s) => s.name.toLowerCase()));

    const catalogSkillId = suggestion.skillId;

    if (catalogSkillId && currentSkillIds.has(catalogSkillId)) {
      toast({
        title: 'Already added',
        description: `"${suggestion.skillName}" is already in ${SKILL_TYPE_LABEL[type]}.`,
      });
      return;
    }

    if (!catalogSkillId && currentSkillNames.has(suggestion.skillName.toLowerCase())) {
      toast({
        title: 'Already added',
        description: `"${suggestion.skillName}" is already in ${SKILL_TYPE_LABEL[type]}.`,
      });
      return;
    }

    setAddingSkill(true);
    try {
      if (catalogSkillId) {
        await UserService.addSkill(catalogSkillId, type, 'MODERATE');
      } else {
        await UserService.addCustomSkill(suggestion.skillName, suggestion.category || 'Other', type, 'MODERATE', undefined, undefined, true);
      }
      await refreshUser();
      toast({
        title: `"${suggestion.skillName}" added!`,
        description: catalogSkillId ? 'Added from existing catalog.' : 'Added as a new AI-detected skill.',
        variant: 'success',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Try again.';
      if (typeof msg === 'string' && /(already|exists|duplicate)/i.test(msg)) {
        toast({
          title: 'Already added',
          description: `"${suggestion.skillName}" is already in ${SKILL_TYPE_LABEL[type]}.`,
        });
      } else {
        toast({ variant: 'destructive', title: 'Could not add skill', description: msg });
      }
    } finally {
      setAddingSkill(false);
    }
  }, [refreshUser, toast, user?.skillsOffered, user?.skillsWanted]);

  const handleRemoveSkill = useCallback(async (skillId: string, type: 'offered' | 'wanted') => {
    setRemovingSkillId(skillId);
    try {
      await UserService.removeSkill(skillId, type);
      await refreshUser();
      toast({ title: 'Skill removed', variant: 'success' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Could not remove skill', description: err instanceof Error ? err.message : 'Try again.' });
    } finally {
      setRemovingSkillId(null);
    }
  }, [refreshUser, toast]);

  const existingTargetSkillIds = useMemo(() => {
    const source = manualType === 'offered' ? (user?.skillsOffered ?? []) : (user?.skillsWanted ?? []);
    return new Set(source.map((s) => s.id));
  }, [manualType, user?.skillsOffered, user?.skillsWanted]);

  const filteredCatalog = useMemo(() => {
    const query = manualQuery.trim().toLowerCase();
    return skillCatalog
      .filter((skill) => !existingTargetSkillIds.has(skill.id))
      .filter((skill) => {
        if (!query) return true;
        return skill.name.toLowerCase().includes(query) || skill.category.toLowerCase().includes(query);
      })
      .slice(0, 12);
  }, [existingTargetSkillIds, manualQuery, skillCatalog]);

  const toggleSelectedSkill = (skillId: string) => {
    setSelectedSkillIds((prev) => (prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId]));
  };

  const handleBulkAddSkills = async () => {
    if (selectedSkillIds.length === 0) return;
    setBulkAdding(true);
    let added = 0;
    let failed = 0;
    const duplicateNames: string[] = [];
    const failedNames: string[] = [];
    const targetExistingIds = new Set((manualType === 'offered' ? (user?.skillsOffered ?? []) : (user?.skillsWanted ?? [])).map((s) => s.id));
    const catalogNameById = new Map(skillCatalog.map((s) => [s.id, s.name]));

    for (const skillId of selectedSkillIds) {
      const skillName = catalogNameById.get(skillId) ?? 'Unknown skill';
      if (targetExistingIds.has(skillId)) {
        duplicateNames.push(skillName);
        continue;
      }

      try {
        await UserService.addSkill(skillId, manualType, manualLevel);
        added += 1;
        targetExistingIds.add(skillId);
      } catch {
        failed += 1;
        failedNames.push(skillName);
      }
    }

    await refreshUser();
    setSelectedSkillIds([]);
    setBulkAdding(false);

    if (added > 0) {
      toast({
        title: `${added} skill${added > 1 ? 's' : ''} added`,
        description:
          duplicateNames.length > 0
            ? `Skipped duplicates: ${duplicateNames.join(', ')}.`
            : failed > 0
              ? `${failed} failed. You can retry them.`
              : 'Your profile is updated.',
        variant: 'success',
      });
      if (failedNames.length > 0) {
        toast({
          variant: 'destructive',
          title: 'Some skills were not added',
          description: `Failed: ${failedNames.join(', ')}.`,
        });
      }
    } else {
      if (duplicateNames.length > 0 && failed === 0) {
        toast({
          title: 'No new skills to add',
          description: `All selected skills are already in ${SKILL_TYPE_LABEL[manualType]}: ${duplicateNames.join(', ')}.`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Could not add selected skills',
          description:
            failedNames.length > 0
              ? `Failed: ${failedNames.join(', ')}.`
              : 'Please try again in a moment.',
        });
      }
    }
  };

  const startEditingSkill = (skill: Skill, type: 'offered' | 'wanted') => {
    setEditingSkillKey(`${type}:${skill.id}`);
    setEditingSkillLevel(normalizeLevel(skill.level));
  };

  const saveEditedSkill = async (skill: Skill, type: 'offered' | 'wanted') => {
    const key = `${type}:${skill.id}`;
    setSavingEditSkillKey(key);

    try {
      await UserService.removeSkill(skill.id, type);
      const existsInCatalog = skillCatalog.some((catalogSkill) => catalogSkill.id === skill.id);

      if (existsInCatalog) {
        await UserService.addSkill(skill.id, type, editingSkillLevel);
      } else {
        await UserService.addCustomSkill(skill.name, skill.category, type, editingSkillLevel);
      }

      await refreshUser();
      setEditingSkillKey(null);
      toast({ title: `Updated ${skill.name}`, description: `Level set to ${LEVEL_DISPLAY[editingSkillLevel]}.`, variant: 'success' });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Could not update skill',
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setSavingEditSkillKey(null);
    }
  };

  const offeredSkills = user?.skillsOffered ?? [];
  const wantedSkills = user?.skillsWanted ?? [];
  const teachPrimary = interpretation?.teach?.primary ?? null;
  const learnPrimary = interpretation?.learn?.primary ?? null;
  const teachAlternatives = (interpretation?.teach?.alternatives ?? [])
    .filter((suggestion) => {
      if (!teachPrimary) return true;
      if (teachPrimary.skillId && suggestion.skillId) return teachPrimary.skillId !== suggestion.skillId;
      return teachPrimary.skillName.toLowerCase() !== suggestion.skillName.toLowerCase();
    })
    .slice(0, 4);
  const learnAlternatives = (interpretation?.learn?.alternatives ?? [])
    .filter((suggestion) => {
      if (!learnPrimary) return true;
      if (learnPrimary.skillId && suggestion.skillId) return learnPrimary.skillId !== suggestion.skillId;
      return learnPrimary.skillName.toLowerCase() !== suggestion.skillName.toLowerCase();
    })
    .slice(0, 4);

  return (
    <div className="space-y-6">
      {/* AI Detection Panel */}
      <div className="overflow-hidden rounded-[2rem] border border-primary bg-primary text-primary-foreground shadow-sm relative">
        <div className="p-6 border-b border-primary-foreground/20 relative z-10">
          <h3 className="text-xl font-extrabold font-headline text-primary-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5" /> AI Skill Detection
          </h3>
          <p className="text-[10px] uppercase font-bold tracking-widest text-primary-foreground mt-1">Describe what you can teach and what you want to learn. We'll suggest matching skills.</p>
        </div>
        <div className="p-6 space-y-4 relative z-10">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-widest text-primary-foreground">What can you teach?</label>
              <textarea
                value={teachIntentText}
                onChange={(e) => {
                  setTeachIntentText(e.target.value);
                  setInterpretation(null);
                }}
                placeholder="e.g. I can teach React, TypeScript and frontend architecture"
                className="w-full resize-none rounded-xl border border-primary/20 bg-background px-4 py-3 text-sm placeholder:text-muted-foreground/60 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[100px] custom-scrollbar appearance-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-widest text-primary-foreground">What do you want to learn?</label>
              <textarea
                value={learnIntentText}
                onChange={(e) => {
                  setLearnIntentText(e.target.value);
                  setInterpretation(null);
                }}
                placeholder="e.g. I want to learn digital marketing and SEO"
                className="w-full resize-none rounded-xl border border-primary/20 bg-background px-4 py-3 text-sm placeholder:text-muted-foreground/60 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[100px] custom-scrollbar appearance-none"
              />
            </div>
          </div>
          <Button
            className="gap-2 border border-primary-foreground bg-primary text-primary-foreground hover:bg-primary rounded-xl font-bold shadow-none transition-all min-w-[160px]"
            disabled={isInterpreting || (!teachIntentText.trim() && !learnIntentText.trim())}
            onClick={handleInterpretSkills}
          >
            {isInterpreting ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</> : <><Sparkles className="h-4 w-4" /> Suggest Skills</>}
          </Button>

          {interpretation && (
            <div className="grid gap-4 sm:grid-cols-2 pt-2">
              {teachPrimary && (
                <div className="flex items-center justify-between rounded-2xl border border-primary-foreground bg-primary px-4 py-3 shadow-sm">
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-primary-foreground">Teach suggestion</p>
                    <p className="font-bold text-primary-foreground mt-0.5 flex items-center gap-2">
                      {teachPrimary.skillName}
                      <span className="text-[10px] font-bold tracking-widest text-primary-foreground">({teachPrimary.confidence}%)</span>
                      {teachPrimary.custom && (
                        <span className="rounded-full border border-primary-foreground px-2 py-0.5 text-[9px] uppercase tracking-widest font-black text-primary-foreground">AI New</span>
                      )}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-lg text-xs font-bold gap-1 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary shadow-none"
                    disabled={addingSkill}
                    onClick={() => handleAddSkill(teachPrimary, 'offered')}
                  >
                    <Plus className="h-3 w-3" /> Add
                  </Button>
                </div>
              )}
              {learnPrimary && (
                <div className="flex items-center justify-between rounded-2xl border border-primary-foreground bg-primary px-4 py-3 shadow-sm">
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-primary-foreground">Learn suggestion</p>
                    <p className="font-bold text-primary-foreground mt-0.5 flex items-center gap-2">
                      {learnPrimary.skillName}
                      <span className="text-[10px] font-bold tracking-widest text-primary-foreground">({learnPrimary.confidence}%)</span>
                      {learnPrimary.custom && (
                        <span className="rounded-full border border-primary-foreground px-2 py-0.5 text-[9px] uppercase tracking-widest font-black text-primary-foreground">AI New</span>
                      )}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-lg text-xs font-bold gap-1 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary shadow-none"
                    disabled={addingSkill}
                    onClick={() => handleAddSkill(learnPrimary, 'wanted')}
                  >
                    <Plus className="h-3 w-3" /> Add
                  </Button>
                </div>
              )}
            </div>
          )}

          {interpretation && (teachAlternatives.length > 0 || learnAlternatives.length > 0) && (
            <div className="grid gap-4 sm:grid-cols-2 pt-1">
              <div className="rounded-2xl border border-primary-foreground bg-primary p-3">
                <p className="text-[10px] uppercase font-bold tracking-widest text-primary-foreground mb-2">More teach suggestions</p>
                {teachAlternatives.length === 0 ? (
                  <p className="text-[10px] uppercase tracking-widest text-primary-foreground">No additional teach suggestions.</p>
                ) : (
                  <div className="space-y-2">
                    {teachAlternatives.map((suggestion, idx) => (
                      <div key={`teach-alt-${suggestion.skillId ?? suggestion.skillName}-${idx}`} className="flex items-center justify-between rounded-xl border border-primary-foreground bg-primary px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-primary-foreground">{suggestion.skillName}</p>
                          <p className="text-[10px] uppercase tracking-widest text-primary-foreground">{suggestion.confidence}%</p>
                        </div>
                        <Button size="sm" variant="outline" className="h-7 rounded-lg text-[10px] font-bold border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary" disabled={addingSkill} onClick={() => handleAddSkill(suggestion, 'offered')}>
                          Add
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-primary-foreground bg-primary p-3">
                <p className="text-[10px] uppercase font-bold tracking-widest text-primary-foreground mb-2">More learn suggestions</p>
                {learnAlternatives.length === 0 ? (
                  <p className="text-[10px] uppercase tracking-widest text-primary-foreground">No additional learn suggestions.</p>
                ) : (
                  <div className="space-y-2">
                    {learnAlternatives.map((suggestion, idx) => (
                      <div key={`learn-alt-${suggestion.skillId ?? suggestion.skillName}-${idx}`} className="flex items-center justify-between rounded-xl border border-primary-foreground bg-primary px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-primary-foreground">{suggestion.skillName}</p>
                          <p className="text-[10px] uppercase tracking-widest text-primary-foreground">{suggestion.confidence}%</p>
                        </div>
                        <Button size="sm" variant="outline" className="h-7 rounded-lg text-[10px] font-bold border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary" disabled={addingSkill} onClick={() => handleAddSkill(suggestion, 'wanted')}>
                          Add
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Manual Add Panel */}
      <div className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]">
        <div className="p-6 border-b border-border bg-muted/20">
          <h3 className="text-xl font-extrabold font-headline text-foreground flex items-center gap-2">
            <Plus className="h-5 w-5 text-accent" /> Manual Add
          </h3>
          <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-1">Select multiple skills and add them in one click.</p>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <Input
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                placeholder="Search by skill name or category..."
                className="appearance-none bg-background border-border text-foreground placeholder:text-muted-foreground/60 focus:ring-primary/50 focus:border-primary rounded-xl"
              />
            </div>
            <div>
              <Select value={manualType} onValueChange={(value: 'offered' | 'wanted') => { setManualType(value); setSelectedSkillIds([]); }}>
                <SelectTrigger className="appearance-none bg-background border-border text-foreground focus:ring-primary/50 focus:border-primary rounded-xl font-bold">
                  <SelectValue placeholder="Skill type" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border rounded-xl">
                  <SelectItem value="offered">I can teach this</SelectItem>
                  <SelectItem value="wanted">I want to learn this</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:max-w-[220px]">
              <Select value={manualLevel} onValueChange={(value: 'BEGINNER' | 'MODERATE' | 'EXPERT') => setManualLevel(value)}>
                <SelectTrigger className="appearance-none bg-background border-border text-foreground focus:ring-primary/50 focus:border-primary rounded-xl font-bold">
                  <SelectValue placeholder="Skill level" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border rounded-xl">
                  {LEVEL_OPTIONS.map((level) => (
                    <SelectItem key={level} value={level}>{LEVEL_DISPLAY[level]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary rounded-xl font-bold shadow-none transition-all"
              disabled={bulkAdding || selectedSkillIds.length === 0}
              onClick={handleBulkAddSkills}
            >
              {bulkAdding ? <><Loader2 className="h-4 w-4 animate-spin" /> Adding...</> : <><Plus className="h-4 w-4" /> Add selected ({selectedSkillIds.length})</>}
            </Button>
          </div>

          <div className="rounded-2xl border border-border bg-muted/20 p-4 min-h-[100px] shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]">
            {catalogLoading ? (
              <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin text-primary" /> Loading skill catalog...</p>
            ) : filteredCatalog.length === 0 ? (
              <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">No matching skills found for this filter.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {filteredCatalog.map((skill) => {
                  const selected = selectedSkillIds.includes(skill.id);
                  return (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => toggleSelectedSkill(skill.id)}
                      className={cn(
                        'rounded-xl border px-3 py-1.5 text-[11px] uppercase tracking-widest font-black transition-all shadow-sm',
                        selected
                          ? 'border-primary bg-primary text-primary-foreground shadow-sm scale-[1.02]'
                          : 'border-border bg-background text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground hover:bg-muted/10'
                      )}
                    >
                      {skill.name} <span className={cn("opacity-80 font-medium ml-1", selected ? "text-primary-foreground" : "text-muted-foreground/50")}>· {skill.category}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Skills I Teach */}
      <div className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]">
        <div className="p-6 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-extrabold font-headline text-foreground flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" /> Skills I Teach
            </h3>
            <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-1">Manage your teaching skills and adjust levels anytime.</p>
          </div>
          <span className="bg-primary text-primary-foreground border border-primary px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.2em] font-extrabold shadow-sm whitespace-nowrap">{offeredSkills.length} skill{offeredSkills.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="p-6">
          {offeredSkills.length === 0 ? (
            <p className="text-[10px] py-4 uppercase font-bold tracking-widest text-muted-foreground text-center border-2 border-dashed border-border rounded-2xl">No teaching skills yet. Use AI Detection or Manual Add above.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {offeredSkills.map((skill) => {
                const rowKey = `offered:${skill.id}`;
                const isEditing = editingSkillKey === rowKey;
                const isSavingEdit = savingEditSkillKey === rowKey;
                return (
                  <div key={rowKey} className="rounded-2xl border border-border bg-muted/10 p-4 transition-all hover:bg-muted/30 group shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <span className="font-bold text-foreground text-base block">{skill.name}</span>
                        <Badge variant="outline" className="text-[9px] uppercase tracking-widest font-black mt-1.5 border-border bg-muted/20 text-muted-foreground">{LEVEL_DISPLAY[normalizeLevel(skill.level)]}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" className="h-8 text-[10px] uppercase font-bold tracking-widest hover:bg-muted text-muted-foreground hover:text-foreground px-3 rounded-xl transition-colors" onClick={() => startEditingSkill(skill, 'offered')}>
                          Edit
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-xl text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                          disabled={removingSkillId === skill.id}
                          onClick={() => handleRemoveSkill(skill.id, 'offered')}
                        >
                          {removingSkillId === skill.id ? <Loader2 className="h-4 w-4 animate-spin text-destructive" /> : <X className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    {isEditing && (
                      <div className="mt-4 pt-4 border-t border-border flex flex-col gap-3">
                        <Select value={editingSkillLevel} onValueChange={(value: 'BEGINNER' | 'MODERATE' | 'EXPERT') => setEditingSkillLevel(value)}>
                          <SelectTrigger className="h-10 appearance-none bg-background border-border text-foreground rounded-xl focus:ring-primary/50 focus:border-primary font-bold font-bold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border rounded-xl">
                            {LEVEL_OPTIONS.map((level) => (
                              <SelectItem key={level} value={level}>{LEVEL_DISPLAY[level]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="ghost" className="h-8 text-[10px] uppercase font-bold tracking-widest hover:bg-muted rounded-lg" disabled={isSavingEdit} onClick={() => setEditingSkillKey(null)}>
                            Cancel
                          </Button>
                          <Button size="sm" className="h-8 text-[10px] uppercase font-bold tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-[0_0_10px_hsl(var(--primary)/0.2)]" disabled={isSavingEdit} onClick={() => saveEditedSkill(skill, 'offered')}>
                            {isSavingEdit ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save Level'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Skills I Want to Learn */}
      <div className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]">
        <div className="p-6 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-extrabold font-headline text-foreground flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-accent" /> Skills I Want to Learn
            </h3>
            <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-1">Track your learning goals and tune level preferences.</p>
          </div>
          <span className="bg-primary text-primary-foreground border border-primary px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.2em] font-extrabold shadow-sm whitespace-nowrap">{wantedSkills.length} skill{wantedSkills.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="p-6">
          {wantedSkills.length === 0 ? (
            <p className="text-[10px] py-4 uppercase font-bold tracking-widest text-muted-foreground text-center border-2 border-dashed border-border rounded-2xl">No learning goals yet. Use AI Detection or Manual Add above.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {wantedSkills.map((skill) => {
                const rowKey = `wanted:${skill.id}`;
                const isEditing = editingSkillKey === rowKey;
                const isSavingEdit = savingEditSkillKey === rowKey;
                return (
                  <div key={rowKey} className="rounded-2xl border border-border bg-muted/10 p-4 transition-all hover:bg-muted/30 group shadow-[inset_0_1px_0_0_hsla(0,0%,100%,0.05)]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <span className="font-bold text-foreground text-base block">{skill.name}</span>
                        <Badge variant="outline" className="text-[9px] uppercase tracking-widest font-black mt-1.5 border-border bg-muted/20 text-muted-foreground">{LEVEL_DISPLAY[normalizeLevel(skill.level)]}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" className="h-8 text-[10px] uppercase font-bold tracking-widest hover:bg-muted text-muted-foreground hover:text-foreground px-3 rounded-xl transition-colors" onClick={() => startEditingSkill(skill, 'wanted')}>
                          Edit
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-xl text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                          disabled={removingSkillId === skill.id}
                          onClick={() => handleRemoveSkill(skill.id, 'wanted')}
                        >
                          {removingSkillId === skill.id ? <Loader2 className="h-4 w-4 animate-spin text-destructive" /> : <X className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    {isEditing && (
                      <div className="mt-4 pt-4 border-t border-border flex flex-col gap-3">
                        <Select value={editingSkillLevel} onValueChange={(value: 'BEGINNER' | 'MODERATE' | 'EXPERT') => setEditingSkillLevel(value)}>
                          <SelectTrigger className="h-10 appearance-none bg-background border-border text-foreground rounded-xl focus:ring-primary/50 focus:border-primary font-bold">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border rounded-xl">
                            {LEVEL_OPTIONS.map((level) => (
                              <SelectItem key={level} value={level}>{LEVEL_DISPLAY[level]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="ghost" className="h-8 text-[10px] uppercase font-bold tracking-widest hover:bg-muted rounded-lg" disabled={isSavingEdit} onClick={() => setEditingSkillKey(null)}>
                            Cancel
                          </Button>
                          <Button size="sm" className="h-8 text-[10px] uppercase font-bold tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-[0_0_10px_hsl(var(--primary)/0.2)]" disabled={isSavingEdit} onClick={() => saveEditedSkill(skill, 'wanted')}>
                            {isSavingEdit ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save Level'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
