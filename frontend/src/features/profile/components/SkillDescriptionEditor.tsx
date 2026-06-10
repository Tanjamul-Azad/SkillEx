import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { profileAssistantService } from '@/services/profileAssistantService';
import { Loader2, Copy, Check, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SkillDescriptionEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skillName: string;
  skillLevel: string;
  currentDescription?: string;
  onSaveDescription: (description: string) => void;
}

export default function SkillDescriptionEditor({
  open,
  onOpenChange,
  skillName,
  skillLevel,
  currentDescription = '',
  onSaveDescription,
}: SkillDescriptionEditorProps) {
  const { toast } = useToast();
  const [description, setDescription] = useState(currentDescription);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleGenerateSuggestions = async () => {
    setLoading(true);
    try {
      const result = await profileAssistantService.suggestSkillDescriptions(
        skillName,
        skillLevel
      );
      setSuggestions(result.suggestions);
      toast({
        title: 'Success',
        description: 'Generated 3 skill descriptions for you.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate suggestions. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleUseSuggestion = (suggestion: string) => {
    setDescription(suggestion);
    setSuggestions([]);
  };

  const handleSave = () => {
    if (!description.trim()) {
      toast({
        title: 'Required',
        description: 'Please enter a description.',
        variant: 'destructive',
      });
      return;
    }

    onSaveDescription(description);
    setDescription(currentDescription);
    setSuggestions([]);
    onOpenChange(false);
    toast({
      title: 'Saved',
      description: 'Skill description has been updated.',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Edit Skill Description
          </DialogTitle>
          <DialogDescription>
            {skillName} • Level: {skillLevel}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Editor Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              placeholder="Write or paste a polished description of this skill..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-24 resize-none"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Describe what this skill covers, its practical applications, and what level of expertise you have.
            </p>
          </div>

          {/* AI Suggestions Button */}
          <div className="flex justify-between items-center">
            <div />
            <Button
              onClick={handleGenerateSuggestions}
              disabled={loading}
              variant="secondary"
              className="gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Generating...' : 'Get AI Suggestions'}
            </Button>
          </div>

          {/* AI Suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
              <p className="text-sm font-medium">AI-Generated Suggestions:</p>
              {suggestions.map((suggestion, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-md bg-background border border-border hover:border-primary/50 transition-all"
                >
                  <p className="text-sm mb-2">{suggestion}</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-2 h-8"
                      onClick={() => {
                        handleCopy(suggestion, idx);
                      }}
                    >
                      {copiedIdx === idx ? (
                        <>
                          <Check className="h-3 w-3" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          Copy
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      className="ml-auto h-8"
                      onClick={() => handleUseSuggestion(suggestion)}
                    >
                      Use This
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!description.trim()}>
              Save Description
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
