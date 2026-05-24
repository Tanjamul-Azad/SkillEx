import React, { useState } from 'react';
import { Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { moderationService, type ReportTargetType } from '@/services/moderationService';

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: ReportTargetType;
  targetId: string;
  targetUserId?: string;
}

const categories = ['Harassment', 'Spam', 'Fake skill or profile', 'Harmful content', 'Scam', 'Other'];

export function ReportDialog({ open, onOpenChange, targetType, targetId, targetUserId }: ReportDialogProps) {
  const { toast } = useToast();
  const [category, setCategory] = useState(categories[0]);
  const [reason, setReason] = useState('');
  const [evidence, setEvidence] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!reason.trim()) {
      toast({ title: 'Add a reason', description: 'Reports need a short explanation.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await moderationService.report({
        targetType,
        targetId,
        targetUserId,
        category,
        reason: reason.trim(),
        evidence: evidence.trim() || undefined,
      });
      toast({ title: 'Report submitted', description: 'An admin can now review this case.', variant: 'success' });
      setReason('');
      setEvidence('');
      onOpenChange(false);
    } catch (error) {
      toast({ title: 'Report failed', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-destructive" />
            Report {targetType.toLowerCase()}
          </DialogTitle>
          <DialogDescription>
            Reports go to the admin moderation queue with an AI-assisted summary. Final decisions are made by admins.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What happened?" className="min-h-24" />
          <Input value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="Optional evidence or context" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit report'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
