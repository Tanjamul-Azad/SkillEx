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
import { Loader2, Copy, Check, Users } from 'lucide-react';

interface CircleBlurbModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CircleBlurbModal({ open, onOpenChange }: CircleBlurbModalProps) {
  const { toast } = useToast();
  const [circleName, setCircleName] = useState('');
  const [topic, setTopic] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const canGenerate = circleName.trim().length > 0 && topic.trim().length > 0;

  const handleGenerate = async () => {
    if (!canGenerate) {
      toast({
        title: 'Required',
        description: 'Please fill in the circle name and topic.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const result = await profileAssistantService.suggestCircleBlurbs(
        circleName.trim(),
        topic.trim()
      );
      setSuggestions(result.suggestions);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate blurbs. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (blurb: string, idx: number) => {
    navigator.clipboard.writeText(blurb);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
    toast({
      title: 'Copied',
      description: 'Blurb copied — paste it into your circle description.',
    });
  };

  const handleClose = (next: boolean) => {
    if (!next) {
      setSuggestions([]);
      setCopiedIdx(null);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Circle Blurb Writer
          </DialogTitle>
          <DialogDescription>
            Tell us your circle's name and what it's about — get 3 ready-to-paste descriptions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Circle name</label>
            <Input
              placeholder="e.g., React Wizards"
              value={circleName}
              onChange={(e) => setCircleName(e.target.value)}
              disabled={loading}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">What's it about?</label>
            <Textarea
              placeholder="e.g., Weekly meetups for learning modern React patterns, pair programming, and code reviews..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="min-h-20 resize-none"
              disabled={loading}
              maxLength={500}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleGenerate} disabled={loading || !canGenerate} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Writing...' : suggestions.length > 0 ? 'Write New Variations' : 'Write Blurbs'}
            </Button>
          </div>

          {suggestions.length > 0 && (
            <div className="space-y-3 pt-4 border-t">
              <p className="text-sm font-medium">Pick the one you like:</p>
              {suggestions.map((blurb, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-all"
                >
                  <p className="text-sm leading-relaxed mb-3">{blurb}</p>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => handleCopy(blurb, idx)}
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
