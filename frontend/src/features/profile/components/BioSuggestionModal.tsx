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
import { Loader2, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BioSuggestionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectBio: (bio: string) => void;
}

export default function BioSuggestionModal({
  open,
  onOpenChange,
  onSelectBio,
}: BioSuggestionModalProps) {
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleGenerate = async () => {
    if (!input.trim()) return;

    setLoading(true);
    try {
      const result = await profileAssistantService.suggestBios(input);
      setSuggestions(result.suggestions);
      setSelectedIdx(null);
    } catch (error) {
      toast({
        title: 'Could not draft suggestions',
        description: 'Try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (bio: string, idx: number) => {
    navigator.clipboard.writeText(bio);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleSelect = (bio: string) => {
    onSelectBio(bio);
    setSuggestions([]);
    setInput('');
    setSelectedIdx(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Write your bio</DialogTitle>
          <DialogDescription>
            Jot down a few honest lines about yourself — you'll get three polished drafts to
            choose from.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Input Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Your notes</label>
            <Textarea
              placeholder="e.g., Backend developer for 6 years, mostly Java. Love teaching beginners. Learning UI design on the side..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="min-h-20 resize-none rounded-xl"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Specifics work best — skills, years, what you enjoy teaching or learning.
            </p>
          </div>

          {/* Generate Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleGenerate}
              disabled={loading || !input.trim()}
              className="gap-2 rounded-xl"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading
                ? 'Drafting...'
                : suggestions.length > 0
                  ? 'Draft New Versions'
                  : 'Draft My Bio'}
            </Button>
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-3 border-t border-border/40 pt-4">
              <p className="text-sm font-medium text-foreground">Pick the one that sounds like you</p>
              {suggestions.map((bio, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'cursor-pointer rounded-xl border p-4 transition-colors',
                    selectedIdx === idx
                      ? 'border-primary bg-primary/5'
                      : 'border-border/40 hover:border-primary/40 hover:bg-muted/30'
                  )}
                  onClick={() => setSelectedIdx(idx)}
                >
                  <p className="mb-3 text-sm leading-relaxed text-foreground">{bio}</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2 rounded-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(bio, idx);
                      }}
                    >
                      {copiedIdx === idx ? (
                        <>
                          <Check className="h-4 w-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copy
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      className="ml-auto rounded-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(bio);
                      }}
                    >
                      Use This Bio
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
