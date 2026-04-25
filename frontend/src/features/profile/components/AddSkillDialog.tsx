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
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Search, Plus, Check } from 'lucide-react';
import { SkillService } from '@/services/skillService';
import { UserService } from '@/services/userService';
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
  // custom skill state
  const [customSelected, setCustomSelected] = useState(false);
  const [customCategory, setCustomCategory] = useState('Other');
  
  // Showcase Video State
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [subtitle, setSubtitle] = useState('');
  const [uploading, setUploading] = useState(false);

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

  // Show "create custom" card when query has no catalog matches
  const showCreateCustom = query.trim().length > 0 && filtered.length === 0;
  const totalToAdd = selected.size + (customSelected ? 1 : 0);

  const handleSave = async () => {
    if (totalToAdd === 0) {
      toast({ title: 'Select at least one skill', variant: 'destructive' });
      return;
    }
    setSaving(true);
    setUploading(true);
    try {
      let uploadedVideoUrl: string | undefined;
      
      // Upload video if one is selected
      if (videoFile && mode === 'offered') {
        const res = await UserService.uploadFile(videoFile);
        uploadedVideoUrl = res.url;
      }

      await Promise.all([
        ...Array.from(selected).map((id) => UserService.addSkill(id, mode, 'BEGINNER', uploadedVideoUrl, subtitle)),
        ...(customSelected
          ? [UserService.addCustomSkill(query.trim(), customCategory, mode, 'BEGINNER', uploadedVideoUrl, subtitle)]
          : []),
      ]);
      const added: Skill[] = [
        ...skills.filter((s) => selected.has(s.id)),
        ...(customSelected
          ? [{ id: `custom_${Date.now()}`, name: query.trim(), icon: 'Zap', category: customCategory, level: 'beginner' as Skill['level'], description: '' }]
          : []),
      ];
      onSave(added);
      setSaving(false);
      setUploading(false);
      setSelected(new Set());
      setCustomSelected(false);
      setCustomCategory('Other');
      setQuery('');
      setCategory('All');
      setVideoFile(null);
      setVideoPreview(null);
      setSubtitle('');
      onClose();
      toast({
        title: `${added.length} skill${added.length > 1 ? 's' : ''} added`,
        description: `Added to your ${mode === 'offered' ? 'teach' : 'learn'} list.`,
        variant: 'success',
      });
    } catch (err) {
      setSaving(false);
      setUploading(false);
      const msg = err instanceof Error ? err.message : null;
      toast({
        title: 'Could not add skill',
        description: msg ?? 'Something went wrong. Please try again in a moment.',
        variant: 'destructive',
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        toast({ title: 'File too large', description: 'Maximum video size is 50MB.', variant: 'destructive' });
        return;
      }
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const removeVideo = () => {
    setVideoFile(null);
    setVideoPreview(null);
    setSubtitle('');
  };

  const handleClose = () => {
    setSelected(new Set());
    setCustomSelected(false);
    setCustomCategory('Other');
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
            {filtered.length === 0 && !showCreateCustom && (
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

            {/* Create custom skill card */}
            {showCreateCustom && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-xl border p-3 transition-colors cursor-pointer ${
                  customSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-dashed border-border/60 hover:border-primary/40 hover:bg-muted/30'
                }`}
                onClick={() => setCustomSelected((v) => !v)}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-dashed ${
                    customSelected ? 'border-primary bg-primary/10' : 'border-border/50'
                  }`}>
                    {customSelected
                      ? <Check className="h-4 w-4 text-primary" />
                      : <Plus className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">
                      Create &ldquo;<span className="text-primary">{query.trim()}</span>&rdquo;
                    </p>
                    <p className="text-xs text-muted-foreground">Custom skill &mdash; not in the catalog yet</p>
                  </div>
                </div>

                {/* Category picker — only visible when toggled on */}
                {customSelected && (
                  <div className="mt-3 flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {['Programming', 'Design', 'Music', 'Language', 'Science', 'Business', 'Arts', 'Other'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCustomCategory(c)}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border transition-colors ${
                          customCategory === c
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border/40 text-muted-foreground hover:border-primary/40 hover:text-foreground'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </ScrollArea>

        {/* Showcase Video Upload */}
        {mode === 'offered' && totalToAdd > 0 && (
          <div className="mt-2 border-t border-border/40 pt-3">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              Add a Showcase Video <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
            </h4>
            {!videoPreview ? (
              <label className="flex flex-col items-center justify-center h-20 rounded-xl border-2 border-dashed border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer">
                <Plus className="h-5 w-5 text-muted-foreground mb-1" />
                <span className="text-xs font-medium text-muted-foreground">Upload short video proof (Max 50MB)</span>
                <input type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
              </label>
            ) : (
              <div className="space-y-2">
                <div className="relative rounded-xl overflow-hidden bg-black/5 h-28 flex items-center justify-center">
                  <video src={videoPreview} className="max-h-full max-w-full rounded-md" controls />
                  <button onClick={removeVideo} className="absolute top-1.5 right-1.5 p-1 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <Input
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Add a catchy subtitle for your community post..."
                  className="rounded-xl h-9 text-sm"
                  maxLength={100}
                />
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-3 mt-1">
          <span className="text-sm text-muted-foreground">
            {totalToAdd > 0 ? `${totalToAdd} selected` : 'None selected'}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl" onClick={handleClose}>Cancel</Button>
            <Button
              variant="gradient"
              disabled={totalToAdd === 0 || saving || uploading}
              onClick={handleSave}
            >
              {saving || uploading ? 'Saving...' : `Add ${totalToAdd > 0 ? totalToAdd : ''} Skill${totalToAdd !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
