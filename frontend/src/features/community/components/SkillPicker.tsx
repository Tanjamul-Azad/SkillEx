import React from 'react';
import { cn } from '@/lib/utils';
import type { Skill } from '@/types';

interface SkillPickerProps {
  skills: Skill[];
  selected: string[];
  onChange: (ids: string[]) => void;
  limit?: number;
}

export function SkillPicker({
  skills,
  selected,
  onChange,
  limit = 4,
}: SkillPickerProps) {
  const visibleSkills = skills.slice(0, 16);

  const toggleSkill = (skillId: string) => {
    if (selected.includes(skillId)) {
      onChange(selected.filter(id => id !== skillId));
      return;
    }
    if (selected.length < limit) {
      onChange([...selected, skillId]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {visibleSkills.map(skill => {
        const active = selected.includes(skill.id);
        return (
          <button
            key={skill.id}
            type="button"
            onClick={() => toggleSkill(skill.id)}
            className={cn(
              'rounded-xl border px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all',
              active
                ? 'border-primary/40 bg-primary/15 text-primary'
                : 'border-border/70 bg-background/70 text-muted-foreground hover:border-primary/30 hover:text-primary'
            )}
          >
            {skill.name}
          </button>
        );
      })}
      {visibleSkills.length === 0 && (
        <span className="text-xs text-muted-foreground">No skills available yet.</span>
      )}
    </div>
  );
}
