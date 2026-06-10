import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { profileAssistantService } from '@/services/profileAssistantService';
import { Loader2, Copy, Check, Wand2 } from 'lucide-react';
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
    if (!input.trim()) {
      toast({
        title: 'Required',
        description: 'Please enter something about yourself.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const result = await profileAssistantService.suggestBios(input);
      setSuggestions(result.suggestions);
      setSelectedIdx(null);
      toast({
        title: 'Success',
        description: 'Generated 3 bio suggestions for you.',
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

  const handleCopy = (bio: string, idx: number) => {
    navigator.clipboard.writeText(bio);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
    toast({
      title: 'Copied',
      description: 'Bio copied to clipboard.',
    });
  };

  const handleSelect = (bio: string) => {
    onSelectBio(bio);
    setSuggestions([]);
    setInput('');
    setSelectedIdx(null);
    onOpenChange(false);
    toast({
      title: 'Applied',
      description: 'Bio has been applied to your profile.',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            AI Bio Assistant
          </DialogTitle>
          <DialogDescription>
            Describe yourself in a sentence or two, and let AI polish it into 3 professional variations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Input Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Tell us about yourself
            </label>
            <Textarea
              placeholder="e.g., I'm a software engineer passionate about web development and teaching others..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="min-h-20 resize-none"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Be honest and specific about your skills, interests, and what you enjoy teaching/learning.
            </p>
          </div>

          {/* Generate Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleGenerate}
              disabled={loading || !input.trim()}
              className="gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Generating...' : 'Generate Suggestions'}
            </Button>
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-3 pt-4 border-t">
              <p className="text-sm font-medium">
                Choose one or generate again:
              </p>
              {suggestions.map((bio, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'p-4 rounded-lg border-2 transition-all cursor-pointer',
                    selectedIdx === idx
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  )}
                  onClick={() => setSelectedIdx(idx)}
                >
                  <p className="text-sm leading-relaxed mb-3">{bio}</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
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
                      className="ml-auto"
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

              {/* Regenerate Option */}
              <Button
                variant="outline"
                className="w-full"
                onClick={handleGenerate}
                disabled={loading || !input.trim()}
              >
                {loading ? 'Generating...' : 'Generate Different Variations'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
