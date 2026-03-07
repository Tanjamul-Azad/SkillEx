'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Search, Plus, Check } from 'lucide-react';
import { SkillService } from '@/services/skillService';
import type { Skill } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  /** 'offered' = skills I can teach, 'wanted' = skills I want to learn */
  mode: 'offered' | 'wanted';
  existingIds: string[];
  onSave: (added: Skill[]) => void;
}

const CATEGORIES = ['All', 'Programming', 'Design', 'Music', 'Language', 'Science', 'Business', 'Arts'];

const levelColor: Record<string, string> = {
  beginner: 'bg-emerald-500/10 text-emerald-600',
  intermediate: 'bg-blue-500/10 text-blue-600',
  advanced: 'bg-purple-500/10 text-purple-600',
  expert: 'bg-amber-500/10 text-amber-600',
};

export function AddSkillDialog({ open, onClose, mode, existingIds, onSave }: Props) {
  const { toast } = useToast();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    SkillService.getAll()
      .then((data) => setSkills(Array.isArray(data) ? data : []))
      .catch(() => setSkills([]));
  }, [open]);

  const filtered = useMemo(() => {
    return skills.filter((s) => {
      const qMatch = s.name.toLowerCase().includes(query.toLowerCase()) || s.description?.toLowerCase().includes(query.toLowerCase());
      const cMatch = category === 'All' || s.category === category;
      return qMatch && cMatch;
    });
  }, [skills, query, category]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (selected.size === 0) {
      toast({ title: 'Select at least one skill', variant: 'destructive' });
      return;
    }
    setSaving(true);
    // TODO: PATCH /api/users/:id with new skill ids
    await new Promise((r) => setTimeout(r, 700));
    const added = skills.filter((s) => selected.has(s.id));
    onSave(added);
    setSaving(false);
    setSelected(new Set());
    setQuery('');
    setCategory('All');
    onClose();
    toast({
      title: `${selected.size} skill${selected.size > 1 ? 's' : ''} added`,
      description: `Added to your ${mode === 'offered' ? 'teach' : 'learn'} list.`,
      variant: 'success',
    });
  };

  const handleClose = () => {
    setSelected(new Set());
    setQuery('');
    setCategory('All');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-lg rounded-2xl border-border/60 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl font-extrabold flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            {mode === 'offered' ? 'Add a Skill You Can Teach' : 'Add a Skill You Want to Learn'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'offered'
              ? 'Select skills from the catalog that you are confident teaching.'
              : 'What would you like to learn from others?'}
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search skills..."
            className="pl-9 rounded-xl"
          />
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <Button
              key={c}
              variant="ghost"
              size="sm"
              onClick={() => setCategory(c)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition-colors border h-auto",
                category === c
                  ? 'bg-primary text-primary-foreground border-primary hover:bg-primary hover:text-primary-foreground'
                  : 'border-border/40 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-transparent'
              )}
            >
              {c}
            </Button>
          ))}
        </div>

        {/* Skill list */}
        <ScrollArea className="h-64 -mx-1 px-1">
          <div className="space-y-1.5">
            {filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No skills match your search.</p>
            )}
            {filtered.map((skill) => {
              const already = existingIds.includes(skill.id);
              const checked = selected.has(skill.id);
              return (
                <motion.label
                  key={skill.id}
                  htmlFor={`add-skill-${skill.id}`}
                  whileHover={{ scale: 1.01 }}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors ${already
                    ? 'cursor-not-allowed opacity-50 border-border/30 bg-muted/30'
                    : checked
                      ? 'border-primary bg-primary/5'
                      : 'border-border/40 hover:border-primary/30 hover:bg-muted/40'
                    }`}
                >
                  <Checkbox
                    id={`add-skill-${skill.id}`}
                    checked={checked || already}
                    disabled={already}
                    onCheckedChange={() => !already && toggle(skill.id)}
                    className="shrink-0"
                  />
                  <span className="text-xl shrink-0">{skill.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{skill.name}</p>
                    {skill.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{skill.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="outline" className={`text-xs capitalize ${levelColor[skill.level] ?? ''}`}>{skill.level}</Badge>
                    {already && <Check className="h-3.5 w-3.5 text-emerald-500" />}
                  </div>
                </motion.label>
              );
            })}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-3">
          <span className="text-sm text-muted-foreground">
            {selected.size > 0 ? `${selected.size} selected` : 'None selected'}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl" onClick={handleClose}>Cancel</Button>
            <Button
              variant="gradient"
              disabled={selected.size === 0 || saving}
              onClick={handleSave}
            >
              {saving ? 'Saving...' : `Add ${selected.size > 0 ? selected.size : ''} Skill${selected.size !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
